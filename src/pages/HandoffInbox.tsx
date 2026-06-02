import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Phone, MessageSquare, ArrowRightLeft, CheckCircle2, RotateCcw, Loader2, Bot } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const useCurrentWorkspaceId = () => {
  const { data } = useQuery({
    queryKey: ["current-workspace-id"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) return null;
      const { data: ws } = await supabase
        .from("workspaces")
        .select("id")
        .eq("owner_id", u.user.id)
        .maybeSingle();
      return ws?.id ?? null;
    },
  });
  return data ?? null;
};
import { toast } from "sonner";

type Handoff = {
  id: string;
  workspace_id: string;
  agent_id: string | null;
  contact_id: string | null;
  lead_id: string | null;
  call_log_id: string | null;
  conversation_id: string | null;
  channel: string;
  reason: string;
  priority: "low" | "normal" | "high" | "urgent";
  status: "pending" | "acknowledged" | "resolved" | "returned_to_ai";
  recap: string[];
  context: Record<string, unknown>;
  created_at: string;
};

const priorityTone: Record<string, string> = {
  urgent: "bg-destructive text-destructive-foreground",
  high: "bg-amber-500 text-white",
  normal: "bg-secondary text-secondary-foreground",
  low: "bg-muted text-muted-foreground",
};

const HandoffInbox = () => {
  const workspaceId = useCurrentWorkspaceId();
  const qc = useQueryClient();
  const [acting, setActing] = useState<string | null>(null);

  const { data: handoffs = [], isLoading } = useQuery({
    queryKey: ["agent-handoffs", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await (supabase as any)
        .from("agent_handoffs")
        .select("*")
        .eq("workspace_id", workspaceId)
        .in("status", ["pending", "acknowledged"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Handoff[];
    },
    enabled: !!workspaceId,
  });

  useEffect(() => {
    if (!workspaceId) return;
    const ch = supabase
      .channel(`handoffs:${workspaceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agent_handoffs", filter: `workspace_id=eq.${workspaceId}` },
        () => qc.invalidateQueries({ queryKey: ["agent-handoffs", workspaceId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [workspaceId, qc]);

  const updateStatus = async (id: string, status: Handoff["status"]) => {
    setActing(id);
    try {
      const patch: Record<string, unknown> = { status };
      if (status === "acknowledged") {
        const { data: u } = await supabase.auth.getUser();
        patch.acknowledged_by = u?.user?.id;
        patch.acknowledged_at = new Date().toISOString();
      }
      if (status === "resolved") patch.resolved_at = new Date().toISOString();
      const { error } = await (supabase as any).from("agent_handoffs").update(patch).eq("id", id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["agent-handoffs", workspaceId] });
      
      toast.success(status === "acknowledged" ? "Taken over" : status === "resolved" ? "Resolved" : "Sent back to AI");
    } catch (err) {
      
      toast.error("Action failed", { description: (err as Error).message });
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="container max-w-4xl py-4 sm:py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Handoffs</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Live cards from your AI agents when they need you. Front line stays automated.
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
        </Badge>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : handoffs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            <Bot className="mx-auto mb-2 h-6 w-6 text-muted-foreground/60" />
            All quiet. Your agents will surface a card here when a customer needs a human.
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <div className="space-y-3 pr-2">
            {handoffs.map((h) => {
              const Icon = h.channel === "voice" ? Phone : MessageSquare;
              return (
                <Card key={h.id} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Icon className="h-4 w-4 text-primary" />
                        {h.channel.toUpperCase()} · handoff requested
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${priorityTone[h.priority]}`}>
                          {h.priority}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(h.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-md bg-muted/50 p-2.5">
                      <p className="text-[11px] font-medium uppercase text-muted-foreground">Reason</p>
                      <p className="text-sm">{h.reason}</p>
                    </div>
                    {Array.isArray(h.recap) && h.recap.length > 0 && (
                      <div>
                        <p className="mb-1 text-[11px] font-medium uppercase text-muted-foreground">Recap</p>
                        <ul className="space-y-1 text-sm">
                          {h.recap.slice(0, 3).map((r, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="text-primary">•</span>
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {h.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={() => updateStatus(h.id, "acknowledged")}
                          disabled={acting === h.id}
                          className="flex-1 sm:flex-none"
                        >
                          <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" /> Take over
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(h.id, "resolved")}
                        disabled={acting === h.id}
                        className="flex-1 sm:flex-none"
                      >
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateStatus(h.id, "returned_to_ai")}
                        disabled={acting === h.id}
                        className="flex-1 sm:flex-none"
                      >
                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Back to AI
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default HandoffInbox;
