import { useState } from "react";
import { Link } from 'react-router-dom';

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Send, RefreshCw, MessageCircle, AlertCircle, UserPlus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useCreateLeadFromSocial } from "@/hooks/useCreateLeadFromSocial";

interface Message {
  id: string;
  message: string;
  from: { id: string; username?: string; name?: string };
  created_time: string;
}

interface Conversation {
  id: string;
  participants: { data: Array<{ id: string; username?: string; name?: string }> };
  updated_time: string;
  messages: Message[];
}

export function InstagramDMInbox() {
  const queryClient = useQueryClient();
  const createLead = useCreateLeadFromSocial();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [replyMessage, setReplyMessage] = useState("");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["instagram-messages"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("instagram-messages");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    refetchInterval: false, // Disable auto-polling to prevent repeated errors
    retry: 1, // Only retry once
  });

  // Check if DM feature is unavailable for this account
  const featureUnavailable = data?.featureUnavailable === true;

  const sendMutation = useMutation({
    mutationFn: async ({ recipientId, message }: { recipientId: string; message: string }) => {
      const { data, error } = await supabase.functions.invoke("instagram-messages", {
        body: { action: "send", recipientId, message },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Message sent!");
      setReplyMessage("");
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to send message");
    },
  });

  const handleSendReply = () => {
    if (!selectedConversation || !replyMessage.trim()) return;
    
    const participant = selectedConversation.participants?.data?.find(
      (p) => p.id !== data?.account?.id
    );
    
    if (participant) {
      sendMutation.mutate({ recipientId: participant.id, message: replyMessage });
    }
  };

  const conversations: Conversation[] = data?.conversations || [];

  // Show feature unavailable message (not an error, just informational)
  if (featureUnavailable) {
    return (
      <Card className="p-8">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <MessageCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Instagram DM Access Not Available</h3>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              The Instagram Messaging API requires your account to be a <strong>Business or Creator account</strong> connected 
              to a <strong>Facebook Page</strong> with messaging enabled.
            </p>
          </div>
          <div className="pt-4 border-t text-sm text-muted-foreground">
            <p>To enable DM access:</p>
            <ol className="list-decimal list-inside mt-2 text-left max-w-sm mx-auto space-y-1">
              <li>Convert your Instagram to a Business or Creator account</li>
              <li>Connect it to a Facebook Page</li>
              <li>Enable messaging on the Facebook Page</li>
              <li>Reconnect your Instagram account here</li>
            </ol>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    const errorMessage = (error as Error).message || "";
    const isPermissionError = errorMessage.includes("additional permissions") || 
                              errorMessage.includes("not available");
    const isTokenError = errorMessage.includes("expired") || 
                         errorMessage.includes("invalid") ||
                         errorMessage.includes("reconnect");
    
    return (
      <Alert variant={isPermissionError ? "default" : "destructive"}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="space-y-2">
          {isPermissionError ? (
            <>
              <p className="font-medium">Instagram DM Access Not Available</p>
              <p className="text-sm text-muted-foreground">
                The Instagram Messaging API requires your account to be a Business or Creator account 
                connected to a Facebook Page with messaging enabled. This feature may not be available 
                for all account types.
              </p>
            </>
          ) : isTokenError ? (
            <>
              <p>{errorMessage}</p>
              <p className="text-sm">
                <strong>Solution:</strong> Please reconnect your Instagram account in{" "}
                <Link to="/social-media" className="underline">Social Media settings</Link> to grant messaging permissions.
              </p>
            </>
          ) : (
            <p>{errorMessage || "Failed to load messages. Please try again later."}</p>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
            <RefreshCw className="h-3 w-3 mr-2" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid md:grid-cols-3 gap-4 h-[calc(100vh-280px)]">
      {/* Conversations List */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Conversations</h3>
          <Button variant="ghost" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="h-[calc(100%-60px)]">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No conversations yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conv) => {
                const participant = conv.participants?.data?.[0];
                const lastMessage = conv.messages?.[0];
                
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={cn(
                      "w-full p-3 rounded-lg text-left transition-colors",
                      selectedConversation?.id === conv.id
                        ? "bg-primary/10"
                        : "hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {(participant?.username || participant?.name || "?")[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="overflow-hidden flex-1">
                        <p className="font-medium truncate">
                          {participant?.username || participant?.name || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {lastMessage?.message || "No messages"}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Messages Thread */}
      <Card className="md:col-span-2 p-4 flex flex-col">
        {selectedConversation ? (
          <>
            <div className="border-b pb-3 mb-4 flex items-center justify-between">
              <h3 className="font-semibold">
                {selectedConversation.participants?.data?.[0]?.username || "Conversation"}
              </h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const participant = selectedConversation.participants?.data?.find(
                    (p) => p.id !== data?.account?.id
                  );
                  const username = participant?.username || participant?.name || "Instagram User";
                  createLead.mutate({
                    name: username,
                    source: "Instagram DM",
                    attribution_source: "instagram_dm",
                    attribution_id: selectedConversation.id,
                    notes: `Created from Instagram DM conversation with @${username}`,
                  });
                }}
                disabled={createLead.isPending}
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Create Lead
              </Button>
            </div>

            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {[...selectedConversation.messages].reverse().map((msg) => {
                  const isMe = msg.from?.id === data?.account?.id;
                  
                  return (
                    <div
                      key={msg.id}
                      className={cn("flex", isMe ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[70%] rounded-lg px-4 py-2",
                          isMe
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        <p className="text-sm">{msg.message}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {format(new Date(msg.created_time), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="flex gap-2 mt-4 pt-4 border-t">
              <Input
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Type a message..."
                onKeyDown={(e) => e.key === "Enter" && handleSendReply()}
              />
              <Button
                onClick={handleSendReply}
                disabled={!replyMessage.trim() || sendMutation.isPending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p>Select a conversation to view messages</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
