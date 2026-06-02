import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Check, Pencil, X, Clock, AlertCircle, Bell, Settings2, ImageOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface Suggestion {
  id: string;
  platform: string;
  caption: string;
  images: string[];
  reason: string;
  status: string;
  suggested_for: string;
  created_at: string;
  token_expires_at: string | null;
}

interface Props {
  onEdit: (s: Suggestion) => void;
  onOpenSettings: () => void;
}

const REASON_LABELS: Record<string, { label: string; tone: string }> = {
  cadence_gap: { label: "Time to post", tone: "bg-primary/10 text-primary" },
  silence: { label: "You haven't posted", tone: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  upcoming: { label: "Upcoming post", tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  manual: { label: "Suggestion", tone: "bg-muted text-foreground" },
};

export function SocialCoachPanel({ onEdit, onOpenSettings }: Props) {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ["social-suggestions"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("social_post_suggestions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []) as Suggestion[];
    },
    refetchInterval: 30000,
  });

  const act = async (s: Suggestion, action: "approve" | "edit" | "dismiss") => {
    setBusyId(s.id);
    try {
      if (action === "edit") {
        onEdit(s);
        await supabase.functions.invoke("social-suggestion-action", { body: { suggestionId: s.id, action: "edit" } });
        toast.success("Loaded into composer");
      } else {
        const { error } = await supabase.functions.invoke("social-suggestion-action", { body: { suggestionId: s.id, action } });
        if (error) throw error;
        toast.success(action === "approve" ? "Posting now…" : "Dismissed");
      }
      qc.invalidateQueries({ queryKey: ["social-suggestions"] });
      qc.invalidateQueries({ queryKey: ["coach-pending-count"] });
    } catch (e: any) {
      toast.error(e.message || "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  const triggerCoach = async () => {
    setBusyId("__tick__");
    try {
      const { error } = await supabase.functions.invoke("social-coach-tick", { body: {} });
      if (error) throw error;
      toast.success("Coach is checking…");
      setTimeout(() => qc.invalidateQueries({ queryKey: ["social-suggestions"] }), 1500);
    } catch (e: any) {
      toast.error(e.message || "Couldn't reach the coach");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card className="overflow-hidden border-primary/15">
      <div className="p-4 border-b bg-gradient-to-br from-primary/8 to-background flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-semibold text-sm">Posting Coach</h3>
            <Badge variant="outline" className="text-[10px] h-5">AI</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Approve a draft or edit it first — nudges arrive in-app, by email and SMS.</p>
        </div>
        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={onOpenSettings} title="Coach settings">
          <Settings2 className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="max-h-[560px]">
        <div className="p-3 space-y-3">
          {isLoading ? (
            <>
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-8 px-4">
              <div className="h-12 w-12 rounded-full bg-muted mx-auto flex items-center justify-center mb-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium mb-1">All caught up</p>
              <p className="text-xs text-muted-foreground mb-3">
                Coach checks every 30 minutes. You'll see suggestions here when it's time to post.
              </p>
              <Button size="sm" variant="outline" onClick={triggerCoach} disabled={busyId === "__tick__"}>
                {busyId === "__tick__" ? "Checking…" : "Run coach now"}
              </Button>
            </div>
          ) : (
            suggestions.map((s) => {
              const meta = REASON_LABELS[s.reason] || REASON_LABELS.manual;
              const img = s.images?.[0];
              const expires = s.token_expires_at ? new Date(s.token_expires_at) : null;
              return (
                <div key={s.id} className="rounded-lg border bg-card overflow-hidden">
                  <div className="flex gap-3 p-3">
                    <div className="w-20 h-20 rounded-md bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                      {img ? (
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <ImageOff className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${meta.tone}`}>{meta.label}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{s.platform}</span>
                      </div>
                      <p className="text-xs text-foreground line-clamp-3 leading-snug">{s.caption}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                        {expires && expires < new Date(Date.now() + 12 * 3600 * 1000) && (
                          <span className="text-orange-600 dark:text-orange-400 ml-1 inline-flex items-center gap-0.5">
                            <AlertCircle className="h-2.5 w-2.5" />
                            expires {formatDistanceToNow(expires, { addSuffix: true })}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 p-2 pt-0">
                    <Button size="sm" className="flex-1 h-8" onClick={() => act(s, "approve")} disabled={busyId === s.id}>
                      <Check className="h-3.5 w-3.5 mr-1" /> Approve & Post
                    </Button>
                    <Button size="sm" variant="outline" className="h-8" onClick={() => act(s, "edit")} disabled={busyId === s.id}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => act(s, "dismiss")} disabled={busyId === s.id} title="Dismiss">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}
