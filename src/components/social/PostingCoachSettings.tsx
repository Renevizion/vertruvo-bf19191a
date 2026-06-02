import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Mail, MessageSquare, Bell } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId: string | null;
}

export function PostingCoachSettings({ open, onOpenChange, workspaceId }: Props) {
  const [target, setTarget] = useState(3);
  const [channels, setChannels] = useState({ inapp: true, email: true, sms: false });
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !workspaceId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("social_cadence_settings").select("*").eq("workspace_id", workspaceId).maybeSingle();
      if (data) {
        setTarget(data.target_posts_per_week || 3);
        const ch = (data.channels as any) || {};
        setChannels({
          inapp: ch.inapp !== false,
          email: !!ch.email,
          sms: !!ch.sms,
        });
        setPhone(data.notify_phone || "");
        setEmail(data.notify_email || "");
      }
      setLoading(false);
    })();
  }, [open, workspaceId]);

  const save = async () => {
    if (!workspaceId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("social_cadence_settings").upsert({
        workspace_id: workspaceId,
        target_posts_per_week: target,
        channels,
        notify_phone: phone || null,
        notify_email: email || null,
      });
      if (error) throw error;
      toast.success("Coach settings saved");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Posting Coach
          </DialogTitle>
          <DialogDescription>How often should we nudge you, and where?</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div>
            <Label className="text-sm">Target posts per week</Label>
            <div className="flex items-center gap-3 mt-2">
              <Slider value={[target]} min={1} max={14} step={1} onValueChange={(v) => setTarget(v[0])} className="flex-1" />
              <span className="text-sm font-semibold w-8 text-right">{target}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Coach drafts a post when you fall behind this cadence.</p>
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2"><Bell className="h-3.5 w-3.5" /> In-app nudges</Label>
              <Switch checked={channels.inapp} onCheckedChange={(v) => setChannels((c) => ({ ...c, inapp: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> Email</Label>
              <Switch checked={channels.email} onCheckedChange={(v) => setChannels((c) => ({ ...c, email: v }))} />
            </div>
            {channels.email && (
              <Input placeholder="Override email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} className="h-8 text-xs" />
            )}
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2"><MessageSquare className="h-3.5 w-3.5" /> SMS (Pro+)</Label>
              <Switch checked={channels.sms} onCheckedChange={(v) => setChannels((c) => ({ ...c, sms: v }))} />
            </div>
            {channels.sms && (
              <Input placeholder="+1 555 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-8 text-xs" />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || loading}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
