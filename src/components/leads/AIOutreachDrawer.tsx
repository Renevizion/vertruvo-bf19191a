import { useEffect, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, Send, Pencil, RefreshCw, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MarkdownText } from "@/components/automations/MarkdownText";
import { cn } from "@/lib/utils";

interface AIOutreachDrawerProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  leadId: string;
  leadName: string;
  leadEmail?: string;
  onSent?: () => void;
}

type Phase = "drafting" | "review" | "editing" | "sending";

const angles = [
  { id: "default", label: "Standard" },
  { id: "shorter", label: "Shorter" },
  { id: "friendlier", label: "Friendlier" },
  { id: "objection", label: "Handle objection" },
] as const;

export function AIOutreachDrawer({
  open, onOpenChange, leadId, leadName, leadEmail, onSent,
}: AIOutreachDrawerProps) {
  const [phase, setPhase] = useState<Phase>("drafting");
  const [draft, setDraft] = useState("");
  const [angle, setAngle] = useState<string>("default");
  const [error, setError] = useState<string | null>(null);

  // Generate (or regenerate) the draft
  const generate = async (chosenAngle: string) => {
    setPhase("drafting");
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-lead-outreach", {
        body: { leadId, dryRun: true, angle: chosenAngle === "default" ? undefined : chosenAngle },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setDraft(data.emailBody || "");
      setPhase("review");
    } catch (e: any) {
      setError(e?.message || "Could not draft email");
      setPhase("review");
    }
  };

  useEffect(() => {
    if (open) {
      setAngle("default");
      setDraft("");
      generate("default");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, leadId]);

  const handleSend = async () => {
    if (!draft.trim()) return;
    setPhase("sending");
    try {
      const { data, error } = await supabase.functions.invoke("ai-lead-outreach", {
        body: { leadId, emailBody: draft.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Email sent to ${leadEmail}`);
      onSent?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Could not send");
      setPhase("review");
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => phase !== "sending" && onOpenChange(o)}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            AI Outreach
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <h3 className="text-base font-semibold">To {leadName}</h3>
            {leadEmail && <span className="text-xs text-muted-foreground truncate">· {leadEmail}</span>}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Angle chips */}
          <div className="flex flex-wrap gap-1.5">
            {angles.map((a) => (
              <button
                key={a.id}
                type="button"
                disabled={phase === "drafting" || phase === "sending"}
                onClick={() => { setAngle(a.id); generate(a.id); }}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[11px] border transition-colors",
                  angle === a.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border/60 hover:bg-accent",
                  (phase === "drafting" || phase === "sending") && "opacity-50 cursor-not-allowed",
                )}
              >
                {a.label}
              </button>
            ))}
            <button
              type="button"
              disabled={phase === "drafting" || phase === "sending"}
              onClick={() => generate(angle)}
              className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border border-border/60 hover:bg-accent disabled:opacity-50"
            >
              <RefreshCw className="h-3 w-3" /> Regenerate
            </button>
          </div>

          {/* Draft surface */}
          <div className="rounded-xl border bg-card">
            <div className="px-4 py-2.5 border-b text-xs text-muted-foreground flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" />
              Email body preview
            </div>
            {phase === "drafting" ? (
              <div className="p-5 space-y-2.5 animate-pulse">
                <div className="h-3 bg-muted rounded w-5/6" />
                <div className="h-3 bg-muted rounded w-4/6" />
                <div className="h-3 bg-muted rounded w-3/4" />
                <p className="text-xs text-primary inline-flex items-center gap-1.5 mt-3">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Drafting based on this lead's history…
                </p>
              </div>
            ) : phase === "editing" ? (
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={10}
                className="border-0 rounded-none resize-y focus-visible:ring-0"
                placeholder="Write the email body…"
              />
            ) : (
              <div className="p-5 text-sm leading-relaxed">
                {error ? (
                  <p className="text-destructive">{error}</p>
                ) : draft ? (
                  <MarkdownText content={draft} />
                ) : (
                  <p className="text-muted-foreground italic">No draft yet.</p>
                )}
              </div>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground">
            This will send from your business email template. The full body is logged to the lead's timeline.
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t flex items-center gap-2 bg-muted/30">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPhase(phase === "editing" ? "review" : "editing")}
            disabled={phase === "drafting" || phase === "sending" || !draft}
          >
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            {phase === "editing" ? "Done editing" : "Edit"}
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={phase === "sending"}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSend} disabled={phase !== "review" && phase !== "editing" || !draft.trim()}>
            {phase === "sending"
              ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Sending…</>
              : <><Send className="h-3.5 w-3.5 mr-1.5" /> Send</>}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
