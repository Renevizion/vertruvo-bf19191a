import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { UpgradeDialog } from "@/components/subscription/UpgradeDialog";
import { FileText, Loader2 } from "lucide-react";

interface CreateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Pipeline {
  id: string;
  name: string;
  workspace: { name: string };
}

interface Stage {
  id: string;
  name: string;
  pipeline_id: string;
}

const DEFAULT_FIELDS = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'phone', label: 'Phone', type: 'tel', required: false },
  { name: 'company', label: 'Company', type: 'text', required: false },
  { name: 'notes', label: 'Message', type: 'textarea', required: false },
];

export function CreateFormDialog({ open, onOpenChange, onSuccess }: CreateFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const { canCreate, getUsage, getLimit, tier } = useUsageLimits();
  const [formData, setFormData] = useState({ name: "", description: "", pipeline_id: "", stage_id: "" });
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>(DEFAULT_FIELDS.map(f => f.name));
  const { toast } = useToast();

  useEffect(() => { if (open) fetchPipelines(); }, [open]);
  useEffect(() => { if (formData.pipeline_id) fetchStages(formData.pipeline_id); }, [formData.pipeline_id]);

  const fetchPipelines = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: workspaces } = await supabase.from('workspaces').select('id').eq('owner_id', user.id).limit(1).single();
      if (!workspaces) return;
      const { data } = await supabase.from('pipelines').select('id, name, workspace:workspaces(name)').eq('workspace_id', workspaces.id).order('name');
      if (data) {
        setPipelines(data);
        if (data.length > 0 && !formData.pipeline_id) {
          const salesPipeline = data.find(p => p.name.toLowerCase().includes('sales'));
          setFormData(prev => ({ ...prev, pipeline_id: (salesPipeline || data[0]).id }));
        }
      }
    } catch {}
  };

  const fetchStages = async (pipelineId: string) => {
    const { data } = await supabase.from('pipeline_stages').select('id, name, pipeline_id').eq('pipeline_id', pipelineId).order('position');
    if (data) {
      setStages(data);
      if (data.length > 0) setFormData(prev => ({ ...prev, stage_id: data[0].id }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate('forms')) { setUpgradeOpen(true); return; }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data: workspaces, error: workspaceError } = await supabase.from('workspaces').select('id').eq('owner_id', user.id).limit(1).single();
      if (workspaceError || !workspaces) throw new Error("No workspace found");
      const fields = DEFAULT_FIELDS.filter(f => selectedFields.includes(f.name));
      const { error } = await supabase.from('forms').insert({
        workspace_id: workspaces.id,
        name: formData.name,
        description: formData.description || null,
        fields: fields,
        pipeline_id: formData.pipeline_id || null,
        stage_id: formData.stage_id || null,
        auto_response_config: {
          enabled: true,
          mode: 'template',
          templateMessage: `Hi {{name}},\n\nThank you for reaching out! We received your submission and someone from our team will be in touch shortly.\n\nBest regards,\n{{business_name}}`,
        } as any,
      });
      if (error) throw error;
      toast({ title: "Form created" });
      setFormData({ name: "", description: "", pipeline_id: "", stage_id: "" });
      setSelectedFields(DEFAULT_FIELDS.map(f => f.name));
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to create form", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleField = (fieldName: string) => {
    setSelectedFields(prev => prev.includes(fieldName) ? prev.filter(f => f !== fieldName) : [...prev, fieldName]);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 gap-0">
          <SheetHeader className="px-6 py-5 border-b bg-muted/30 shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-base">Create Form</SheetTitle>
                <SheetDescription className="text-xs mt-0.5">Design intake fields and route submissions into your pipeline.</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Form Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Contact Form"
                  className="h-9"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  rows={3}
                  className="resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pipeline</Label>
                <Select value={formData.pipeline_id} onValueChange={(value) => setFormData({ ...formData, pipeline_id: value })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select pipeline" /></SelectTrigger>
                  <SelectContent>
                    {pipelines.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {stages.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Initial Stage</Label>
                  <Select value={formData.stage_id} onValueChange={(value) => setFormData({ ...formData, stage_id: value })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select stage" /></SelectTrigger>
                    <SelectContent>
                      {stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Form Fields</Label>
                <div className="space-y-2.5 mt-1">
                  {DEFAULT_FIELDS.map((field) => (
                    <div key={field.name} className="flex items-center gap-3">
                      <Checkbox
                        id={field.name}
                        checked={selectedFields.includes(field.name)}
                        onCheckedChange={() => toggleField(field.name)}
                        disabled={field.required}
                      />
                      <Label htmlFor={field.name} className="font-normal cursor-pointer text-sm">
                        {field.label} {field.required && <span className="text-destructive text-xs">required</span>}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <SheetFooter className="px-6 py-4 border-t bg-muted/20 shrink-0 flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={loading}>
                {loading ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Creating…</> : "Create Form"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        currentTier={tier}
        limitHit={`You've used ${getUsage('forms')} of ${getLimit('forms')} forms included in your plan.`}

      />
    </>
  );
}
