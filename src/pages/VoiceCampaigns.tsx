import { useState } from "react";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  CheckCircle2, XCircle, Phone, Target, ChevronDown, ChevronRight, Radio,
  Loader2, Mic, Clock, BarChart3
} from "lucide-react";
import { CallObjectivesManager } from "@/components/voice/CallObjectivesManager";
import { SandboxQuotaBanner } from "@/components/voice/SandboxQuotaBanner";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";


export default function VoiceCampaigns() {
  const [expandedCall, setExpandedCall] = useState<string | null>(null);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);

  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ["voice-campaigns-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("voice_broadcasts" as any)
        .select("*")
        .order("created_at", { ascending: false });
      return (data as any[]) || [];
    },
  });

  const { data: calls, isLoading: callsLoading } = useQuery({
    queryKey: ["voice-campaign-calls"],
    queryFn: async () => {
      const { data } = await supabase
        .from("call_logs")
        .select("*, leads(name), call_objectives(name)")
        .order("created_at", { ascending: false })
        .limit(100);
      return data || [];
    },
    refetchInterval: 5000,
  });

  const callsByCampaign = (campaignId: string) =>
    calls?.filter((c: any) => c.broadcast_id === campaignId) || [];

  const totalCampaigns = campaigns?.length || 0;
  const totalCalls = calls?.length || 0;
  const metCount = calls?.filter((c: any) => c.objective_met === true).length || 0;
  const metRate = totalCalls > 0 ? Math.round((metCount / totalCalls) * 100) : 0;
  const activeNow = calls?.filter((c: any) => c.status === "in-progress").length || 0;

  const selectedCampaignCalls = selectedCampaign ? callsByCampaign(selectedCampaign.id) : [];
  const selectedSucceeded = selectedCampaignCalls.filter((c: any) => c.objective_met === true).length;
  const selectedFailed = selectedCampaignCalls.filter((c: any) => c.objective_met === false).length;

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium mb-0.5">Growth</p>
          <h1 className="text-2xl font-bold tracking-tight">Voice Campaigns</h1>
        </div>
      </div>

      <SandboxQuotaBanner />

      {/* Context banner — only show if no campaigns yet */}
      {!campaignsLoading && totalCampaigns === 0 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 flex items-start gap-4 shrink-0">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Phone className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Your AI makes the calls — you just review the results.</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Thermi Voice dials your leads, follows your script, and books appointments automatically.
              Set up your call templates first, then launch a campaign to start calling.
            </p>
          </div>
          <Link to="/call-templates" className="shrink-0 text-xs font-medium text-primary hover:underline mt-0.5 whitespace-nowrap">Set up templates →</Link>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        {[
          { label: "Campaigns", value: totalCampaigns.toLocaleString(), icon: Radio, color: "text-primary bg-primary/10" },
          { label: "Total Calls", value: totalCalls.toLocaleString(), icon: Phone, color: "text-blue-600 bg-blue-400/10 dark:text-blue-400" },
          { label: "Objective Met", value: `${metRate}%`, sub: `${metCount} of ${totalCalls}`, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-400/10 dark:text-emerald-400" },
          { label: "Live Now", value: activeNow.toLocaleString(), sub: activeNow > 0 ? "in progress" : "idle", icon: Target, color: activeNow > 0 ? "text-rose-600 bg-rose-400/10 dark:text-rose-400" : "text-muted-foreground bg-muted" },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border bg-card px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
              <div className={cn("h-6 w-6 rounded-md flex items-center justify-center", color)}>
                <Icon className="h-3 w-3" />
              </div>
            </div>
            <p className="text-2xl font-bold tabular-nums leading-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>

      <Tabs defaultValue="campaigns" className="flex-1 flex flex-col min-h-0">
        <TabsList className="shrink-0 w-fit">
          <TabsTrigger value="campaigns" className="gap-1.5"><Radio className="h-3.5 w-3.5" />Campaigns</TabsTrigger>
          <TabsTrigger value="calls" className="gap-1.5"><Phone className="h-3.5 w-3.5" />All Calls</TabsTrigger>
          <TabsTrigger value="objectives" className="gap-1.5"><Target className="h-3.5 w-3.5" />Objectives</TabsTrigger>
        </TabsList>

        {/* Campaigns tab */}
        <TabsContent value="campaigns" className="flex-1 mt-4 min-h-0">
          {campaignsLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : !campaigns?.length ? (
            <EmptyState size="compact" icon={Radio} title="No voice campaigns yet" description="Launch your first AI voice campaign to call leads at scale with a clear objective." />
          ) : (
            <div className="flex gap-4 h-full min-h-0">
              {/* Campaign list */}
              <div className="w-full xl:w-[420px] shrink-0 space-y-3 overflow-y-auto">
                {campaigns.map((c: any) => {
                  const campaignCalls = callsByCampaign(c.id);
                  const succeeded = campaignCalls.filter((x: any) => x.objective_met === true).length;
                  const isSelected = selectedCampaign?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCampaign(c)}
                      className={cn(
                        "w-full text-left rounded-xl border transition-all hover:border-primary/30 overflow-hidden",
                        isSelected && "border-primary/50 bg-primary/5"
                      )}
                    >
                      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/10">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Radio className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <span className="font-semibold text-sm truncate">{c.name}</span>
                        </div>
                        <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0", isSelected && "rotate-90")} />
                      </div>
                      <div className="px-4 py-3 space-y-2">
                        {c.objective_text && <p className="text-xs text-muted-foreground line-clamp-1">{c.objective_text}</p>}
                        <div className="flex items-center justify-between">
                          <div className="flex gap-1.5">
                            <Badge variant="secondary" className="text-[10px] py-0 h-4">{c.total_recipients || 0} sent</Badge>
                            <Badge className="text-[10px] py-0 h-4 bg-emerald-600 text-white">{succeeded} met</Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground">{format(new Date(c.created_at), "MMM d")}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Campaign detail */}
              <div className="hidden xl:flex flex-1 min-w-0">
                {selectedCampaign ? (
                  <div className="w-full rounded-xl border bg-card overflow-hidden flex flex-col">
                    <div className="px-6 py-5 border-b bg-muted/20 shrink-0">
                      <h2 className="text-xl font-bold mb-1">{selectedCampaign.name}</h2>
                      {selectedCampaign.objective_text && (
                        <p className="text-sm text-muted-foreground">Objective: {selectedCampaign.objective_text}</p>
                      )}
                      <div className="flex gap-3 mt-3">
                        <div className="rounded-lg border bg-background/70 px-3 py-2 text-center">
                          <p className="text-lg font-bold">{selectedCampaignCalls.length}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Calls</p>
                        </div>
                        <div className="rounded-lg border bg-background/70 px-3 py-2 text-center">
                          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{selectedSucceeded}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Met</p>
                        </div>
                        <div className="rounded-lg border bg-background/70 px-3 py-2 text-center">
                          <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{selectedFailed}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Not Met</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                      {selectedCampaignCalls.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No calls yet for this campaign.</p>
                      ) : (
                        selectedCampaignCalls.map((call: any) => (
                          <CallRow key={call.id} call={call} expanded={expandedCall === call.id} onToggle={() => setExpandedCall(expandedCall === call.id ? null : call.id)} />
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="w-full rounded-xl border border-dashed flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">Select a campaign to view calls and outcomes</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* All Calls tab */}
        <TabsContent value="calls" className="flex-1 mt-4 min-h-0 overflow-y-auto">
          {callsLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : !calls?.length ? (
            <EmptyState size="compact" icon={Phone} title="No calls yet" description="Once a campaign runs, every call will appear here with transcript and outcome." />
          ) : (
            <div className="space-y-2">
              {calls.map((call: any) => (
                <div key={call.id} className="rounded-xl border bg-card overflow-hidden">
                  <CallRow call={call} expanded={expandedCall === call.id} onToggle={() => setExpandedCall(expandedCall === call.id ? null : call.id)} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Objectives tab */}
        <TabsContent value="objectives" className="mt-4 flex-1">
          <div className="rounded-xl border bg-card p-6">
            <CallObjectivesManager />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CallRow({ call, expanded, onToggle }: { call: any; expanded: boolean; onToggle: () => void }) {
  const objMet = call.objective_met;
  return (
    <div className="text-sm">
      <button
        className="w-full text-left flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 min-w-0">
          {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
          <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{call.leads?.name || call.phone_number}</p>
            <p className="text-xs text-muted-foreground">{format(new Date(call.created_at), "MMM d, h:mm a")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-[10px] capitalize">{call.status}</Badge>
          {objMet === true && <Badge className="text-[10px] bg-emerald-600 text-white gap-1"><CheckCircle2 className="h-2.5 w-2.5" />Met</Badge>}
          {objMet === false && <Badge variant="destructive" className="text-[10px] gap-1"><XCircle className="h-2.5 w-2.5" />Not met</Badge>}
          {objMet === null && call.status === "completed" && <Badge variant="secondary" className="text-[10px]">Evaluating…</Badge>}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t bg-muted/10">
          <div className="pt-3 space-y-2">
            {(call.objective_text || call.call_objectives?.name) && (
              <div className="rounded-lg border bg-background/70 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-0.5">Objective</p>
                <p className="text-sm">{call.call_objectives?.name || call.objective_text}</p>
              </div>
            )}
            {call.objective_reasoning && (
              <div className="rounded-lg border bg-background/70 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-0.5">Verdict</p>
                <p className="text-sm">{call.objective_reasoning}</p>
              </div>
            )}
            {call.summary && (
              <div className="rounded-lg border bg-background/70 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-0.5">Summary</p>
                <p className="text-sm">{call.summary}</p>
              </div>
            )}
            {call.keypress_log?.length > 0 && (
              <div className="rounded-lg border bg-background/70 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-0.5">Keys Pressed</p>
                <p className="text-sm font-mono">{call.keypress_log.map((k: any) => k.digit).join(", ")}</p>
              </div>
            )}
            {call.speech_responses?.length > 0 && (
              <div className="rounded-lg border bg-background/70 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">Spoken Replies</p>
                <ul className="space-y-1">
                  {call.speech_responses.map((s: any, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-1.5">
                      <Mic className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
                      <span>"{s.text}"</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {call.transcript && (
              <details className="rounded-lg border bg-background/70 px-3 py-2 cursor-pointer">
                <summary className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Full Transcript</summary>
                <p className="mt-2 text-sm whitespace-pre-wrap">{call.transcript}</p>
              </details>
            )}
            {call.recording_url && (
              <audio controls src={call.recording_url + ".mp3"} className="w-full mt-1 h-8" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
