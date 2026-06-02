import { useState, useEffect, useRef } from "react";
import { ChatMessage } from "@/components/ChatMessage";
import { TypingIndicator } from "@/components/TypingIndicator";
import { ModelLoadingProgress } from "@/components/ModelLoadingProgress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { initializeModel, generateResponse, isModelReady } from "@/lib/llm";
import { useToast } from "@/hooks/use-toast";
import { Send } from "lucide-react";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

const STORAGE_KEY = "offline-chat-history";

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [modelProgress, setModelProgress] = useState(0);
  const [modelStatus, setModelStatus] = useState("Initializing...");
  const [isModelLoading, setIsModelLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Load chat history from localStorage
    const savedMessages = localStorage.getItem(STORAGE_KEY);
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
      } catch (e) {
        console.error("Failed to load chat history:", e);
      }
    }

    // Initialize the model
    initializeModel((progress, status) => {
      setModelProgress(progress);
      setModelStatus(status);
    })
      .then(() => {
        setIsModelLoading(false);
        toast({
          title: "Model Ready",
          description: "You can now chat offline with AI!",
        });
      })
      .catch((error) => {
        console.error("Model initialization failed:", error);
        toast({
          title: "Model Loading Failed",
          description: "Please refresh the page to try again.",
          variant: "destructive",
        });
      });
  }, [toast]);

  useEffect(() => {
    // Save messages to localStorage whenever they change
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    // Auto-scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !isModelReady()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setIsTyping(true);

    try {
      const conversationHistory: Array<{ role: "user" | "assistant" | "system"; content: string }> = messages.map((m) => ({
        role: m.isUser ? ("user" as const) : ("assistant" as const),
        content: m.content,
      }));

      conversationHistory.push({
        role: "user" as const,
        content: userMessage.content,
      });

      let aiResponse = "";
      let lastUpdateTime = Date.now();

      await generateResponse(conversationHistory, (partialResponse) => {
        aiResponse = partialResponse;
        const now = Date.now();
        // Update UI every 100ms to avoid too frequent re-renders
        if (now - lastUpdateTime > 100) {
          setMessages((prev) => {
            const filtered = prev.filter((m) => m.id !== "streaming");
            return [
              ...filtered,
              {
                id: "streaming",
                content: aiResponse,
                isUser: false,
                timestamp: new Date(),
              },
            ];
          });
          lastUpdateTime = now;
        }
      });

      setIsTyping(false);
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== "streaming");
        return [
          ...filtered,
          {
            id: Date.now().toString(),
            content: aiResponse,
            isUser: false,
            timestamp: new Date(),
          },
        ];
      });
    } catch (error) {
      console.error("Error generating response:", error);
      setIsTyping(false);
      toast({
        title: "Error",
        description: "Failed to generate response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isModelLoading) {
    return <ModelLoadingProgress progress={modelProgress} status={modelStatus} />;
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Offline AI Chat</h1>
            <p className="text-xs text-muted-foreground">Private • On-device</p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-center">
            <div className="space-y-2 max-w-sm">
              <h2 className="text-xl font-semibold text-foreground">Welcome!</h2>
              <p className="text-sm text-muted-foreground">
                Start a private conversation with your offline AI assistant. All processing happens on your device.
              </p>
            </div>
          </div>
        )}
        
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            content={message.content}
            isUser={message.isUser}
            timestamp={message.timestamp}
          />
        ))}
        
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card px-4 py-3 shadow-lg">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type a message..."
            className="resize-none min-h-[44px] max-h-32 bg-background"
            rows={1}
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-11 w-11 shrink-0"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
