import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";
import { format } from "date-fns";
import { MessageCircle, User } from "lucide-react";

export const FeedbackManager = () => {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  const { data: feedbacks, isLoading } = useQuery({
    queryKey: ["admin-feedback"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback")
        .select(`
          *,
          workspaces (
            business_settings (
              business_name
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch user profiles for each feedback
      const userIds = [...new Set(data?.map(f => f.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .in('id', userIds);
      
      // Map profiles to feedbacks
      return data?.map(feedback => ({
        ...feedback,
        userProfile: profiles?.find(p => p.id === feedback.user_id)
      }));
    },
  });

  const updateFeedback = useMutation({
    mutationFn: async ({
      id,
      status,
      admin_notes,
    }: {
      id: string;
      status?: string;
      admin_notes?: string;
    }) => {
      const { error } = await supabase
        .from("feedback")
        .update({
          status,
          admin_notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-feedback"] });
      toast.success("Feedback updated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update feedback");
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-500";
      case "in_progress":
        return "bg-yellow-500";
      case "resolved":
        return "bg-green-500";
      case "dismissed":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "bug":
        return "bg-red-500/10 text-red-500";
      case "feature":
        return "bg-purple-500/10 text-purple-500";
      case "improvement":
        return "bg-blue-500/10 text-blue-500";
      case "question":
        return "bg-orange-500/10 text-orange-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading feedback...</div>;
  }

  if (!feedbacks || feedbacks.length === 0) {
    return (
      <Card className="p-8 text-center">
        <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No feedback submitted yet</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">User Feedback</h2>
        <Badge variant="outline">{feedbacks.length} total</Badge>
      </div>

      {feedbacks.map((feedback: any) => {
        const isExpanded = expandedId === feedback.id;
        const businessName =
          feedback.workspaces?.business_settings?.[0]?.business_name || "Unknown Business";
        const userName = feedback.userProfile 
          ? `${feedback.userProfile.first_name || ''} ${feedback.userProfile.last_name || ''}`.trim() || feedback.userProfile.email 
          : "Unknown User";

        return (
          <Card key={feedback.id} className="p-3">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                    <Badge className={`${getStatusColor(feedback.status)} text-[10px] px-1.5 py-0`}>
                      {feedback.status}
                    </Badge>
                    {feedback.category && (
                      <Badge variant="outline" className={`${getCategoryColor(feedback.category)} text-[10px] px-1.5 py-0`}>
                        {feedback.category}
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(feedback.created_at), "MMM d, h:mm a")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                    <User className="h-3 w-3" />
                    <span className="truncate">{userName}</span>
                    <span className="text-muted-foreground/50">•</span>
                    <span className="truncate">{businessName}</span>
                  </div>
                  <p className="text-sm text-foreground line-clamp-2">{feedback.message}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs flex-shrink-0"
                  onClick={() => setExpandedId(isExpanded ? null : feedback.id)}
                >
                  {isExpanded ? "Hide" : "Details"}
                </Button>
              </div>

              {isExpanded && (
                <div className="space-y-2 pt-2 border-t mt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium mb-1 block">Status</label>
                      <Select
                        value={feedback.status}
                        onValueChange={(value) =>
                          updateFeedback.mutate({ id: feedback.id, status: value })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="dismissed">Dismissed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Admin Notes</label>
                    <Textarea
                      placeholder="Add internal notes..."
                      value={adminNotes[feedback.id] ?? feedback.admin_notes ?? ""}
                      onChange={(e) =>
                        setAdminNotes({ ...adminNotes, [feedback.id]: e.target.value })
                      }
                      rows={2}
                      className="text-xs"
                    />
                    <Button
                      size="sm"
                      className="mt-1.5 h-7 text-xs"
                      onClick={() =>
                        updateFeedback.mutate({
                          id: feedback.id,
                          admin_notes: adminNotes[feedback.id] ?? feedback.admin_notes,
                        })
                      }
                    >
                      Save Notes
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
};
