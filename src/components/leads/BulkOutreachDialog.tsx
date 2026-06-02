import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Eye, Loader2, Check, X, Edit3, Mail, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  value: number;
  notes?: string;
  stage_id: string | null;
}

interface OutreachDraft {
  leadId: string;
  leadName: string;
  email: string;
  subject: string;
  body: string;
  status: "pending" | "approved" | "skipped" | "sent" | "sending" | "error";
  error?: string;
}

interface BulkOutreachDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLeads: Lead[];
  stageName?: string;
  onComplete?: () => void;
}

const PRESET_OBJECTIVES = [
  { label: "Follow up", value: "follow_up", description: "Check in on where they left off, offer to answer questions" },
  { label: "Win back", value: "win_back", description: "Re-engage lost leads with a fresh offer or updated value prop" },
  { label: "Upsell program", value: "upsell", description: "Introduce a new program, class, or package they might like" },
  { label: "Appointment reminder", value: "reminder", description: "Remind them about upcoming or overdue follow-ups" },
  { label: "Seasonal offer", value: "seasonal", description: "Promote a seasonal or time-limited program/discount" },
];

export const BulkOutreachDialog = ({ open, onOpenChange, selectedLeads, stageName, onComplete }: BulkOutreachDialogProps) => {
  const [step, setStep] = useState<"configure" | "review" | "sending" | "complete">("configure");
  const [objective, setObjective] = useState("");
  const [customObjective, setCustomObjective] = useState("");
  const [autoSend, setAutoSend] = useState(false);
  const [drafts, setDrafts] = useState<OutreachDraft[]>([]);
  const [generating, setGenerating] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [expandedDraft, setExpandedDraft] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<string | null>(null);

  const leadsWithEmail = selectedLeads.filter(l => l.email);
  const leadsWithoutEmail = selectedLeads.filter(l => !l.email);

  useEffect(() => {
    if (!open) {
      setStep("configure");
      setObjective("");
      setCustomObjective("");
      setAutoSend(false);
      setDrafts([]);
      setGenerating(false);
      setSendProgress(0);
      setExpandedDraft(null);
      setEditingDraft(null);
    }
  }, [open]);

  const effectiveObjective = objective === "custom" ? customObjective : PRESET_OBJECTIVES.find(p => p.value === objective)?.description || "";

  const handleGenerate = async () => {
    if (!effectiveObjective.trim()) {
      toast.error("Please select or write an objective");
      return;
    }
    if (leadsWithEmail.length === 0) {
      toast.error("No selected leads have email addresses");
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("bulk-ai-outreach", {
        body: {
          leadIds: leadsWithEmail.map(l => l.id),
          objective: effectiveObjective,
          mode: "generate",
          stageName,
        },
      });

      if (error) throw error;
      if (!data?.drafts) throw new Error("No drafts returned");

      setDrafts(data.drafts.map((d: any) => ({
        leadId: d.lead_id,
        leadName: d.lead_name,
        email: d.email,
        subject: d.subject,
        body: d.body,
        status: "pending" as const,
      })));

      if (autoSend) {
        setStep("sending");
        await sendAllDrafts(data.drafts);
      } else {
        setStep("review");
      }
    } catch (err: any) {
      console.error("Outreach generation error:", err);
      toast.error("Failed to generate outreach", { description: err.message });
    } finally {
      setGenerating(false);
    }
  };

  const sendAllDrafts = async (draftsToSend?: any[]) => {
    const toSend = draftsToSend || drafts.filter(d => d.status === "pending" || d.status === "approved");
    let completed = 0;

    for (const draft of toSend) {
      const leadId = draft.leadId || draft.lead_id;
      setDrafts(prev => prev.map(d => (d.leadId || (d as any).lead_id) === leadId ? { ...d, status: "sending" as const } : d));

      try {
        const { error } = await supabase.functions.invoke("bulk-ai-outreach", {
          body: {
            mode: "send",
            email: {
              to: draft.email,
              subject: draft.subject,
              body: draft.body,
              leadId: leadId,
            },
            objective: effectiveObjective,
            stageName,
          },
        });

        if (error) throw error;
        setDrafts(prev => prev.map(d => (d.leadId || (d as any).lead_id) === leadId ? { ...d, status: "sent" as const } : d));
      } catch (err: any) {
        setDrafts(prev => prev.map(d => (d.leadId || (d as any).lead_id) === leadId ? { ...d, status: "error" as const, error: err.message } : d));
      }

      completed++;
      setSendProgress(Math.round((completed / toSend.length) * 100));
    }

    setStep("complete");
  };

  const handleApproveAndSend = async () => {
    setStep("sending");
    await sendAllDrafts();
  };

  const sentCount = drafts.filter(d => d.status === "sent").length;
  const errorCount = drafts.filter(d => d.status === "error").length;
  const skippedCount = drafts.filter(d => d.status === "skipped").length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex h-full w-full flex-col overflow-hidden p-0 sm:max-w-3xl lg:max-w-5xl">
        <div className="surface-mesh border-b px-6 py-5">
          <SheetHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <SheetTitle className="text-display text-3xl">Outreach workspace</SheetTitle>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="secondary">{selectedLeads.length} selected</Badge>
                  <Badge variant="outline">{leadsWithEmail.length} reachable</Badge>
                  {stageName && <Badge variant="outline">{stageName}</Badge>}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg border bg-background/70 px-3 py-2">
                  <p className="num-display text-lg font-semibold text-foreground">{leadsWithEmail.length}</p>
                  <p className="text-muted-foreground">Ready</p>
                </div>
                <div className="rounded-lg border bg-background/70 px-3 py-2">
                  <p className="num-display text-lg font-semibold text-foreground">{leadsWithoutEmail.length}</p>
                  <p className="text-muted-foreground">Skipped</p>
                </div>
                <div className="rounded-lg border bg-background/70 px-3 py-2">
                  <p className="num-display text-lg font-semibold text-foreground">{drafts.length}</p>
                  <p className="text-muted-foreground">Drafts</p>
                </div>
              </div>
            </div>
          </SheetHeader>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">

        {step === "configure" && (
          <div className="space-y-5 py-2">
            {leadsWithoutEmail.length > 0 && (
              <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
                <span className="text-muted-foreground">
                  {leadsWithoutEmail.length} lead{leadsWithoutEmail.length !== 1 ? "s" : ""} without email will be skipped:
                </span>
                <span className="ml-1 font-medium text-foreground">
                  {leadsWithoutEmail.map(l => l.name).join(", ")}
                </span>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
              <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Campaign objective</label>
              <Select value={objective} onValueChange={setObjective}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose the outcome this outreach should drive" />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_OBJECTIVES.map(p => (
                    <SelectItem key={p.value} value={p.value}>
                      <div className="flex flex-col">
                        <span>{p.label}</span>
                        <span className="text-xs text-muted-foreground">{p.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom objective...</SelectItem>
                </SelectContent>
              </Select>
              </div>

              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Review before sending</p>
                    <p className="text-xs leading-5 text-muted-foreground">Keep this on for curated outreach. Disable only for trusted repeat motions.</p>
                  </div>
                  <Switch checked={!autoSend} onCheckedChange={(checked) => setAutoSend(!checked)} />
                </div>
              </div>
            </div>

            {objective === "custom" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Describe your objective</label>
                <Textarea
                  value={customObjective}
                  onChange={e => setCustomObjective(e.target.value)}
                  placeholder="e.g. Reach out about our new summer BJJ program, mention the early bird discount for June sign-ups..."
                  rows={3}
                />
              </div>
            )}

            <div className="grid gap-3 text-xs text-muted-foreground md:grid-cols-3">
              <div className="rounded-lg border bg-background/70 p-3">Context-aware drafts use lead notes, activities, and stage data.</div>
              <div className="rounded-lg border bg-background/70 p-3">Each message is tailored for the recipient rather than blasted as one template.</div>
              <div className="rounded-lg border bg-background/70 p-3">Every send is recorded on the lead timeline for auditability.</div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generating || !objective || (objective === "custom" && !customObjective.trim())}
              className="w-full"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating {leadsWithEmail.length} tailored email{leadsWithEmail.length !== 1 ? "s" : ""}...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Outreach ({leadsWithEmail.length} email{leadsWithEmail.length !== 1 ? "s" : ""})
                </>
              )}
            </Button>
          </div>
        )}

        {step === "review" && (
          <div className="flex flex-col flex-1 min-h-0 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Review each draft before sending. Click to expand.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setStep("configure")}>
                  Back
                </Button>
                <Button size="sm" onClick={handleApproveAndSend} disabled={drafts.every(d => d.status === "skipped")}>
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  Send {drafts.filter(d => d.status !== "skipped").length} email{drafts.filter(d => d.status !== "skipped").length !== 1 ? "s" : ""}
                </Button>
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="grid gap-3 pr-3 lg:grid-cols-2">
                {drafts.map(draft => {
                  const isExpanded = expandedDraft === draft.leadId;
                  const isEditing = editingDraft === draft.leadId;
                  return (
                    <Card key={draft.leadId} className={`surface-raised transition-colors ${draft.status === "skipped" ? "opacity-50" : ""}`}>
                      <div
                        className="flex items-center justify-between p-3 cursor-pointer"
                        onClick={() => setExpandedDraft(isExpanded ? null : draft.leadId)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{draft.leadName}</p>
                            <p className="text-xs text-muted-foreground truncate">{draft.subject}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {draft.status === "skipped" && <Badge variant="secondary">Skipped</Badge>}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={e => {
                              e.stopPropagation();
                              setDrafts(prev => prev.map(d => d.leadId === draft.leadId
                                ? { ...d, status: d.status === "skipped" ? "pending" : "skipped" }
                                : d
                              ));
                            }}
                          >
                            {draft.status === "skipped" ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                          </Button>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="px-3 pb-3 border-t border-border pt-3 space-y-3">
                          <div className="text-xs text-muted-foreground">To: {draft.email}</div>
                          {isEditing ? (
                            <div className="space-y-2">
                              <input
                                className="w-full text-sm font-medium border border-border rounded px-2 py-1 bg-background"
                                value={draft.subject}
                                onChange={e => setDrafts(prev => prev.map(d => d.leadId === draft.leadId ? { ...d, subject: e.target.value } : d))}
                              />
                              <Textarea
                                value={draft.body}
                                onChange={e => setDrafts(prev => prev.map(d => d.leadId === draft.leadId ? { ...d, body: e.target.value } : d))}
                                rows={6}
                                className="text-sm"
                              />
                              <Button size="sm" variant="outline" onClick={() => setEditingDraft(null)}>Done editing</Button>
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm font-medium mb-1">{draft.subject}</p>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{draft.body}</p>
                              <Button size="sm" variant="ghost" className="mt-2" onClick={() => setEditingDraft(draft.leadId)}>
                                <Edit3 className="h-3 w-3 mr-1" /> Edit
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {step === "sending" && (
          <div className="py-8 space-y-6 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <div>
              <p className="text-lg font-medium">Sending outreach...</p>
              <p className="text-sm text-muted-foreground mt-1">
                {drafts.filter(d => d.status === "sent").length} / {drafts.filter(d => d.status !== "skipped").length} sent
              </p>
            </div>
            <Progress value={sendProgress} className="w-full max-w-xs mx-auto" />
            <ScrollArea className="max-h-40">
              <div className="space-y-1 text-left px-4">
                {drafts.filter(d => d.status !== "skipped").map(d => (
                  <div key={d.leadId} className="flex items-center gap-2 text-sm">
                    {d.status === "sent" && <Check className="h-3.5 w-3.5 text-success" />}
                    {d.status === "sending" && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                    {d.status === "error" && <X className="h-3.5 w-3.5 text-destructive" />}
                    {d.status === "pending" && <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground" />}
                    <span className={d.status === "sent" ? "text-foreground" : "text-muted-foreground"}>{d.leadName}</span>
                    {d.error && <span className="text-xs text-destructive ml-auto">{d.error}</span>}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {step === "complete" && (
          <div className="py-8 space-y-4 text-center">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Check className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-lg font-semibold">Outreach Complete</p>
              <p className="text-sm text-muted-foreground mt-1">
                {sentCount} sent · {errorCount > 0 ? `${errorCount} failed · ` : ""}{skippedCount > 0 ? `${skippedCount} skipped` : ""}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              All outreach has been logged on each lead's timeline for your review.
            </p>
            <Button onClick={() => { onOpenChange(false); onComplete?.(); }}>
              Done
            </Button>
          </div>
        )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
