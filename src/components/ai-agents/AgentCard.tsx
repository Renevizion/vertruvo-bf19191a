import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, MessageSquare, MoreVertical, Pencil, Trash2, Database, Play, Pause, Activity, AlertCircle, Clock, Radio } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  phone_number: string | null;
  created_at: string;
  knowledge_base_id: string | null;
  blueprint_id?: string | null;
  blueprint_version?: number | null;
}

interface AgentCardProps {
  agent: Agent;
  onUpdate: () => void;
  onOpenMonitoring?: (agentId: string) => void;
  onEdit?: (agent: Agent) => void;
}

export function AgentCard({ agent, onUpdate, onOpenMonitoring, onEdit }: AgentCardProps) {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: adjacency } = useQuery({
    queryKey: ["agent-adjacency", agent.id],
    queryFn: async () => {
      const since24h = new Date(Date.now() - 86_400_000).toISOString();
      const [convs, escalations, lastActivity] = await Promise.all([
        supabase.from("activities").select("id", { count: "exact", head: true }).eq("type", "agent_reply").gte("created_at", since24h),
        supabase.from("activities").select("id", { count: "exact", head: true }).eq("type", "agent_handoff").gte("created_at", since24h),
        supabase.from("activities").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      return {
        handled: convs.count || 0,
        escalated: escalations.count || 0,
        lastActiveAt: lastActivity.data?.created_at as string | undefined,
      };
    },
    refetchInterval: 60_000,
  });

  const { data: blueprint } = useQuery({
    queryKey: ["agent-blueprint", agent.blueprint_id],
    enabled: !!agent.blueprint_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("agent_blueprints")
        .select("id, name, version, instructions, greeting, voice")
        .eq("id", agent.blueprint_id!)
        .maybeSingle();
      return data;
    },
  });

  const updateAvailable = !!blueprint && (blueprint.version ?? 0) > (agent.blueprint_version ?? 0);

  const handleResetToBlueprint = async () => {
    if (!blueprint) return;
    try {
      const { error } = await supabase.from("ai_agents").update({
        instructions: blueprint.instructions,
        greeting: blueprint.greeting,
        voice: blueprint.voice,
        blueprint_version: blueprint.version,
      }).eq("id", agent.id);
      if (error) throw error;
      toast({ title: "Reset to latest blueprint" });
      onUpdate();
    } catch (e: any) {
      toast({ title: "Reset failed", description: e.message, variant: "destructive" });
    }
  };

  const handleDetach = async () => {
    try {
      const { error } = await supabase.from("ai_agents")
        .update({ blueprint_id: null, blueprint_version: null })
        .eq("id", agent.id);
      if (error) throw error;
      toast({ title: "Detached from blueprint" });
      onUpdate();
    } catch (e: any) {
      toast({ title: "Detach failed", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from("ai_agents").delete().eq("id", agent.id);
      if (error) throw error;
      toast({ title: "Agent deleted" });
      onUpdate();
      setDeleteDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = agent.status === "active" ? "draft" : "active";
    try {
      const { error } = await supabase.from("ai_agents").update({ status: newStatus }).eq("id", agent.id);
      if (error) throw error;
      toast({ title: `Agent ${newStatus === "active" ? "activated" : "set to draft"}` });
      onUpdate();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const isActive = agent.status === "active";
  const isVoice = agent.type === "voice";

  return (
    <Card
      className={cn(
        "group relative overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
        isActive ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent" : "hover:border-primary/30"
      )}
      onClick={() => onOpenMonitoring?.(agent.id)}
    >
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-500" />
      )}


      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn(
              "flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center",
              isVoice ? "bg-violet-500/10 text-violet-500" : "bg-blue-500/10 text-blue-500"
            )}>
              {isVoice ? <Phone className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-sm leading-tight truncate">{agent.name}</h3>
                <Badge variant="outline" className={cn(
                  "text-[10px] px-1.5 py-0 h-4 font-medium border-0",
                  isActive ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                )}>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 inline-block" />}
                  {isActive ? "Live" : "Draft"}
                </Badge>
                {blueprint && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-0 bg-primary/10 text-primary">
                    From: {blueprint.name}
                  </Badge>
                )}
                {updateAvailable && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-0 bg-amber-500/15 text-amber-600">
                    Update available
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isVoice ? "Voice AI Agent" : "Chat AI Agent"}
                {agent.phone_number && (
                  <span className="ml-2 font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">{agent.phone_number}</span>
                )}
              </p>
            </div>
          </div>

          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={handleToggleStatus}>
                  {isActive ? <><Pause className="w-3.5 h-3.5 mr-2" />Set to Draft</> : <><Play className="w-3.5 h-3.5 mr-2" />Activate Agent</>}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {agent.knowledge_base_id && (
                  <>
                    <DropdownMenuItem><Database className="w-3.5 h-3.5 mr-2" />View Knowledge Base</DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => onEdit?.(agent)}><Pencil className="w-3.5 h-3.5 mr-2" />Edit Agent</DropdownMenuItem>
                {blueprint && (
                  <>
                    <DropdownMenuItem onClick={handleResetToBlueprint} disabled={!updateAvailable}>
                      <Database className="w-3.5 h-3.5 mr-2" />Reset to blueprint
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDetach}>
                      <Database className="w-3.5 h-3.5 mr-2" />Detach from blueprint
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteDialogOpen(true)}>
                  <Trash2 className="w-3.5 h-3.5 mr-2" />Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-muted/50 px-2.5 py-2 text-center">
            <p className="text-base font-semibold tabular-nums">{adjacency?.handled ?? 0}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Handled</p>
          </div>
          <div className={cn("rounded-lg px-2.5 py-2 text-center", (adjacency?.escalated ?? 0) > 0 ? "bg-amber-500/10" : "bg-muted/50")}>
            <p className={cn("text-base font-semibold tabular-nums", (adjacency?.escalated ?? 0) > 0 ? "text-amber-600 dark:text-amber-400" : "")}>
              {adjacency?.escalated ?? 0}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Escalated</p>
          </div>
          <div className="rounded-lg bg-muted/50 px-2.5 py-2 text-center">
            <p className="text-[11px] font-medium tabular-nums leading-tight">
              {adjacency?.lastActiveAt ? formatDistanceToNow(new Date(adjacency.lastActiveAt), { addSuffix: true }) : isActive ? "Standing by" : "Idle"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Last active</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">
            Created {agent.created_at ? format(new Date(agent.created_at), "MMM d, yyyy") : "—"}
          </p>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            <Radio className="h-3 w-3" />
            <span>Click to monitor</span>
          </div>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete "{agent.name}". This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
