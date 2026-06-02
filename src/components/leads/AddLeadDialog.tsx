import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, UserPlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { UpgradeDialog } from "@/components/subscription/UpgradeDialog";

interface AddLeadDialogProps {
  defaultStageId?: string;
  onSuccess: () => void;
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

export const AddLeadDialog = ({ defaultStageId, onSuccess, externalOpen, onExternalOpenChange }: AddLeadDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const { toast } = useToast();
  const { canCreate, getUsage, getLimit, tier } = useUsageLimits();

  const isControlled = externalOpen !== undefined;
  const open = isControlled ? externalOpen : internalOpen;
  const setOpen = isControlled ? (onExternalOpenChange || (() => {})) : setInternalOpen;

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    source: "",
    value: "",
    notes: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate('leads')) {
      setUpgradeOpen(true);
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data: workspaces } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .limit(1);
      if (!workspaces || workspaces.length === 0) throw new Error("No workspace found");
      const { error } = await supabase.from("leads").insert({
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        source: formData.source || null,
        value: formData.value ? parseFloat(formData.value) : 0,
        notes: formData.notes || null,
        stage_id: defaultStageId || null,
        workspace_id: workspaces[0].workspace_id
      });
      if (error) throw error;
      toast({ title: "Lead added" });
      setFormData({ name: "", email: "", phone: "", source: "", value: "", notes: "" });
      setOpen(false);
      onSuccess();
    } catch (error) {
      toast({ title: "Error", description: "Failed to add lead", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!isControlled && (
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Add Lead</span>
        </Button>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 gap-0">
          <SheetHeader className="px-6 py-5 border-b bg-muted/30 shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <UserPlus className="h-4 w-4 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-base">Add New Lead</SheetTitle>
                <SheetDescription className="text-xs mt-0.5">Capture contact info and drop them into your pipeline.</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Full name"
                  className="h-9"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="h-9"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Source</Label>
                  <Input
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    placeholder="Website, Referral…"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Deal Value ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="0.00"
                    className="h-9"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any context about this lead…"
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>

            <SheetFooter className="px-6 py-4 border-t bg-muted/20 shrink-0 flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={loading}>
                {loading ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Adding…</> : "Add Lead"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        currentTier={tier}
        limitHit={`You've used ${getUsage('leads')} of ${getLimit('leads')} leads included in your plan.`}

      />
    </>
  );
};
