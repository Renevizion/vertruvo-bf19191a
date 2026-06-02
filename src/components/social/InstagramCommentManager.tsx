import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  RefreshCw,
  MessageSquare,
  Reply,
  EyeOff,
  Eye,
  Trash2,
  AlertCircle,
  Heart,
  Image as ImageIcon,
  UserPlus,
} from "lucide-react";
import { useCreateLeadFromSocial } from "@/hooks/useCreateLeadFromSocial";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Comment {
  id: string;
  text: string;
  username?: string;
  from?: { id: string; username: string };
  timestamp: string;
  replies?: { data: Comment[] };
}

interface MediaItem {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  timestamp: string;
  permalink: string;
  comments_count?: number;
  comments: Comment[];
}

export function InstagramCommentManager() {
  const queryClient = useQueryClient();
  const createLead = useCreateLeadFromSocial();
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [replyText, setReplyText] = useState("");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["instagram-comments"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("instagram-comments");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
  });

  const replyMutation = useMutation({
    mutationFn: async ({ commentId, message }: { commentId: string; message: string }) => {
      const { data, error } = await supabase.functions.invoke("instagram-comments", {
        body: { action: "reply", commentId, message },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Reply posted!");
      setReplyingTo(null);
      setReplyText("");
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to reply");
    },
  });

  const hideMutation = useMutation({
    mutationFn: async ({ commentId, hide }: { commentId: string; hide: boolean }) => {
      const { data, error } = await supabase.functions.invoke("instagram-comments", {
        body: { action: "hide", commentId, hide },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.hide ? "Comment hidden" : "Comment unhidden");
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update comment");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { data, error } = await supabase.functions.invoke("instagram-comments", {
        body: { action: "delete", commentId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Comment deleted");
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete comment");
    },
  });

  const mediaItems: MediaItem[] = data?.media || [];

  // Extract error message from various error formats
  const getErrorMessage = (err: unknown): string => {
    try {
      if (!err) return "Unknown error";
      const errAny = err as any;
      
      // Handle FunctionsHttpError from Supabase
      if (errAny?.context?.body) {
        try {
          const body = typeof errAny.context.body === 'string' 
            ? JSON.parse(errAny.context.body) 
            : errAny.context.body;
          if (body?.error) return body.error;
        } catch {}
      }
      
      let message = errAny?.message || errAny?.error || String(err);
      
      // Try to extract JSON error message from wrapped response
      const jsonMatch = message.match(/\{"error":"([^"]+)"\}/);
      if (jsonMatch) {
        return jsonMatch[1];
      }
      return message;
    } catch {
      return "An error occurred loading comments";
    }
  };

  if (error) {
    const errorMessage = getErrorMessage(error);
    const isTokenError = errorMessage.toLowerCase().includes('token') || 
                         errorMessage.toLowerCase().includes('expired') ||
                         errorMessage.toLowerCase().includes('reconnect');
    
    return (
      <Card className="p-8">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
          <h3 className="font-semibold text-lg">
            {isTokenError ? 'Instagram Connection Expired' : 'Failed to Load Comments'}
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            {isTokenError 
               ? 'Your Instagram connection has expired. Please reconnect your Instagram account in the Accounts tab.'
              : errorMessage || 'Make sure Instagram is connected.'}
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {mediaItems.length} recent posts
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      ) : mediaItems.length === 0 ? (
        <Card className="p-12 text-center">
          <ImageIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Posts Found</h3>
          <p className="text-muted-foreground">
            Your Instagram posts will appear here once you have content.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mediaItems.map((media) => (
            <Card
              key={media.id}
              className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
              onClick={() => setSelectedMedia(media)}
            >
              <div className="aspect-square bg-muted relative">
                {media.media_url || media.thumbnail_url ? (
                  <img
                    src={media.thumbnail_url || media.media_url}
                    alt={media.caption || "Post"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                <Badge className="absolute bottom-2 right-2">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  {media.comments?.length || 0}
                </Badge>
              </div>
              <div className="p-3">
                <p className="text-sm line-clamp-2 text-muted-foreground">
                  {media.caption || "No caption"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(media.timestamp), "MMM d, yyyy")}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Comments Dialog */}
      <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Comments</DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            {selectedMedia?.comments?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No comments on this post</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedMedia?.comments?.map((comment) => (
                  <div key={comment.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {(comment.from?.username || comment.username || "?")[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            @{comment.from?.username || comment.username}
                          </p>
                          <p className="text-sm mt-1">{comment.text}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(comment.timestamp), "MMM d, h:mm a")}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Create Lead"
                          onClick={() => {
                            const username = comment.from?.username || comment.username || "Instagram User";
                            createLead.mutate({
                              name: username,
                              source: "Instagram Comment",
                              attribution_source: "instagram_comment",
                              attribution_id: selectedMedia?.id,
                              notes: `Comment: "${comment.text.slice(0, 200)}" on post: ${selectedMedia?.permalink || ''}`,
                            });
                          }}
                          disabled={createLead.isPending}
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setReplyingTo(comment)}
                        >
                          <Reply className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            hideMutation.mutate({ commentId: comment.id, hide: true })
                          }
                        >
                          <EyeOff className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => deleteMutation.mutate(comment.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Replies */}
                    {comment.replies?.data && comment.replies.data.length > 0 && (
                      <div className="ml-11 mt-3 space-y-3 border-l-2 pl-4">
                        {comment.replies.data.map((reply) => (
                          <div key={reply.id} className="text-sm">
                            <p className="font-medium">
                              @{reply.from?.username || reply.username}
                            </p>
                            <p className="text-muted-foreground">{reply.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={!!replyingTo} onOpenChange={() => setReplyingTo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to @{replyingTo?.from?.username || replyingTo?.username}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">"{replyingTo?.text}"</p>
            <Input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write your reply..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyingTo(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                replyingTo && replyMutation.mutate({ commentId: replyingTo.id, message: replyText })
              }
              disabled={!replyText.trim() || replyMutation.isPending}
            >
              Reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
