import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare, HelpCircle, Megaphone, X, ArrowLeft,
  Sparkles, Search, Send, Bot, ChevronRight, Zap, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MarkdownText } from "@/components/automations/MarkdownText";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type WidgetTab = "home" | "messages" | "help" | "news";
type WidgetView = "tabs" | "ai-chat";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

async function streamChat({
  messages, onDelta, onDone, onError,
}: {
  messages: ChatMessage[];
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  // Use the active user session token — ai-chat verifies the JWT and rejects the
  // raw anon/publishable key with 401 "Unauthorized".
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    onError("Please log in to chat with Thermi AI.");
    return;
  }
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ messages }),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    onError(body.error || `Failed to reach AI (${resp.status})`);
    return;
  }
  if (!resp.body) { onError("No response stream"); return; }
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") break;
      try {
        const parsed = JSON.parse(jsonStr);
        const c = parsed.choices?.[0]?.delta?.content;
        if (c) onDelta(c);
      } catch { /* partial */ }
    }
  }
  onDone();
}

const TAB_ITEMS: { key: WidgetTab; icon: typeof Sparkles; label: string }[] = [
  { key: "home", icon: Sparkles, label: "Home" },
  { key: "messages", icon: MessageSquare, label: "Messages" },
  { key: "help", icon: HelpCircle, label: "Help" },
  { key: "news", icon: Megaphone, label: "Updates" },
];

function HomeTab({ onAskQuestion, onNavigate }: { onAskQuestion: () => void; onNavigate: (path: string) => void }) {
  return (
    <div className="p-4 space-y-3">
      <button
        onClick={onAskQuestion}
        className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors group text-left"
      >
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Ask Thermi AI</p>
          <p className="text-xs text-muted-foreground truncate">Get instant answers about your workspace</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
      </button>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          placeholder="Search help articles…"
          className="w-full pl-8 pr-3 h-9 text-sm rounded-lg bg-muted/50 border border-transparent focus:border-border outline-none placeholder:text-muted-foreground"
        />
      </div>
      <div className="space-y-0.5">
        {[
          { label: "Set up your AI agent", icon: Bot, path: "/ai-agents" },
          { label: "Import your leads", icon: Zap, path: "/leads?import=true" },
          { label: "Connect your phone number", icon: MessageSquare, path: "/settings?tab=phone-numbers" },
        ].map(({ label, icon: Icon, path }) => (
          <button
            key={label}
            onClick={() => onNavigate(path)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-accent/60 transition-colors text-left group"
          >
            <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-foreground">{label}</span>
            <ChevronRight className="h-3 w-3 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-muted/30 p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">New</Badge>
          <span className="text-xs font-medium">Inbound Call AI Agent</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Your AI agent can now answer inbound calls. Set it up in Settings → Phone.
        </p>
      </div>
    </div>
  );
}

function MessagesTab() {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-center px-4">
      <MessageSquare className="h-8 w-8 text-muted-foreground/40 mb-2" />
      <p className="text-sm font-medium text-foreground">No messages yet</p>
      <p className="text-xs text-muted-foreground mt-0.5">Team conversations will appear here</p>
    </div>
  );
}

function HelpTab({ onAskAI }: { onAskAI: () => void }) {
  const topics = [
    "Getting started with Thermi",
    "Managing leads & pipeline",
    "Setting up AI agents",
    "Voice & inbound calls",
    "Email campaigns",
    "Billing & plans",
  ];
  return (
    <div className="p-4 space-y-3">
      <button
        onClick={onAskAI}
        className="w-full flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors text-left"
      >
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Bot className="h-3.5 w-3.5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium">Chat with Thermi AI</p>
          <p className="text-xs text-muted-foreground">Instant answers, no wait</p>
        </div>
      </button>
      <div className="space-y-0.5">
        {topics.map((topic) => (
          <button
            key={topic}
            onClick={onAskAI}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-accent/60 transition-colors text-left group"
          >
            <span className="text-sm text-foreground">{topic}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>
    </div>
  );
}

function NewsTab() {
  const items = [
    {
      tag: "New",
      title: "Inbound Call AI Agent",
      body: "Your Twilio number can now route inbound calls directly to your AI agent. Configure it in Settings → Phone.",
    },
    {
      tag: "New",
      title: "Service Business Templates",
      body: "New agent templates for HVAC, landscaping, boat charters, breweries, and more — ready to deploy in one click.",
    },
    {
      tag: "Fix",
      title: "Template library cleaned up",
      body: "Test templates no longer appear in the public template library.",
    },
  ];
  return (
    <div className="p-4 space-y-2">
      {items.map(({ tag, title, body }) => (
        <div key={title} className="rounded-xl border border-border p-3">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mb-1.5">{tag}</Badge>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{body}</p>
        </div>
      ))}
    </div>
  );
}

function AIChatView({
  messages, input, loading, onInputChange, onSend, onBack,
}: {
  messages: ChatMessage[];
  input: string;
  loading: boolean;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onBack: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border flex-shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" />
        </Button>
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-none">Thermi AI</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Always available</p>
        </div>
      </div>
      <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
        <div className="p-3 space-y-3">
          {messages.length === 0 && (
            <div className="bg-muted rounded-2xl rounded-bl-sm px-3.5 py-2.5 max-w-[85%]">
              <p className="text-sm">Hi — I'm Thermi AI. Ask me anything about your workspace, leads, agents, or campaigns.</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
              {msg.role === "assistant" && (
                <Avatar className="w-6 h-6 flex-shrink-0 mt-0.5">
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                    <Sparkles className="h-2.5 w-2.5" />
                  </AvatarFallback>
                </Avatar>
              )}
              <div className={cn(
                "rounded-2xl px-3.5 py-2 max-w-[80%] text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted rounded-bl-sm"
              )}>
                {msg.role === "assistant" ? (
                  <MarkdownText content={msg.content} className="text-sm [&>p]:mb-1 [&>p:last-child]:mb-0" />
                ) : (
                  <p className="whitespace-pre-line">{msg.content}</p>
                )}
              </div>
            </div>
          ))}
          {loading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-2 justify-start">
              <Avatar className="w-6 h-6 flex-shrink-0 mt-0.5">
                <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                  <Sparkles className="h-2.5 w-2.5" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                <div className="flex gap-1 items-center h-4">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="p-3 border-t border-border flex-shrink-0">
        <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-1.5 border border-transparent focus-within:border-border transition-colors">
          <input
            ref={inputRef}
            value={input}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && onSend()}
            placeholder="Ask anything…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            disabled={loading}
          />
          <button
            onClick={onSend}
            disabled={!input.trim() || loading}
            className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors flex-shrink-0"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 text-primary-foreground animate-spin" /> : <Send className="h-3.5 w-3.5 text-primary-foreground" />}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AIChatDrawer() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<WidgetTab>("home");
  const [view, setView] = useState<WidgetView>("tabs");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const openAIChat = () => setView("ai-chat");
  const backToTabs = () => setView("tabs");
  const handleNavigate = (path: string) => { setOpen(false); navigate(path); };

  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setLoading(true);
    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };
    try {
      await streamChat({
        messages: allMessages,
        onDelta: upsertAssistant,
        onDone: () => setLoading(false),
        onError: (msg) => {
          toast.error(msg);
          setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
          setLoading(false);
        },
      });
    } catch {
      toast.error("Failed to connect to AI");
      setLoading(false);
    }
  }, [input, loading, messages]);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "fixed z-50 bottom-5 right-5 h-12 w-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-200",
          "bg-primary text-primary-foreground hover:scale-105 active:scale-95",
        )}
        aria-label="Toggle Thermi AI"
      >
        {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
      </button>
      {open && (
        <div className={cn(
          "fixed z-50 flex flex-col bg-background border border-border shadow-2xl overflow-hidden",
          "bottom-0 right-0 left-0 h-[80vh] rounded-t-2xl",
          "sm:bottom-20 sm:right-5 sm:left-auto sm:w-[360px] sm:h-[520px] sm:rounded-2xl"
        )}>
          {view === "ai-chat" ? (
            <AIChatView
              messages={messages}
              input={input}
              loading={loading}
              onInputChange={setInput}
              onSend={handleSend}
              onBack={backToTabs}
            />
          ) : (
            <>
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-sm font-semibold">Thermi</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <ScrollArea className="flex-1 min-h-0">
                {activeTab === "home" && <HomeTab onAskQuestion={openAIChat} onNavigate={handleNavigate} />}
                {activeTab === "messages" && <MessagesTab />}
                {activeTab === "help" && <HelpTab onAskAI={openAIChat} />}
                {activeTab === "news" && <NewsTab />}
              </ScrollArea>
              <div className="flex items-center border-t border-border flex-shrink-0 bg-background">
                {TAB_ITEMS.map(({ key, icon: Icon, label }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] transition-colors",
                      activeTab === key
                        ? "text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
