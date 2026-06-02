import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Mail, Phone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Conversation } from "@/hooks/useConversations";
import { cn } from "@/lib/utils";

interface ConversationListProps {
  conversations: Conversation[];
  selectedId?: string | null;
  onSelect: (conversation: Conversation) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
  maxHeight?: string;
}

export const ConversationList = ({
  conversations,
  selectedId,
  onSelect,
  isLoading = false,
  emptyMessage = "No conversations yet",
  className,
  maxHeight = "calc(100vh - 360px)",
}: ConversationListProps) => {
  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "email": return <Mail className="h-4 w-4" />;
      case "voice": return <Phone className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "open":
        return "border-primary/30 bg-primary/10 text-primary";
      case "pending":
        return "border-secondary bg-secondary text-secondary-foreground";
      case "closed":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted";
    }
  };

  if (isLoading) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground text-sm", className)}>
        Loading conversations...
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className={cn("text-center py-12 text-muted-foreground", className)}>
        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ScrollArea style={{ maxHeight }} className={className}>
      <div className="space-y-2 p-1">
        {conversations.map((conv) => {
          const lastMessage = conv.messages[conv.messages.length - 1];
          
          return (
            <div
              key={conv.id}
              onClick={() => onSelect(conv)}
              className={cn(
                "rounded-md border p-3 cursor-pointer transition-colors hover:bg-muted/50",
                selectedId === conv.id && "border-primary bg-primary/5"
              )}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  {getChannelIcon(conv.channel)}
                  <span className="font-medium text-xs capitalize">{conv.channel}</span>
                </div>
                <Badge
                  variant="secondary"
                  className={cn("text-xs", getStatusColor(conv.status))}
                >
                  {conv.status || "open"}
                </Badge>
              </div>
              
              {lastMessage && (
                <p className="text-xs text-muted-foreground truncate mt-1">
                  {lastMessage.content}
                </p>
              )}
              
              {conv.last_message_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};
