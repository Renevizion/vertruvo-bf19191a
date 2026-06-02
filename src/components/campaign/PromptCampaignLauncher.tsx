import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, Send, Mail, MessageSquare, Phone, Pencil, RefreshCw, ThumbsUp, ThumbsDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CampaignPlan {
  channel: "email" | "sms" | "voice";
  segment: { description: string; estimated_count?: number };
  copy: { subject?: string; body: string };
  schedule: { when: "now" | "scheduled"; iso?: string };
  rationale: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId: string;
}

const CHANNEL_META = {
  email: { icon: Mail, label: "Email" },
  sms: { icon: MessageSquare, label: "SMS" },
  voice: { icon: Phone, label: "Voice" },
} as const;

const SUGGESTIONS = [
  "Email our last 30 stale leads a friendly nudge with a booking link",
  "Text top contractor leads about our summer maintenance promo",
  "Email cancelled clients from the last 90 days a win-back offer",
];

export const PromptCampaignLauncher = ({ open, onOpenChange, workspaceId }: Props) => {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [planning, setPlanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState<CampaignPlan | null>(null);
  const [editing, setEditing] = useState(false);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  // Defensive: strip any [Bracketed Placeholder] the model leaks despite system prompt.
  const stripPlaceholders = (s: string) =>
    s.replace(/\[Your Business Name\]/gi, "").replace(/\[[^\]]{2,40}\]/g, "").replace(/\n{3,}/g, "\n\n").trim();

  const handlePlan = async () => {
    if (!prompt.trim()) return;
    setPlanning(true);
    setPlan(null);
    try {
      const { data, error } = await supabase.functions.invoke("plan-and-launch-campaign", {
        body: { prompt, workspace_id: workspaceId },
      });
      if (error) throw error;
      setPlan(data.plan);
      setEditSubject(stripPlaceholders(data.plan?.copy?.subject ?? ""));
      setEditBody(stripPlaceholders(data.plan?.copy?.body ?? ""));
      setEditing(false);
      setFeedback(null);
    } catch (err) {
      toast.error("Couldn't draft campaign", { description: (err as Error).message });
    } finally {
      setPlanning(false);
    }
  };

  const handleClose = () => {
    setPrompt(""); setPlan(null); setEditing(false); setFeedback(null);
    onOpenChange(false);
  };

  const submitFeedback = async (value: "up" | "down") => {
    setFeedback(value);
    try {
      await supabase.from("ai_conversation_evaluations").insert({
        workspace_id: workspaceId,
        kind: "campaign_plan",
        prompt,
        output: JSON.stringify(plan),
        verdict: value === "up" ? "good" : "bad",
      } as any);
    } catch {
      // table is optional — feedback shouldn't block UX
    }
    toast.success(value === "up" ? "Thanks — saved as a good example" : "Got it — we'll redraft differently next time");
  };

  const handleSaveDraft = async (queue: boolean) => {
    if (!plan) return;
    setSaving(true);
    try {
      const subject = editSubject || plan.copy.subject || prompt.slice(0, 80);
      const body = editBody || plan.copy.body;
      const name = `${CHANNEL_META[plan.channel].label}: ${subject || prompt.slice(0, 60)}`;

      const { error } = await supabase
        .from("email_campaigns")
        .insert({
          workspace_id: workspaceId,
          name,
          subject,
          content: body,
          status: queue && plan.schedule.when === "now" ? "scheduled" : "draft",
          scheduled_at: plan.schedule.iso ?? null,
        });
      if (error) throw error;

      toast.success(queue ? "Saved & scheduled" : "Draft saved", {
        description: queue
          ? "Scheduled in Campaigns — open it to confirm recipients and release. Nothing sent yet."
          : "Available under Campaigns.",
        action: { label: "Open", onClick: () => navigate("/email-campaigns") },
      });
      handleClose();
    } catch (err) {
      toast.error("Could not save", { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const ChannelIcon = plan ? CHANNEL_META[plan.channel].icon : Sparkles;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="px-5 py-4 border-b bg-gradient-to-br from-primary/5 to-transparent text-left">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" /> Launch outreach
          </SheetTitle>
          <SheetDescription className="text-xs">
            Describe the outcome. We pick the audience, channel, and copy — you approve before it sends.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="space-y-2">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Email our last 30 stale leads a friendly nudge with a booking link"
              rows={3}
              className="resize-none text-sm"
            />
            {!plan && !planning && (
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setPrompt(s)}
                    className="px-2.5 py-1 rounded-full text-[11px] border border-border/60 hover:bg-accent text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <Button onClick={handlePlan} disabled={planning || !prompt.trim()} className="w-full">
              {planning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {plan ? "Redraft" : "Draft plan"}
            </Button>
          </div>

          {planning && (
            <div className="rounded-xl border bg-card p-4 space-y-2 animate-pulse">
              <div className="h-3 w-1/3 bg-muted rounded" />
              <div className="h-3 w-2/3 bg-muted rounded" />
              <div className="h-20 w-full bg-muted rounded" />
              <p className="text-xs text-primary inline-flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" /> Planning channel, segment, and copy…
              </p>
            </div>
          )}

          {plan && !planning && (
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/40 flex items-center gap-2 flex-wrap">
                <ChannelIcon className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{CHANNEL_META[plan.channel].label}</span>
                <Badge variant="outline" className="text-[10px]">{plan.schedule.when}</Badge>
                {plan.segment.estimated_count != null && (
                  <Badge variant="secondary" className="text-[10px]">~{plan.segment.estimated_count} recipients</Badge>
                )}
                <button
                  type="button"
                  onClick={handlePlan}
                  className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="h-3 w-3" /> Regenerate
                </button>
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <Label className="text-[11px] uppercase text-muted-foreground">Audience</Label>
                  <p className="text-sm">{plan.segment.description}</p>
                </div>

                {plan.channel === "email" && (
                  <div className="space-y-1">
                    <Label className="text-[11px] uppercase text-muted-foreground">Subject</Label>
                    {editing ? (
                      <Input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} className="h-8 text-sm" />
                    ) : (
                      <p className="text-sm font-medium">{editSubject || "—"}</p>
                    )}
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-[11px] uppercase text-muted-foreground">
                    {plan.channel === "voice" ? "Script" : "Message"}
                  </Label>
                  {editing ? (
                    <Textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={8}
                      className="text-sm resize-y"
                    />
                  ) : (
                    <p className="whitespace-pre-line rounded-md border bg-background p-3 text-sm leading-relaxed">{editBody}</p>
                  )}
                </div>

                <div className="flex items-start justify-between gap-2 pt-1">
                  <p className="text-[11px] italic text-muted-foreground border-l-2 border-primary/40 pl-2 flex-1">
                    {plan.rationale}
                  </p>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant={feedback === "up" ? "default" : "ghost"}
                      className="h-7 w-7 p-0"
                      onClick={() => submitFeedback("up")}
                      aria-label="Good draft"
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant={feedback === "down" ? "default" : "ghost"}
                      className="h-7 w-7 p-0"
                      onClick={() => submitFeedback("down")}
                      aria-label="Bad draft"
                    >
                      <ThumbsDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 border-t bg-muted/30 flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditing(!editing)} disabled={saving}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  {editing ? "Done" : "Edit"}
                </Button>
                <div className="flex-1" />
                <Button size="sm" variant="outline" onClick={() => handleSaveDraft(false)} disabled={saving}>
                  Save draft
                </Button>
                <Button size="sm" onClick={() => handleSaveDraft(true)} disabled={saving} title="Saves to Campaigns as scheduled — you confirm recipients before anything sends">
                  {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
                  Save & schedule
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PromptCampaignLauncher;
