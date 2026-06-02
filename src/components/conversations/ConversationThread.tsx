import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Sparkles, Mail, Phone } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { Message } from "@/hooks/useConversations";
import { cn } from "@/lib/utils";

type ChannelKey = "email" | "sms";

interface ConversationThreadProps {
  messages: Message[];
  isLoading?: boolean;
  onSendMessage: (content: string, channel?: ChannelKey, subject?: string) => Promise<void>;
  emptyMessage?: string;
  emptySubMessage?: string;
  showAISuggest?: boolean;
  className?: string;
  maxHeight?: string;
  /** Channels the user can pick from. Defaults to none (caller controls). */
  availableChannels?: ChannelKey[];
  defaultChannel?: ChannelKey;
  /** Subject line for email (only shown when channel === 'email'). */
  showEmailSubject?: boolean;
  /** Helper hint shown above input (e.g. "→ jane@acme.com"). */
  recipientHint?: string;
  /** Disabled reason — when set, input is disabled with this message. */
  disabledReason?: string | null;
}

export const ConversationThread = ({
  messages,
  isLoading = false,
  onSendMessage,
  emptyMessage = "No messages yet",
  emptySubMessage = "Send a message to start the conversation",
  showAISuggest = false,
  className,
  maxHeight = "400px",
  availableChannels,
  defaultChannel,
  recipientHint,
  disabledReason,
  defaultEmailSubject,
}: ConversationThreadProps & { defaultEmailSubject?: string }) => {
  const [replyText, setReplyText] = useState("");
  const [subject, setSubject] = useState(defaultEmailSubject || "");
  const [sending, setSending] = useState(false);
  const [channel, setChannel] = useState<ChannelKey>(
    defaultChannel || availableChannels?.[0] || "sms",
  );

  // keep subject in sync when default changes (e.g. business name loads)
  if (defaultEmailSubject && !subject) {
    // initialize lazily
    setTimeout(() => setSubject(defaultEmailSubject), 0);
  }

  const handleSend = async () => {
    if (!replyText.trim() || sending || disabledReason) return;
    setSending(true);
    try {
      await onSendMessage(replyText, channel, channel === "email" ? (subject || defaultEmailSubject) : undefined);
      setReplyText("");
    } finally {
      setSending(false);
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "email": return <Mail className="h-3 w-3" />;
      case "voice": return <Phone className="h-3 w-3" />;
      default: return <MessageSquare className="h-3 w-3" />;
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Messages Area */}
      <ScrollArea className="flex-1" style={{ maxHeight }}>
        <div className="p-3 md:p-4 space-y-2.5">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{emptyMessage}</p>
              <p className="text-sm mt-1">{emptySubMessage}</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "rounded-md border px-3 py-2.5 max-w-[88%] shadow-sm",
                  msg.direction === "outbound"
                    ? "bg-primary/10 border-primary/20 ml-auto"
                    : "bg-muted/40 border-border mr-auto"
                )}
              >
                <div className="flex items-center gap-1.5 mb-1 text-muted-foreground">
                  {getChannelIcon(msg.channel)}
                  <span className="text-xs capitalize">{msg.channel}</span>
                  <span className="text-xs">•</span>
                  <span className="text-xs">
                    {format(new Date(msg.created_at), "MMM dd, h:mm a")}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap text-foreground">{msg.content}</p>
                {msg.ai_generated && (
                  <div className="flex items-center gap-1 mt-2 text-xs opacity-70">
                    <Sparkles className="h-3 w-3" />
                    <span>AI-generated</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t bg-background/80 p-3 space-y-2">
        {(availableChannels?.length ?? 0) > 1 && (
          <div className="flex items-center gap-1.5">
            {availableChannels!.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setChannel(c)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  channel === c
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground hover:bg-muted",
                )}
              >
                {c === "email" ? <Mail className="h-3 w-3" /> : <Phone className="h-3 w-3" />}
                {c === "email" ? "Email" : "SMS"}
              </button>
            ))}
            {recipientHint && (
              <span className="text-[11px] text-muted-foreground truncate ml-1">
                {recipientHint}
              </span>
            )}
          </div>
        )}
        {disabledReason && (
          <p className="text-[11px] text-destructive">{disabledReason}</p>
        )}
        {channel === "email" && (
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={defaultEmailSubject || "Subject"}
            disabled={!!disabledReason}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        )}
        <Textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder={
            channel === "email" ? "Write your email…" : "Type your message…"
          }
          rows={2}
          disabled={!!disabledReason}
          className="min-h-[68px] resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <div className="flex items-center gap-2">
          {showAISuggest && (
            <Button size="sm" variant="outline" disabled>
              <Sparkles className="h-4 w-4 mr-2" />
              AI Suggest
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!replyText.trim() || sending || !!disabledReason}
            className="ml-auto"
          >
            <Send className="h-4 w-4 mr-2" />
            {sending ? "Sending…" : `Send ${channel === "email" ? "email" : "SMS"}`}
          </Button>
        </div>
      </div>
    </div>
  );
};
