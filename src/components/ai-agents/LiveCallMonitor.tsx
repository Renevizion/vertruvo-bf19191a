import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Phone, PhoneCall, PhoneOff, Mic, Clock, User, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

interface LiveCallMonitorProps {
  agentId: string;
  workspaceId: string;
}

type Stage = "dialing" | "ringing" | "connected" | "talking" | "wrapping";

const STAGES: { key: Stage; label: string; statuses: string[] }[] = [
  { key: "dialing", label: "Dialing", statuses: ["initiated", "queued"] },
  { key: "ringing", label: "Ringing", statuses: ["ringing"] },
  { key: "connected", label: "Connected", statuses: ["in-progress", "answered"] },
  { key: "talking", label: "Talking", statuses: ["in-progress"] },
  { key: "wrapping", label: "Wrapping", statuses: ["completing"] },
];

function getStage(status: string, hasTranscript: boolean): Stage {
  const s = (status || "").toLowerCase();
  if (s === "ringing") return "ringing";
  if (s === "initiated" || s === "queued") return "dialing";
  if (s === "in-progress" || s === "answered") return hasTranscript ? "talking" : "connected";
  return "wrapping";
}

function useElapsed(startIso: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const secs = Math.max(0, Math.floor((now - new Date(startIso).getTime()) / 1000));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function LiveCallMonitor({ agentId, workspaceId }: LiveCallMonitorProps) {
  const { data: calls, refetch } = useQuery({
    queryKey: ["live-calls", agentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("call_logs")
        .select("id, phone_number, status, transcript, created_at, duration, call_sid, leads(name), contacts(name)")
        .eq("workspace_id", workspaceId)
        .eq("agent_id", agentId)
        .in("status", ["initiated", "queued", "ringing", "in-progress", "answered"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!agentId && !!workspaceId,
    refetchInterval: 2000,
  });

  // Realtime — instant updates as Twilio webhooks land
  useEffect(() => {
    if (!agentId) return;
    const ch = supabase
      .channel(`live-calls-${agentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "call_logs", filter: `agent_id=eq.${agentId}` },
        () => refetch()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [agentId, refetch]);

  const liveCalls = calls || [];

  if (liveCalls.length === 0) {
    return (
      <Card className="p-8">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <PhoneOff className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">No live calls right now</p>
            <p className="text-sm text-muted-foreground mt-1">
              When this agent is on a call, you'll see each one here with live transcription and the current stage.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inset-0 rounded-full bg-emerald-500 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <p className="text-sm font-semibold">
            {liveCalls.length} live {liveCalls.length === 1 ? "call" : "calls"}
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] gap-1">
          <Radio className="h-3 w-3" />
          Live
        </Badge>
      </div>

      <div className="space-y-3">
        {liveCalls.map((call: any) => (
          <LiveCallCard key={call.id} call={call} />
        ))}
      </div>
    </div>
  );
}

function LiveCallCard({ call }: { call: any }) {
  const elapsed = useElapsed(call.created_at);
  const transcript = (call.transcript || "").trim();
  const stage = getStage(call.status, transcript.length > 0);
  const name = call.leads?.name || call.contacts?.name || "Unknown contact";

  const stageIndex = useMemo(() => STAGES.findIndex((s) => s.key === stage), [stage]);

  const lastLines = useMemo(() => {
    if (!transcript) return [];
    return transcript.split(/\n+/).slice(-4);
  }, [transcript]);

  return (
    <Card className="overflow-hidden border-emerald-500/30">
      <div className="p-4 border-b bg-emerald-500/5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <PhoneCall className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate flex items-center gap-1.5">
              <User className="h-3 w-3 text-muted-foreground" />
              {name}
            </p>
            <p className="text-xs text-muted-foreground font-mono">{call.phone_number}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
            <Clock className="h-3 w-3" />
            {elapsed}
          </div>
          <Badge className="bg-emerald-600 text-white capitalize gap-1 text-[10px]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 rounded-full bg-white opacity-80 animate-ping" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
            </span>
            {stage}
          </Badge>
        </div>
      </div>

      {/* Stage progress */}
      <div className="px-4 pt-3">
        <div className="flex items-center gap-1">
          {STAGES.slice(0, 4).map((s, i) => {
            const active = i <= stageIndex;
            const current = i === stageIndex;
            return (
              <div key={s.key} className="flex-1 flex items-center gap-1 min-w-0">
                <div
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors",
                    active ? "bg-emerald-500" : "bg-muted",
                    current && "animate-pulse"
                  )}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-1.5">
          {STAGES.slice(0, 4).map((s, i) => (
            <span
              key={s.key}
              className={cn(
                "text-[10px] uppercase tracking-wide font-medium",
                i <= stageIndex ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* Live transcript */}
      <div className="px-4 pb-4 pt-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Mic className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
            Live transcript
          </span>
        </div>
        {lastLines.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Waiting for speech…</p>
        ) : (
          <ScrollArea className="max-h-32">
            <div className="space-y-1.5 text-sm leading-snug">
              {lastLines.map((line, i) => (
                <p
                  key={i}
                  className={cn(
                    "rounded-md px-2 py-1",
                    i === lastLines.length - 1
                      ? "bg-emerald-500/10 text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {line}
                </p>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </Card>
  );
}
