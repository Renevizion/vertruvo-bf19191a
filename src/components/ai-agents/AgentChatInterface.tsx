import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, Loader2, X, Sparkles, AlertCircle, ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MarkdownText } from "@/components/automations/MarkdownText";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  feedback?: "positive" | "negative";
}

interface AgentChatInterfaceProps {
  agent: {
    id: string;
    name: string;
    type: string;
    greeting?: string;
    instructions?: string;
    description?: string;
  };
  onClose: () => void;
}

export function AgentChatInterface({ agent, onClose }: AgentChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleFeedback = async (messageId: string, type: "positive" | "negative") => {
    setMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, feedback: type } : m
    ));
    try {
      await supabase.from('agent_memory').insert({
        agent_id: agent.id,
        memory_type: 'feedback',
        content: `User rated response as ${type}`,
        context: { messageId, feedbackType: type },
        importance_score: type === 'negative' ? 8 : 5,
      });
    } catch {
      // Silent fail — feedback is best-effort
    }
  };

  // Add greeting message on mount
  useEffect(() => {
    if (agent.greeting) {
      setMessages([{
        id: crypto.randomUUID(),
        role: "assistant",
        content: agent.greeting,
        timestamp: new Date()
      }]);
    }
  }, [agent.greeting]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-runtime`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          agent_id: agent.id,
          message: userMessage.content,
          conversation_history: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please try again in a moment.");
        }
        if (response.status === 402) {
          throw new Error("AI credits depleted. Please add credits to continue.");
        }
        throw new Error(errorData.error || "Failed to get response from agent");
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response || data.message || "I apologize, but I couldn't generate a response.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      toast.error("Agent Error", { description: error.message });
      // Add error message to chat
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Error: ${error.message}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">{agent.name}</h3>
            <p className="text-xs text-muted-foreground capitalize">{agent.type} Agent</p>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            <Sparkles className="h-3 w-3 mr-1" />
            Active
          </Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Agent Description */}
      {agent.description && (
        <div className="px-4 py-2 bg-blue-50 border-b text-xs text-blue-700 flex items-start gap-2">
          <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{agent.description}</span>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4" role="log" aria-live="polite" aria-relevant="additions" aria-label={`Conversation with ${agent.name}`}>
          {messages.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Start a conversation with {agent.name}</p>
              <p className="text-xs mt-1">Type a message below to begin</p>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className={message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}>
                  {message.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              <div className="max-w-[80%]">
                <div
                  className={`rounded-lg px-4 py-2 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {message.role === "assistant"
                    ? <div className="text-sm"><MarkdownText content={message.content} /></div>
                    : <p className="text-sm whitespace-pre-wrap">{message.content}</p>}
                  <p className={`text-[10px] mt-1 ${message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {message.role === "assistant" && !message.content.startsWith("Error:") && (
                  <div className="flex items-center gap-1 mt-1 ml-1">
                    <button
                      onClick={() => handleFeedback(message.id, "positive")}
                      className={`p-1 rounded-md transition-colors ${
                        message.feedback === "positive" 
                          ? "text-green-600 bg-green-100" 
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                      title="Helpful"
                    >
                      <ThumbsUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleFeedback(message.id, "negative")}
                      className={`p-1 rounded-md transition-colors ${
                        message.feedback === "negative" 
                          ? "text-red-600 bg-red-100" 
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                      title="Not helpful"
                    >
                      <ThumbsDown className="h-3 w-3" />
                    </button>
                    {message.feedback && (
                      <span className="text-[10px] text-muted-foreground ml-1">
                        {message.feedback === "positive" ? "Thanks!" : "We'll improve"}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-muted">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="rounded-lg px-4 py-3 bg-muted">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t bg-background">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Message ${agent.name}...`}
            disabled={isLoading}
            className="flex-1"
          />
          <Button onClick={sendMessage} disabled={!input.trim() || isLoading} size="icon">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          Powered by AI • Responses may not always be accurate
        </p>
      </div>
    </div>
  );
}
