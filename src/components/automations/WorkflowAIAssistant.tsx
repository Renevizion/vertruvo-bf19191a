import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Send, Loader2, X, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MarkdownText } from "./MarkdownText";

interface Message {
  role: "user" | "assistant";
  content: string;
  workflowSuggestion?: any;
}

interface WorkflowAIAssistantProps {
  onApplyWorkflow?: (workflow: any) => void;
  currentWorkflow?: any;
  onExplainElement?: (element: string) => void;
  onValidateWorkflow?: (workflow: any) => Promise<void>;
  contextualHelp?: {
    nodeType: string;
    nodeLabel: string;
    nodeId: string;
  } | null;
  onCloseContextualHelp?: () => void;
}

export function WorkflowAIAssistant({ 
  onApplyWorkflow, 
  currentWorkflow, 
  onExplainElement,
  onValidateWorkflow,
  contextualHelp,
  onCloseContextualHelp 
}: WorkflowAIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm your workflow assistant. I can help you create automations, suggest workflows based on your goals, and explain how different triggers and actions work in your CRM. What would you like to automate?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [workspaceContext, setWorkspaceContext] = useState<any>(null);
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch workspace context on mount
  useEffect(() => {
    const fetchWorkspaceContext = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get workspace
        const { data: workspace } = await supabase
          .from("workspaces")
          .select("*")
          .eq("owner_id", user.id)
          .limit(1)
          .single();

        if (!workspace) return;

        // Get profile/business type
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_business_type, business_name")
          .eq("id", user.id)
          .single();

        // Get forms
        const { data: forms } = await supabase
          .from("forms")
          .select("id, name, is_active")
          .eq("workspace_id", workspace.id)
          .eq("is_active", true);

        // Get pipelines with stages
        const { data: pipelines } = await supabase
          .from("pipelines")
          .select("id, name, pipeline_stages(id, name, position)")
          .eq("workspace_id", workspace.id);

        // Get lead stats
        const { data: leads, count: leadCount } = await supabase
          .from("leads")
          .select("source, score", { count: 'exact' })
          .eq("workspace_id", workspace.id);

        // Get contact count
        const { count: contactCount } = await supabase
          .from("contacts")
          .select("*", { count: 'exact', head: true })
          .eq("workspace_id", workspace.id);

        // Get integrations configured
        const { data: googleSheets } = await supabase
          .from("google_sheet_integrations")
          .select("is_active")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .limit(1)
          .single();

        setWorkspaceContext({
          businessType: profile?.onboarding_business_type || "unknown",
          businessName: profile?.business_name || workspace.name,
          forms: forms || [],
          pipelines: pipelines || [],
          leadCount: leadCount || 0,
          contactCount: contactCount || 0,
          leadSources: [...new Set(leads?.map(l => l.source).filter(Boolean))],
          avgLeadScore: leads?.length 
            ? Math.round(leads.reduce((acc, l) => acc + (l.score || 0), 0) / leads.length)
            : 0,
          integrations: {
            googleSheets: !!googleSheets,
            email: false, // Could check email settings
            sms: false // Could check Twilio settings
          }
        });
      } catch (error) {
        console.error("Failed to fetch workspace context:", error);
      }
    };

    fetchWorkspaceContext();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle contextual help
  useEffect(() => {
    if (contextualHelp) {
      setIsOpen(true);
      const helpMessage = `Tell me about the "${contextualHelp.nodeLabel}" ${contextualHelp.nodeType} node. What does it do and how should I configure it?`;
      setInput(helpMessage);
      sendMessage(helpMessage);
    }
  }, [contextualHelp]);

  const sendMessage = async (customMessage?: string) => {
    const messageText = customMessage || input.trim();
    if (!messageText || isLoading) return;

    if (!customMessage) setInput("");
    setMessages(prev => [...prev, { role: "user", content: messageText }]);
    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/workflow-ai-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            message: messageText,
            conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
            currentWorkflow: currentWorkflow,
            contextualHelp: contextualHelp,
            workspaceContext: workspaceContext
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please wait a moment and try again.");
        }
        if (response.status === 402) {
          throw new Error("AI credits depleted. Please add credits to continue.");
        }
        if (response.status === 401) {
          throw new Error("Please sign in to use the AI assistant.");
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response
      };

      if (data.workflowSuggestion) {
        assistantMessage.workflowSuggestion = data.workflowSuggestion;
      }

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error calling AI assistant:', error);
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applyWorkflow = (workflow: any) => {
    if (onApplyWorkflow) {
      onApplyWorkflow(workflow);
      toast({
        title: "Workflow Applied",
        description: "The AI-generated workflow has been added to your canvas (inactive).",
      });
    }
  };

  const validateWorkflow = async () => {
    if (!currentWorkflow) {
      toast({
        title: "No workflow selected",
        description: "Please select a workflow to validate",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const validationMessage = `Please validate this workflow and check for: 1) Missing configurations, 2) Potential issues, 3) Best practice recommendations. Provide specific actionable feedback.`;
    
    setMessages(prev => [...prev, { role: "user", content: validationMessage }]);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/workflow-ai-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            message: validationMessage,
            conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
            currentWorkflow: currentWorkflow,
            validateMode: true,
            workspaceContext: workspaceContext
          }),
        }
      );

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.response
      }]);

      if (onValidateWorkflow) {
        await onValidateWorkflow(currentWorkflow);
      }
    } catch (error) {
      console.error('Validation error:', error);
      toast({
        title: "Validation Error",
        description: "Failed to validate workflow",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-24 h-14 w-14 rounded-full shadow-lg z-50 hover:scale-110 transition-transform"
        size="icon"
      >
        <Bot className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-24 w-96 h-[600px] shadow-2xl flex flex-col z-50">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">
            {contextualHelp ? "Contextual Help" : "Workflow Assistant"}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {currentWorkflow && !contextualHelp && (
            <Button
              variant="outline"
              size="sm"
              onClick={validateWorkflow}
              disabled={isLoading}
            >
              <Sparkles className="h-4 w-4 mr-1" />
              Validate
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setIsOpen(false);
              if (contextualHelp && onCloseContextualHelp) {
                onCloseContextualHelp();
              }
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className="space-y-2">
              <div
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {msg.role === "user" ? (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <MarkdownText content={msg.content} className="text-sm" />
                  )}
                </div>
              </div>
              {msg.workflowSuggestion && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] border rounded-lg p-3 bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium">Generated Workflow</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {msg.workflowSuggestion.name}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => applyWorkflow(msg.workflowSuggestion)}
                      className="w-full"
                    >
                      Apply to Canvas
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-3">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Ask about workflows..."
            className="min-h-[60px] resize-none"
            disabled={isLoading}
          />
          <Button
            onClick={() => sendMessage()}
            disabled={isLoading || !input.trim()}
            size="icon"
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
