import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Bot, Loader2, Check, X, Phone, MessageSquare, Workflow, Wand2 } from "lucide-react";

interface AgentCreatorAssistantProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
}

interface GeneratedAgent {
  name: string;
  type: "voice" | "conversation" | "workflow";
  description: string;
  greeting: string;
  instructions: string;
  voice?: string;
  suggestedIntegrations?: string[];
}

export const AgentCreatorAssistant = ({ open, onOpenChange, workspaceId }: AgentCreatorAssistantProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userRequest, setUserRequest] = useState("");
  const [generatedAgent, setGeneratedAgent] = useState<GeneratedAgent | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([]);

  // Fetch business settings for personalization
  const { data: businessSettings } = useQuery({
    queryKey: ['business-settings', workspaceId],
    enabled: !!workspaceId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_settings')
        .select('business_name, business_category, business_email, business_phone')
        .eq('workspace_id', workspaceId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch existing agents for context
  const { data: existingAgents } = useQuery({
    queryKey: ['ai-agents-context', workspaceId],
    enabled: !!workspaceId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_agents')
        .select('name, type, description, instructions')
        .eq('workspace_id', workspaceId)
        .limit(10);
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch available integrations for context
  const { data: availableIntegrations } = useQuery({
    queryKey: ['platform-integrations'],
    enabled: open,
    queryFn: async () => {
      // Return available integration types
      return [
        { id: 'kiruvo_ai', name: 'Thermi AI (recommended)', description: 'Default reasoning + chat — metered through your plan, no setup required' },
        { id: 'openai', name: 'OpenAI (via Thermi AI)', description: 'GPT models routed through the Thermi AI gateway' },
        { id: 'mistral', name: 'Mistral (via Thermi AI)', description: 'Open-source language models routed through the Thermi AI gateway' },
        { id: 'twilio', name: 'Twilio', description: 'Voice and SMS communication' },
        { id: 'serp', name: 'Serp API', description: 'Web search capabilities' },
        { id: 'google_maps', name: 'Google Maps', description: 'Location and mapping services' },
        { id: 'custom_endpoint', name: 'Custom API', description: 'Connect to any REST API' },
      ];
    }
  });

  const createAgentMutation = useMutation({
    mutationFn: async (agent: GeneratedAgent) => {
      const payload = {
        name: agent.name,
        type: agent.type,
        description: agent.description,
        greeting: agent.greeting,
        instructions: agent.instructions,
        voice: agent.voice || 'alloy',
        status: 'draft', // Create as draft until user approves
        workspace_id: workspaceId,
      };
      
      const { data, error } = await supabase
        .from('ai_agents')
        .insert(payload)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
      toast({ title: "Agent created successfully!", description: "You can now configure and activate it." });
      handleClose();
    },
    onError: (error) => {
      toast({ 
        title: "Error creating agent", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const generateAgent = async () => {
    if (!userRequest.trim()) {
      toast({ title: "Please describe what kind of agent you want", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setConversationHistory(prev => [...prev, { role: 'user', content: userRequest }]);

    try {
      // Build context about existing setup
      const existingAgentsContext = existingAgents?.length 
        ? `Existing agents in workspace: ${existingAgents.map(a => `${a.name} (${a.type})`).join(', ')}`
        : 'No existing agents in workspace';

      const integrationsContext = availableIntegrations
        ? `Available integrations: ${availableIntegrations.map(i => i.name).join(', ')}`
        : '';

      // Build business context for personalization
      const businessName = businessSettings?.business_name || 'the business';
      const businessCategory = businessSettings?.business_category || 'general';
      const businessContext = `
IMPORTANT - PERSONALIZE FOR THIS USER'S BUSINESS:
- Business Name: ${businessName}
- Business Category: ${businessCategory}
- Business Email: ${businessSettings?.business_email || 'not set'}
- Business Phone: ${businessSettings?.business_phone || 'not set'}

When generating agents, use "${businessName}" in greetings and instructions instead of generic names like "Thermi CRM Support". 
The agent should represent this specific business, not the platform.`;

      const systemPrompt = `You are an AI agent configuration assistant. Your job is to help users create AI agents by understanding their requirements and generating optimal configurations.

${businessContext}

Available agent types:
- voice: Phone-based AI agents using Twilio for calls (requires Twilio integration)
- conversation: Text-based chat agents for messaging and support
- workflow: General-purpose agents for automation and data processing

${existingAgentsContext}
${integrationsContext}

When generating an agent, consider:
1. The user's business context and goals - ALWAYS USE THEIR BUSINESS NAME
2. What integrations might be needed
3. Clear, specific instructions for the agent
4. Professional but friendly greeting messages that mention their business name
5. Appropriate voice selection for voice agents (alloy, echo, fable, onyx, nova, shimmer)

Respond with a JSON object containing:
{
  "name": "Agent Name",
  "type": "voice|conversation|workflow",
  "description": "Brief description of what this agent does",
  "greeting": "The greeting message the agent uses - MUST include ${businessName}",
  "instructions": "Detailed system instructions for the agent behavior",
  "voice": "alloy (only for voice agents)",
  "suggestedIntegrations": ["integration_ids"],
  "reasoning": "Brief explanation of why you configured it this way"
}`;

      const response = await supabase.functions.invoke('agent-creator-ai', {
        body: {
          prompt: userRequest,
          businessContext: {
            businessName,
            businessCategory,
            businessEmail: businessSettings?.business_email,
            businessPhone: businessSettings?.business_phone
          },
          context: {
            systemPrompt,
            existingAgents: existingAgentsContext,
            integrations: integrationsContext
          },
          availableIntegrations: availableIntegrations?.map(i => i.id) || []
        }
      });

      if (response.error) throw response.error;

      const result = response.data;
      
      // The edge function returns the agent config directly, not wrapped in {agent: ...}
      if (result && result.name) {
        setGeneratedAgent(result);
        setConversationHistory(prev => [...prev, { 
          role: 'assistant', 
          content: `Generated "${result.name}" - a ${result.type} agent. ${result.description || ''}` 
        }]);
      } else if (result?.error) {
        throw new Error(result.error);
      } else {
        throw new Error('Failed to generate agent configuration');
      }

    } catch (error: any) {
      console.error('Error generating agent:', error);
      toast({
        title: "Error generating agent",
        description: error.message || "Failed to process your request",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = () => {
    if (generatedAgent) {
      createAgentMutation.mutate(generatedAgent);
    }
  };

  const handleClose = () => {
    setUserRequest("");
    setGeneratedAgent(null);
    setConversationHistory([]);
    onOpenChange(false);
  };

  const getAgentTypeIcon = (type: string) => {
    switch (type) {
      case 'voice': return Phone;
      case 'conversation': return MessageSquare;
      case 'workflow': return Workflow;
      default: return Bot;
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-3 sm:p-4">
        <SheetHeader className="flex-shrink-0 pb-2">
          <SheetTitle className="flex items-center gap-2 text-foreground text-sm sm:text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Agent Creator
          </SheetTitle>
          <SheetDescription className="text-muted-foreground text-xs">
            Describe what kind of agent you need for {businessSettings?.business_name || 'your business'}.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto min-h-0" style={{ maxHeight: 'calc(85vh - 90px)' }}>
          <div className="space-y-3 pb-4 pr-2">
            {/* Conversation History */}
            {conversationHistory.length > 0 && (
              <div className="space-y-2">
                {conversationHistory.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`p-2 rounded-lg ${
                      msg.role === 'user' 
                        ? 'bg-primary text-primary-foreground ml-6' 
                        : 'bg-muted text-foreground mr-6 border border-border'
                    }`}
                  >
                    <p className="text-xs leading-relaxed">{msg.content}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Generated Agent Preview */}
            {generatedAgent && (
              <Card className="border border-primary/30 bg-card">
                <CardHeader className="p-3 pb-2 border-b border-border">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {(() => {
                        const IconComponent = getAgentTypeIcon(generatedAgent.type);
                        return <IconComponent className="h-4 w-4 text-primary flex-shrink-0" />;
                      })()}
                      <CardTitle className="text-sm text-foreground truncate">{generatedAgent.name}</CardTitle>
                    </div>
                    <Badge variant="secondary" className="capitalize flex-shrink-0 text-[10px] px-1.5 py-0">
                      {generatedAgent.type}
                    </Badge>
                  </div>
                  <CardDescription className="text-muted-foreground text-xs mt-1 line-clamp-2">{generatedAgent.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 p-3 pt-2">
                  <div>
                    <h4 className="text-xs font-semibold text-foreground mb-1">Greeting</h4>
                    <div className="text-xs text-foreground bg-muted/50 p-2 rounded border border-border line-clamp-2">
                      {generatedAgent.greeting}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-semibold text-foreground mb-1">Instructions</h4>
                    <div className="text-xs text-foreground bg-muted/50 p-2 rounded border border-border max-h-16 overflow-y-auto">
                      {generatedAgent.instructions}
                    </div>
                  </div>

                  {generatedAgent.suggestedIntegrations && generatedAgent.suggestedIntegrations.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-foreground mb-1">Integrations</h4>
                      <div className="flex flex-wrap gap-1">
                        {generatedAgent.suggestedIntegrations.map((integration) => (
                          <Badge key={integration} variant="outline" className="text-[10px] px-1.5 py-0">
                            {integration}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button 
                      onClick={handleApprove} 
                      className="flex-1 h-8 text-xs"
                      disabled={createAgentMutation.isPending}
                    >
                      {createAgentMutation.isPending ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3 mr-1" />
                      )}
                      Create
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setGeneratedAgent(null)}
                      className="h-8 text-xs px-3"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Modify
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Input Area */}
            {!generatedAgent && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Describe the agent you want to create...
e.g. 'A voice agent for customer support calls'"
                  value={userRequest}
                  onChange={(e) => setUserRequest(e.target.value)}
                  className="min-h-[60px] text-sm"
                  disabled={isGenerating}
                />
                
                <Button 
                  onClick={generateAgent} 
                  className="w-full h-8 text-xs"
                  disabled={isGenerating || !userRequest.trim()}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-3 w-3 mr-1" />
                      Generate Agent
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Quick Templates */}
            {!generatedAgent && conversationHistory.length === 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-medium text-muted-foreground">Quick Templates</h4>
                <div className="grid grid-cols-1 gap-1">
                  {[
                    { label: "Customer Support Voice", prompt: "Create a friendly voice agent that handles customer support calls, can answer FAQs, and escalates complex issues to human agents" },
                    { label: "Lead Qualification Bot", prompt: "Build a conversation agent that qualifies incoming leads by asking about their needs, budget, and timeline, then assigns a score" },
                    { label: "Appointment Scheduler", prompt: "I need a voice agent that can schedule appointments, check availability, and send confirmation messages" },
                  ].map((template, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      className="justify-start h-7 px-2 text-xs"
                      onClick={() => setUserRequest(template.prompt)}
                    >
                      <Bot className="h-3 w-3 mr-1.5 flex-shrink-0" />
                      <span className="text-left truncate">{template.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};