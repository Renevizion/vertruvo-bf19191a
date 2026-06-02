import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, AlertTriangle, CheckCircle2, TrendingUp, Activity, Settings as SettingsIcon } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";

type Eval = {
  id: string;
  agent_id: string | null;
  conversation_source: string;
  transcript_excerpt: string;
  score: number;
  flags: string[];
  rubric_breakdown: Record<string, number>;
  judge_reasoning: string | null;
  created_at: string;
};

type Alert = {
  id: string;
  evaluation_id: string | null;
  severity: "low" | "medium" | "high" | "critical";
  alert_type: string;
  title: string;
  detail: string | null;
  acknowledged_at: string | null;
  created_at: string;
};

type Rubric = {
  id: string;
  workspace_id: string;
  brand_voice_description: string;
  banned_topics: string[];
  alert_score_threshold: number;
  auto_pause_on_critical: boolean;
  enabled: boolean;
};

const SEVERITY_STYLES: Record<Alert["severity"], string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  critical: "bg-destructive/15 text-destructive",
};

export default function AITrustCenter() {
  const qc = useQueryClient();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("workspaces").select("id").eq("owner_id", user.id).limit(1);
      if (data?.[0]) setWorkspaceId(data[0].id);
    })();
  }, []);

  const { data: evals, isLoading: evalsLoading } = useQuery({
    queryKey: ["ai-evals", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_conversation_evaluations")
        .select("*").eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []) as Eval[];
    },
  });

  const { data: alerts } = useQuery({
    queryKey: ["ai-alerts", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_safety_alerts")
        .select("*").eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return (data ?? []) as Alert[];
    },
  });

  const { data: rubric } = useQuery({
    queryKey: ["ai-rubric", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data } = await supabase.from("ai_judge_rubrics").select("*")
        .eq("workspace_id", workspaceId!).maybeSingle();
      if (!data && workspaceId) {
        const ins = await supabase.from("ai_judge_rubrics")
          .insert({ workspace_id: workspaceId }).select("*").single();
        return ins.data as Rubric;
      }
      return data as Rubric | null;
    },
  });

  const ackAlert = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("ai_safety_alerts")
        .update({ acknowledged_at: new Date().toISOString(), acknowledged_by: user?.id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-alerts"] });
      toast({ title: "Alert acknowledged" });
    },
  });

  const saveRubric = useMutation({
    mutationFn: async (patch: Partial<Rubric>) => {
      if (!rubric) return;
      const { error } = await supabase.from("ai_judge_rubrics")
        .update(patch).eq("id", rubric.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-rubric"] });
      toast({ title: "Rubric updated" });
    },
  });

  // Aggregate stats
  const stats = (() => {
    if (!evals?.length) return { avg: null, total: 0, low: 0, flagged: 0, trend: 0 };
    const recent = evals.slice(0, 50);
    const older = evals.slice(50, 100);
    const avg = Math.round(recent.reduce((s, e) => s + e.score, 0) / recent.length);
    const olderAvg = older.length ? Math.round(older.reduce((s, e) => s + e.score, 0) / older.length) : avg;
    return {
      avg,
      total: evals.length,
      low: recent.filter(e => e.score < (rubric?.alert_score_threshold ?? 70)).length,
      flagged: recent.filter(e => e.flags.length > 0).length,
      trend: avg - olderAvg,
    };
  })();

  const openAlerts = alerts?.filter(a => !a.acknowledged_at) ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">AI Trust Center</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Every AI conversation is independently graded by a judge model. Catch hallucinations, off-policy replies, and brand drift before customers do.
        </p>
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={Activity} label="Trust score" value={stats.avg !== null ? `${stats.avg}` : "—"}
          sub={stats.avg !== null ? "out of 100" : "no data yet"}
          trend={stats.trend} />
        <StatCard icon={CheckCircle2} label="Conversations judged" value={`${stats.total}`} sub="last 100" />
        <StatCard icon={AlertTriangle} label="Below threshold" value={`${stats.low}`} sub={`< ${rubric?.alert_score_threshold ?? 70}`} />
        <StatCard icon={TrendingUp} label="Open alerts" value={`${openAlerts.length}`} sub="need review" />
      </div>

      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts">
            Alerts {openAlerts.length > 0 && <Badge variant="destructive" className="ml-2 h-5">{openAlerts.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="evals">Evaluations</TabsTrigger>
          <TabsTrigger value="rubric"><SettingsIcon className="h-3.5 w-3.5 mr-1" />Rubric</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-3">
          {!alerts?.length && <EmptyState text="No alerts yet. As your AI agents talk to customers, anything risky shows up here." />}
          {alerts?.map(a => (
            <Card key={a.id} className={a.acknowledged_at ? "opacity-60" : ""}>
              <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between">
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={SEVERITY_STYLES[a.severity]}>{a.severity}</Badge>
                    <Badge variant="outline">{a.alert_type.replace(/_/g, " ")}</Badge>
                    <span className="text-xs text-muted-foreground">{format(new Date(a.created_at), "MMM d, p")}</span>
                  </div>
                  <div className="font-medium">{a.title}</div>
                  {a.detail && <p className="text-sm text-muted-foreground line-clamp-3">{a.detail}</p>}
                </div>
                {!a.acknowledged_at && (
                  <Button size="sm" variant="outline" onClick={() => ackAlert.mutate(a.id)}>
                    Acknowledge
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="evals" className="space-y-3">
          {evalsLoading && <Skeleton className="h-32 w-full" />}
          {!evalsLoading && !evals?.length && (
            <EmptyState text="No conversations evaluated yet. Trigger an AI agent conversation to start scoring." />
          )}
          <ScrollArea className="h-[600px]">
            <div className="space-y-3 pr-3">
              {evals?.map(e => (
                <Card key={e.id}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <ScorePill score={e.score} />
                      <Badge variant="outline">{e.conversation_source.replace(/_/g, " ")}</Badge>
                      {e.flags.map(f => (
                        <Badge key={f} variant="destructive" className="text-xs">{f.replace(/_/g, " ")}</Badge>
                      ))}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {format(new Date(e.created_at), "MMM d, p")}
                      </span>
                    </div>
                    {e.judge_reasoning && (
                      <p className="text-sm text-muted-foreground">{e.judge_reasoning}</p>
                    )}
                    {Object.keys(e.rubric_breakdown || {}).length > 0 && (
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                        {Object.entries(e.rubric_breakdown).map(([k, v]) => (
                          <div key={k} className="rounded-md border bg-muted/30 p-2">
                            <div className="text-xs capitalize text-muted-foreground">{k.replace(/_/g, " ")}</div>
                            <div className="font-medium">{v}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">View transcript</summary>
                      <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted p-3 font-mono">{e.transcript_excerpt}</pre>
                    </details>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="rubric">
          <Card>
            <CardHeader>
              <CardTitle>Judge rubric</CardTitle>
              <CardDescription>
                The judge model uses these rules to score every AI conversation. Strict here = safer customer experience.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {rubric ? (
                <RubricEditor rubric={rubric} onSave={(patch) => saveRubric.mutate(patch)} />
              ) : (
                <Skeleton className="h-40 w-full" />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, trend }: { icon: typeof Activity; label: string; value: string; sub: string; trend?: number }) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          <Icon className="h-3.5 w-3.5" /> {label}
        </div>
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-semibold">{value}</div>
          {typeof trend === "number" && trend !== 0 && (
            <span className={`text-xs ${trend > 0 ? "text-emerald-600" : "text-destructive"}`}>
              {trend > 0 ? "+" : ""}{trend}
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}

function ScorePill({ score }: { score: number }) {
  const cls =
    score >= 85 ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" :
    score >= 70 ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" :
    "bg-destructive/15 text-destructive";
  return <Badge className={cls}>{score}/100</Badge>;
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="p-8 text-center text-sm text-muted-foreground">{text}</CardContent>
    </Card>
  );
}

function RubricEditor({ rubric, onSave }: { rubric: Rubric; onSave: (p: Partial<Rubric>) => void }) {
  const [voice, setVoice] = useState(rubric.brand_voice_description);
  const [banned, setBanned] = useState(rubric.banned_topics.join(", "));
  const [threshold, setThreshold] = useState(rubric.alert_score_threshold);
  const [autoPause, setAutoPause] = useState(rubric.auto_pause_on_critical);
  const [enabled, setEnabled] = useState(rubric.enabled);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <Label className="text-sm font-medium">Trust Center enabled</Label>
          <p className="text-xs text-muted-foreground">When off, no conversations are scored.</p>
        </div>
        <Switch checked={enabled} onCheckedChange={(v) => { setEnabled(v); onSave({ enabled: v }); }} />
      </div>

      <div className="space-y-2">
        <Label>Brand voice</Label>
        <Textarea value={voice} onChange={(e) => setVoice(e.target.value)} rows={3} />
      </div>

      <div className="space-y-2">
        <Label>Banned topics (comma-separated)</Label>
        <Input value={banned} onChange={(e) => setBanned(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>Alert when score below: <span className="text-primary">{threshold}</span></Label>
        <Slider value={[threshold]} min={0} max={100} step={5}
          onValueChange={(v) => setThreshold(v[0])} />
      </div>

      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <Label className="text-sm font-medium">Auto-pause agent on critical alert</Label>
          <p className="text-xs text-muted-foreground">Disables the agent immediately if a critical flag triggers.</p>
        </div>
        <Switch checked={autoPause} onCheckedChange={setAutoPause} />
      </div>

      <Button onClick={() => onSave({
        brand_voice_description: voice,
        banned_topics: banned.split(",").map(t => t.trim()).filter(Boolean),
        alert_score_threshold: threshold,
        auto_pause_on_critical: autoPause,
      })}>
        Save rubric
      </Button>
    </div>
  );
}
