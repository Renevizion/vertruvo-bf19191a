import { cn } from "@/lib/utils";

interface ChatMessageProps {
  content: string;
  isUser: boolean;
  timestamp: Date;
}

export const ChatMessage = ({ content, isUser, timestamp }: ChatMessageProps) => {
  return (
    <div className={cn("flex w-full mb-4 animate-in fade-in slide-in-from-bottom-2", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[85%] rounded-2xl px-4 py-3 shadow-sm", isUser ? "bg-[hsl(var(--chat-user-bg))] text-[hsl(var(--chat-user-fg))]" : "bg-[hsl(var(--chat-ai-bg))] text-[hsl(var(--chat-ai-fg))]")}>
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{content}</p>
        <span className="text-xs opacity-60 mt-1 block">
          {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};
