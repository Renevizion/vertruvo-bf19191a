import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Sparkles, Mail, MessageSquare, Phone, Voicemail, Plus, Trash2, Play, Pause,
  Loader2, Clock, DollarSign, Users, CheckCircle2, Megaphone,
  ArrowDown, Target, Shield, Zap, ChevronRight, Circle
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { SandboxQuotaBanner } from "@/components/voice/SandboxQuotaBanner";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

type Channel = "email" | "sms" | "voice" | "voicemail";
type FilterMode = "inactivity" | "stage" | "date_range" | "manual";
type BookingMode = "auto_book" | "pending_request" | "hybrid";

interface Step {
  channel: Channel;
  delay_hours: number;
}

const CHANNEL_META: Record<Channel, { label: string; icon: any; color: string; bg: string }> = {
  email: { label: "Email", icon: Mail, color: "text-primary", bg: "bg-primary/10" },
  sms: { label: "SMS", icon: MessageSquare, color: "text-emerald-600", bg: "bg-emerald-400/10" },
  voice: { label: "AI Call", icon: Phone, color: "text-violet-600", bg: "bg-violet-400/10" },
  voicemail: { label: "Voicemail Drop", icon: Voicemail, color: "text-amber-600", bg: "bg-amber-400/10" },
};

const DRAFT_KEY = "outreach.campaign.draft.v2";

export default function Outreach() {
  const [view, setView] = useState<"list" | "new">("list");
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null);
  const [stages, setStages] = useState<any[]>([]);

  // Draft state
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [bookingMode, setBookingMode] = useState<BookingMode>("hybrid");
  const [maxCalls, setMaxCalls] = useState(50);
  const [filterMode, setFilterMode] = useState<FilterMode>("inactivity");
  const [inactivityDays, setInactivityDays] = useState(30);
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [steps, setSteps] = useState<Step[]>([{ channel: "email", delay_hours: 0 }]);

  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewLeads, setPreviewLeads] = useState<any[]>([]);
  const [estCost, setEstCost] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [launching, setLaunching] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: campaignData } = await supabase
      .from("outreach_campaigns" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setCampaigns((campaignData as any[]) || []);

    const { data: stageData } = await supabase
      .from("pipeline_stages")
      .select("id, name, position, pipeline_id")
      .order("position");
    setStages(stageData || []);
  };

  const buildFilter = () => {
    if (filterMode === "inactivity") return { mode: "inactivity", days: inactivityDays };
    if (filterMode === "stage") return { mode: "stage", stage_ids: selectedStages };
    if (filterMode === "date_range") return { mode: "date_range", from: dateFrom, to: dateTo };
    return { mode: "manual", lead_ids: [] };
  };

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      const filter = buildFilter();
      const { data, error } = await supabase.functions.invoke("bulk-outreach-orchestrator", {
        body: { action: "preview_leads", filter },
      });
      if (error) throw error;
      setPreviewCount(data.count);
      setPreviewLeads(data.leads || []);
      const { data: costData } = await supabase.functions.invoke("bulk-outreach-orchestrator", {
        body: { action: "estimate_cost", filter, sequence: steps },
      });
      setEstCost(costData?.estimated_cost_usd ?? null);
    } catch (e: any) {
      toast.error(e.message || "Preview failed");
    } finally {
      setPreviewing(false);
    }
  };

  const handleLaunch = async () => {
    if (!name.trim()) return toast.error("Campaign name required");
    if (!objective.trim()) return toast.error("Objective required");
    if (!steps.length) return toast.error("Add at least one step");
    setLaunching(true);
    try {
      const { data, error } = await supabase.functions.invoke("bulk-outreach-orchestrator", {
        body: { action: "launch", name, objective, sequence: steps, filter: buildFilter(), booking_mode: bookingMode, max_calls: maxCalls },
      });
      if (error) throw error;
      toast.success(`Campaign launched — ${data.campaign.total_leads} leads enrolled`);
      setName(""); setObjective(""); setSteps([{ channel: "email", delay_hours: 0 }]);
      setPreviewCount(null); setEstCost(null);
      setView("list");
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Launch failed");
    } finally {
      setLaunching(false);
    }
  };

  const toggleCampaign = async (id: string, currentStatus: string) => {
    const action = currentStatus === "running" ? "pause" : "resume";
    const { error } = await supabase.functions.invoke("bulk-outreach-orchestrator", {
      body: { action, campaign_id: id },
    });
    if (error) toast.error(error.message);
    else { toast.success(action === "pause" ? "Paused" : "Resumed"); loadData(); }
  };

  const runningCount = campaigns.filter(c => c.status === "running").length;

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium mb-0.5">Growth</p>
          <h1 className="text-2xl font-bold tracking-tight">Bulk Outreach</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Multi-channel sequences. Set it, launch it, book it.</p>
        </div>
        {view === "list" && (
          <Button className="gap-1.5" onClick={() => setView("new")}>
            <Plus className="h-4 w-4" />
            New Campaign
          </Button>
        )}
        {view === "new" && (
          <Button variant="outline" className="gap-1.5" onClick={() => setView("list")}>
            ← Back
          </Button>
        )}
      </div>

      <SandboxQuotaBanner />

      {/* LIST VIEW */}
      {view === "list" && (
        <div className="flex-1 min-h-0 overflow-hidden flex gap-4">
          {campaigns.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                icon={Megaphone}
                title="No campaigns yet"
                description="Build your first outreach sequence to start booking conversations on autopilot."
                action={<Button onClick={() => setView("new")} className="gap-1.5"><Plus className="h-4 w-4" />New Campaign</Button>}
              />
            </div>
          ) : (
            <>
              {/* Campaign list */}
              <div className="w-[280px] shrink-0 flex flex-col gap-2 overflow-y-auto">
                <div className="grid grid-cols-2 gap-2 shrink-0 mb-1">
                  <div className="rounded-xl border bg-card px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Total</p>
                    <p className="text-xl font-bold tabular-nums">{campaigns.length}</p>
                  </div>
                  <div className="rounded-xl border bg-card px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Running</p>
                    <p className={cn("text-xl font-bold tabular-nums", runningCount > 0 ? "text-emerald-600" : "text-muted-foreground")}>{runningCount}</p>
                  </div>
                </div>

                {campaigns.map((c) => {
                  const isSelected = selectedCampaign?.id === c.id;
                  const progress = c.total_leads > 0 ? Math.round(((c.completed_count || 0) / c.total_leads) * 100) : 0;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCampaign(c)}
                      className={cn(
                        "w-full text-left rounded-xl border transition-all overflow-hidden",
                        isSelected ? "border-primary/50 bg-primary/5" : "bg-card hover:bg-muted/40"
                      )}
                    >
                      <div className="flex items-center justify-between px-3 py-2.5 border-b bg-muted/10">
                        <div className="flex items-center gap-2 min-w-0">
                          <Circle className={cn("h-2 w-2 shrink-0 fill-current", c.status === "running" ? "text-emerald-500" : c.status === "paused" ? "text-amber-500" : "text-muted-foreground/30")} />
                          <span className="font-semibold text-sm truncate">{c.name}</span>
                        </div>
                        <Badge variant="outline" className={cn("text-[9px] capitalize shrink-0",
                          c.status === "running" && "border-emerald-400/40 bg-emerald-400/10 text-emerald-600",
                          c.status === "paused" && "border-amber-400/40 bg-amber-400/10 text-amber-600"
                        )}>{c.status}</Badge>
                      </div>
                      <div className="px-3 py-2.5 space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>{c.completed_count || 0}/{c.total_leads || 0} leads</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="h-1 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="flex gap-1">
                          {(c.sequence as any[])?.map((s: any, i: number) => {
                            const M = CHANNEL_META[s.channel as Channel];
                            if (!M) return null;
                            const Icon = M.icon;
                            return <div key={i} className={cn("h-5 w-5 rounded flex items-center justify-center", M.bg)}><Icon className={cn("h-3 w-3", M.color)} /></div>;
                          })}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Detail panel */}
              <div className="flex-1 min-w-0 rounded-xl border bg-card overflow-hidden flex flex-col">
                {selectedCampaign ? (
                  <>
                    <div className="px-6 py-5 border-b bg-muted/20 shrink-0 flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <Badge variant="outline" className={cn("text-[10px] capitalize mb-2",
                          selectedCampaign.status === "running" && "border-emerald-400/40 bg-emerald-400/10 text-emerald-600",
                          selectedCampaign.status === "paused" && "border-amber-400/40 bg-amber-400/10 text-amber-600"
                        )}>{selectedCampaign.status}</Badge>
                        <h2 className="text-xl font-bold">{selectedCampaign.name}</h2>
                        {selectedCampaign.objective && <p className="text-sm text-muted-foreground mt-1">{selectedCampaign.objective}</p>}
                      </div>
                      {(selectedCampaign.status === "running" || selectedCampaign.status === "paused") && (
                        <Button variant="outline" size="sm" className="gap-1.5 h-8 shrink-0"
                          onClick={() => toggleCampaign(selectedCampaign.id, selectedCampaign.status)}>
                          {selectedCampaign.status === "running" ? <><Pause className="h-3.5 w-3.5" />Pause</> : <><Play className="h-3.5 w-3.5" />Resume</>}
                        </Button>
                      )}
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: "Leads enrolled", value: `${selectedCampaign.completed_count || 0} / ${selectedCampaign.total_leads || 0}` },
                          { label: "Est. cost", value: `$${Number(selectedCampaign.estimated_cost_usd || 0).toFixed(2)}` },
                          { label: "Created", value: format(new Date(selectedCampaign.created_at), "MMM d, yyyy") },
                        ].map(({ label, value }) => (
                          <div key={label} className="rounded-xl border bg-muted/20 px-4 py-3">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">{label}</p>
                            <p className="text-sm font-semibold">{value}</p>
                          </div>
                        ))}
                      </div>
                      {(selectedCampaign.sequence as any[])?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Sequence</p>
                          <div className="space-y-2">
                            {(selectedCampaign.sequence as any[]).map((s: any, i: number) => {
                              const M = CHANNEL_META[s.channel as Channel];
                              if (!M) return null;
                              const Icon = M.icon;
                              return (
                                <div key={i} className="flex items-center gap-3 rounded-xl border bg-muted/10 px-4 py-2.5">
                                  <span className="text-[11px] font-mono text-muted-foreground w-4">{i + 1}</span>
                                  <div className={cn("h-6 w-6 rounded-md flex items-center justify-center shrink-0", M.bg)}>
                                    <Icon className={cn("h-3 w-3", M.color)} />
                                  </div>
                                  <span className="text-sm font-medium">{M.label}</span>
                                  {s.delay_hours > 0 && <span className="ml-auto text-xs text-muted-foreground">{s.delay_hours}h delay</span>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <Megaphone className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">Select a campaign to view details</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* NEW CAMPAIGN VIEW — guided vertical wizard */}
      {view === "new" && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-xl mx-auto space-y-0 pb-8">

            {/* Step 1 — Name & Goal */}
            <WizardStep number={1} title="Name & Goal" icon={Target}>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Campaign Name *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Spring Re-engagement" className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">AI Objective *</Label>
                  <Textarea
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    placeholder="Describe what you want the AI to accomplish — e.g. 'Reach out to leads who haven't booked in 30 days. Offer a free intro session and book them if interested.'"
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>
            </WizardStep>

            <StepConnector />

            {/* Step 2 — Audience */}
            <WizardStep number={2} title="Who gets this?" icon={Users}>
              <div className="space-y-3">
                <Select value={filterMode} onValueChange={(v) => setFilterMode(v as FilterMode)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inactivity">Inactive leads (no contact for X days)</SelectItem>
                    <SelectItem value="stage">Leads in specific pipeline stage</SelectItem>
                    <SelectItem value="date_range">Leads created in date range</SelectItem>
                    <SelectItem value="manual">Manual selection</SelectItem>
                  </SelectContent>
                </Select>

                {filterMode === "inactivity" && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">No contact for</span>
                    <Input type="number" value={inactivityDays} onChange={(e) => setInactivityDays(Number(e.target.value))} min={1} className="h-9 w-20" />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                )}
                {filterMode === "stage" && (
                  <div className="flex flex-wrap gap-2">
                    {stages.map(s => (
                      <Badge
                        key={s.id}
                        variant={selectedStages.includes(s.id) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setSelectedStages(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id])}
                      >{s.name}</Badge>
                    ))}
                  </div>
                )}
                {filterMode === "date_range" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">From</Label>
                      <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">To</Label>
                      <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9" />
                    </div>
                  </div>
                )}
              </div>
            </WizardStep>

            <StepConnector />

            {/* Step 3 — Sequence */}
            <WizardStep number={3} title="Sequence" icon={Zap}>
              <div className="space-y-2">
                {steps.map((step, idx) => {
                  const Meta = CHANNEL_META[step.channel];
                  const Icon = Meta.icon;
                  return (
                    <div key={idx}>
                      <div className="flex items-center gap-3 rounded-xl border bg-muted/10 px-4 py-3">
                        <span className="text-[11px] font-mono text-muted-foreground w-4 shrink-0">{idx + 1}</span>
                        <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0", Meta.bg)}>
                          <Icon className={cn("h-3.5 w-3.5", Meta.color)} />
                        </div>
                        <Select
                          value={step.channel}
                          onValueChange={(v) => setSteps(prev => prev.map((s, i) => i === idx ? { ...s, channel: v as Channel } : s))}
                        >
                          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(CHANNEL_META).map(([val, m]) => (
                              <SelectItem key={val} value={val}>{m.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-1.5 flex-1">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <Input
                            type="number"
                            value={step.delay_hours}
                            onChange={(e) => setSteps(prev => prev.map((s, i) => i === idx ? { ...s, delay_hours: Number(e.target.value) } : s))}
                            className="w-16 h-8 text-xs"
                            min={0}
                          />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">hrs</span>
                        </div>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => setSteps(prev => prev.filter((_, i) => i !== idx))}
                          disabled={steps.length === 1}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {idx < steps.length - 1 && (
                        <div className="flex justify-center my-1">
                          <ArrowDown className="h-3 w-3 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                  );
                })}
                <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs w-full mt-1" onClick={() => setSteps([...steps, { channel: "sms", delay_hours: 24 }])}>
                  <Plus className="h-3.5 w-3.5" /> Add Step
                </Button>
              </div>
            </WizardStep>

            <StepConnector />

            {/* Step 4 — Safety */}
            <WizardStep number={4} title="Safety & Booking" icon={Shield}>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Booking Mode</Label>
                  <Select value={bookingMode} onValueChange={(v) => setBookingMode(v as BookingMode)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hybrid">Hybrid — auto-book if slot available</SelectItem>
                      <SelectItem value="auto_book">Full auto-book</SelectItem>
                      <SelectItem value="pending_request">Pending only — staff approves</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Max AI Calls (hard cap)</Label>
                  <div className="flex items-center gap-3">
                    <Input type="number" value={maxCalls} onChange={(e) => setMaxCalls(Number(e.target.value))} min={1} className="h-9 w-28" />
                    <span className="text-xs text-muted-foreground">Voice calls cost ~$0.05–0.15/min</span>
                  </div>
                </div>
              </div>
            </WizardStep>

            <StepConnector />

            {/* Step 5 — Preview & Launch */}
            <WizardStep number={5} title="Preview & Launch" icon={Sparkles} last>
              <div className="space-y-3">
                <Button onClick={handlePreview} disabled={previewing} variant="outline" className="w-full gap-2 h-9">
                  {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                  Preview Audience
                </Button>

                {previewCount !== null && (
                  <div className="rounded-xl border bg-muted/20 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="font-bold">{previewCount}</span>
                      <span className="text-muted-foreground">leads matched</span>
                    </div>
                    {estCost !== null && (
                      <div className="flex items-center gap-1 text-amber-600 text-sm font-medium">
                        <DollarSign className="h-3.5 w-3.5" />
                        {estCost.toFixed(2)} est.
                      </div>
                    )}
                  </div>
                )}

                {previewCount !== null && previewLeads.length > 0 && (
                  <p className="text-[11px] text-muted-foreground px-1">
                    {previewLeads.slice(0, 5).map(l => l.name).join(", ")}{previewLeads.length > 5 && `, +${previewLeads.length - 5} more`}
                  </p>
                )}

                <Button onClick={handleLaunch} disabled={launching} className="w-full gap-2 h-10 text-base font-semibold">
                  {launching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Launch Campaign
                </Button>
              </div>
            </WizardStep>
          </div>
        </div>
      )}
    </div>
  );
}

function WizardStep({ number, title, icon: Icon, children, last }: { number: number; title: string; icon: any; children: React.ReactNode; last?: boolean }) {
  return (
    <div className="flex gap-4">
      {/* Step indicator */}
      <div className="flex flex-col items-center shrink-0">
        <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      {/* Content */}
      <div className="flex-1 pb-0">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Step {number}</span>
          <h3 className="text-sm font-bold">{title}</h3>
        </div>
        <div className="rounded-xl border bg-card p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

function StepConnector() {
  return (
    <div className="flex gap-4 py-1">
      <div className="flex flex-col items-center w-9 shrink-0">
        <div className="w-px flex-1 bg-border" />
      </div>
      <div className="flex-1" />
    </div>
  );
}
