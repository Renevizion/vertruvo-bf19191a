import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Plus, Phone, Edit, Trash2, FileText, ArrowRight, Bot, Loader2, Copy, CheckCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function CallTemplates() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [name, setName] = useState("");
  const [template, setTemplate] = useState("");
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewData] = useState({ name: "John Doe", email: "john@example.com", phone: "+1234567890", company: "Acme Inc" });

  const { data: templates, isLoading, refetch } = useQuery({
    queryKey: ["call-templates"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data: workspaceData } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", user.id).limit(1).single();
      if (!workspaceData) throw new Error("No workspace found");
      const { data, error } = await supabase.from("call_templates").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) {
        const defaults = [
          { name: "Welcome Call", template: "Hello {{name}}, this is a courtesy call from {{company}}. We wanted to reach out and see how we can help you today. Is this a good time to talk?", workspace_id: workspaceData.workspace_id },
          { name: "Follow-up Call", template: "Hi {{name}}, I'm calling from {{company}} to follow up on our previous conversation. I wanted to check if you have any questions or if there's anything else we can help you with.", workspace_id: workspaceData.workspace_id },
          { name: "Appointment Reminder", template: "Hello {{name}}, this is a reminder about your upcoming appointment with {{company}}. Please call us back at your earliest convenience to confirm. Thank you!", workspace_id: workspaceData.workspace_id },
          { name: "Quick Check-in", template: "Hi there! We're reaching out from {{company}} to check in and see how everything is going. Feel free to contact us if you need anything.", workspace_id: workspaceData.workspace_id },
        ];
        await supabase.from("call_templates").insert(defaults);
        const { data: newData } = await supabase.from("call_templates").select("*").order("created_at", { ascending: false });
        return newData || [];
      }
      return data;
    },
  });

  const openCreate = () => { setEditingTemplate(null); setName(""); setTemplate(""); setSheetOpen(true); };
  const openEdit = (t: any) => { setEditingTemplate(t); setName(t.name); setTemplate(t.template); setSheetOpen(true); };
  const closeSheet = () => { setSheetOpen(false); setEditingTemplate(null); setName(""); setTemplate(""); };

  const handleSave = async () => {
    if (!name.trim() || !template.trim()) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      if (editingTemplate) {
        const { error } = await supabase.from("call_templates").update({ name, template }).eq("id", editingTemplate.id);
        if (error) throw error;
        toast.success("Template updated");
      } else {
        const { data: workspaceData } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", user.id).limit(1).single();
        if (!workspaceData) throw new Error("No workspace found");
        const { error } = await supabase.from("call_templates").insert({ name, template, workspace_id: workspaceData.workspace_id });
        if (error) throw error;
        toast.success("Template created");
      }
      closeSheet();
      refetch();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    const { error } = await supabase.from("call_templates").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); refetch(); }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const previewTemplate = (t: string | null | undefined) =>
    (t ?? '').replace(/\{\{name\}\}/gi, previewData.name)
     .replace(/\{\{email\}\}/gi, previewData.email)
     .replace(/\{\{phone\}\}/gi, previewData.phone)
     .replace(/\{\{company\}\}/gi, previewData.company);

  const VARS = ["{{name}}", "{{email}}", "{{phone}}", "{{company}}"];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium mb-1">Voice</p>
          <h1 className="text-2xl font-bold tracking-tight">Call Templates</h1>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> New Template
        </Button>
      </div>

      {/* How it works strip */}
      <div className="rounded-xl border bg-muted/30 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">How it works</p>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 text-sm">
          {[
            { step: "1", title: "Write a script", sub: "Use {{variables}} for personalization" },
            { step: "2", title: "Assign to an agent", sub: "AI agents pull the template at call time" },
            { step: "3", title: "Call goes out", sub: "Variables replaced with real lead data" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 flex-1">
              <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">{item.step}</div>
              <div>
                <p className="font-medium leading-tight">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.sub}</p>
              </div>
              {i < 2 && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block ml-auto" />}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><Phone className="h-3 w-3" /><strong>Twilio</strong> — standard phone calls</span>
          <span className="flex items-center gap-1.5"><Bot className="h-3 w-3" /><strong>ElevenLabs</strong> — premium AI voices</span>
        </div>
      </div>

      {/* Template grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !templates?.length ? (
        <div className="rounded-xl border border-dashed p-16 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold text-lg mb-1">No templates yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Create your first call script to start using AI voice agents.</p>
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />Create Template</Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((t: any) => (
            <div
              key={t.id}
              className="group rounded-xl border bg-card hover:border-primary/30 transition-colors overflow-hidden"
            >
              {/* Card header */}
              <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/20">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Phone className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <h3 className="font-semibold truncate">{t.name}</h3>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopy(t.id, t.template)} title="Copy script">
                    {copiedId === t.id ? <CheckCheck className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)} title="Edit">
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(t.id)} title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Script body */}
              <div className="px-5 py-4 space-y-3">
                <div className="rounded-lg bg-muted/40 border px-4 py-3">
                  <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap font-mono">{t.template}</p>
                </div>

                {/* Live preview */}
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1.5">Preview with sample data</p>
                  <p className="text-xs text-muted-foreground leading-relaxed italic">{previewTemplate(t.template)}</p>
                </div>

                {/* Variable chips */}
                <div className="flex flex-wrap gap-1.5">
                  {VARS.filter(v => t.template.includes(v)).map(v => (
                    <Badge key={v} variant="outline" className="text-[10px] font-mono py-0">{v}</Badge>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={(o) => { if (!o) closeSheet(); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0 gap-0">
          <SheetHeader className="px-6 py-5 border-b bg-muted/30 shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-base">{editingTemplate ? "Edit Template" : "New Call Template"}</SheetTitle>
                <SheetDescription className="text-xs mt-0.5">Write a script with variables — the AI replaces them at call time.</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Template Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Welcome Call" className="h-9" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Script *</Label>
              <Textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                placeholder={"Hello {{name}}, this is a call from {{company}}..."}
                rows={7}
                className="font-mono text-sm resize-none"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {VARS.map(v => (
                  <button
                    key={v}
                    type="button"
                    className="text-[10px] font-mono px-2 py-0.5 rounded border border-border bg-muted hover:bg-accent transition-colors"
                    onClick={() => setTemplate(prev => prev + v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Click a variable above to insert it at the end of your script.</p>
            </div>

            {template && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Live Preview</Label>
                <div className="rounded-lg border bg-muted/30 px-4 py-3">
                  <p className="text-sm text-muted-foreground italic leading-relaxed">{previewTemplate(template)}</p>
                </div>
              </div>
            )}
          </div>

          <SheetFooter className="px-6 py-4 border-t bg-muted/20 shrink-0 flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={closeSheet}>Cancel</Button>
            <Button size="sm" disabled={!name.trim() || !template.trim() || saving} onClick={handleSave}>
              {saving ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Saving…</> : editingTemplate ? "Save Changes" : "Create Template"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
