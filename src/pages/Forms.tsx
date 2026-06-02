import { EmptyState } from "@/components/ui/empty-state";
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Plus, ExternalLink, FileText, ToggleLeft, ToggleRight, Trash2, Code2, BarChart3, Loader2, CheckCircle2, XCircle, Pencil, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreateFormDialog } from "@/components/forms/CreateFormDialog";
import { FormEmbedDialog } from "@/components/forms/FormEmbedDialog";
import { FormABTestManager } from "@/components/forms/FormABTestManager";
import { FormAnalyticsView } from "@/components/forms/FormAnalyticsView";
import { FormMetrics } from "@/components/forms/FormMetrics";
import { FormAutoResponseConfig } from "@/components/forms/FormAutoResponseConfig";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Form {
  id: string;
  name: string;
  description: string | null;
  fields: any[];
  pipeline_id: string | null;
  stage_id: string | null;
  is_active: boolean;
  created_at: string;
}

export default function Forms() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [embedDialogOpen, setEmbedDialogOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [detailForm, setDetailForm] = useState<Form | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("showCreateForm") === "true") {
      setCreateDialogOpen(true);
      searchParams.delete("showCreateForm");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => { fetchForms(); }, []);

  const fetchForms = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: workspace, error: wErr } = await supabase.from("workspaces").select("id").eq("owner_id", user.id).limit(1).maybeSingle();
      if (wErr || !workspace) { setForms([]); setLoading(false); return; }
      const { data, error } = await supabase.from("forms").select("*").eq("workspace_id", workspace.id).order("created_at", { ascending: false });
      if (error) throw error;
      setForms((data || []) as Form[]);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load forms", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleViewEmbed = (form: Form) => { setSelectedForm(form); setEmbedDialogOpen(true); };

  const handleToggleActive = async (formId: string, isActive: boolean) => {
    const { error } = await supabase.from("forms").update({ is_active: !isActive }).eq("id", formId);
    if (error) toast({ title: "Error", description: "Failed to update form", variant: "destructive" });
    else { toast({ title: `Form ${!isActive ? "activated" : "deactivated"}` }); fetchForms(); }
  };

  const handleDelete = async (formId: string) => {
    if (!confirm("Delete this form? This cannot be undone.")) return;
    const { error } = await supabase.from("forms").delete().eq("id", formId);
    if (error) toast({ title: "Error", description: "Failed to delete form", variant: "destructive" });
    else { toast({ title: "Form deleted" }); if (detailForm?.id === formId) setDetailForm(null); fetchForms(); }
  };

  const activeForms = forms.filter(f => f.is_active);
  const inactiveForms = forms.filter(f => !f.is_active);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium mb-0.5">Growth</p>
          <h1 className="text-2xl font-bold tracking-tight">Forms</h1>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Create Form
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3 shrink-0">
        {[
          { label: "Total Forms", value: forms.length, color: "text-foreground" },
          { label: "Active", value: activeForms.length, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Inactive", value: inactiveForms.length, color: "text-muted-foreground" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border bg-card px-4 py-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">{label}</p>
            <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="forms" className="flex-1 flex flex-col min-h-0">
        <TabsList className="shrink-0 w-fit">
          <TabsTrigger value="forms">Forms</TabsTrigger>
          <TabsTrigger value="auto-response">Auto-Response</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="ab-testing">A/B Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="forms" className="flex-1 mt-4 min-h-0">
          {forms.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No forms yet"
              description="Create your first intake form to start capturing leads from anywhere on the web."
              action={<Button onClick={() => setCreateDialogOpen(true)} size="lg" className="gap-2"><Plus className="h-4 w-4" />Create your first form</Button>}
            />
          ) : (
            <div className="flex gap-4 h-full min-h-0">
              {/* Form list */}
              <div className="w-full xl:w-[420px] shrink-0 space-y-3 overflow-y-auto">
                {forms.map((form) => {
                  const fieldCount = Array.isArray(form.fields) ? form.fields.length : 0;
                  const fieldNames = Array.isArray(form.fields) ? form.fields.slice(0, 3).map((f: any) => f.label || f.type) : [];
                  const isSelected = detailForm?.id === form.id;
                  return (
                    <button
                      key={form.id}
                      onClick={() => setDetailForm(form)}
                      className={cn(
                        "w-full text-left rounded-xl border transition-all hover:border-primary/30 hover:bg-muted/20 overflow-hidden",
                        isSelected && "border-primary/50 bg-primary/5"
                      )}
                    >
                      {/* Card header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/10">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <FileText className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <span className="font-semibold text-sm truncate">{form.name}</span>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] gap-1 shrink-0",
                            form.is_active
                              ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                              : "text-muted-foreground"
                          )}
                        >
                          {form.is_active ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
                          {form.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>

                      {/* Card body */}
                      <div className="px-4 py-3 space-y-2">
                        {form.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{form.description}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-1">
                            {fieldNames.map((n, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px] py-0 h-4">{n}</Badge>
                            ))}
                            {fieldCount > 3 && <Badge variant="secondary" className="text-[10px] py-0 h-4">+{fieldCount - 3} more</Badge>}
                          </div>
                          <span className="text-[10px] text-muted-foreground">{fieldCount} field{fieldCount !== 1 ? "s" : ""}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Created {format(new Date(form.created_at), "MMM d, yyyy")}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Detail panel */}
              <div className="hidden xl:flex flex-1 min-w-0">
                {detailForm ? (
                  <div className="w-full rounded-xl border bg-card overflow-hidden flex flex-col">
                    <div className="px-6 py-5 border-b bg-muted/20 shrink-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={cn("text-[10px] gap-1", detailForm.is_active ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                              {detailForm.is_active ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
                              {detailForm.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <h2 className="text-xl font-bold">{detailForm.name}</h2>
                          {detailForm.description && <p className="text-sm text-muted-foreground mt-0.5">{detailForm.description}</p>}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => navigate(`/forms/${detailForm.id}/edit`)}>
                            <Pencil className="h-3.5 w-3.5" />Edit
                          </Button>
                          <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => { navigate(`/forms/${detailForm.id}/edit`); setTimeout(() => { const btn = document.querySelector('[data-preview-btn]') as HTMLButtonElement; btn?.click(); }, 500); }}>
                            <Eye className="h-3.5 w-3.5" />Preview
                          </Button>
                          <Button size="sm" className="gap-1.5 h-8" onClick={() => handleViewEmbed(detailForm)}>
                            <Code2 className="h-3.5 w-3.5" />Embed &amp; Deploy
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 h-8"
                            onClick={() => handleToggleActive(detailForm.id, detailForm.is_active)}
                          >
                            {detailForm.is_active ? <ToggleRight className="h-3.5 w-3.5 text-emerald-500" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                            {detailForm.is_active ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(detailForm.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Deploy callout — shown when form is active */}
                    {detailForm.is_active && (
                      <div className="mx-6 mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-center gap-3">
                        <Code2 className="h-4 w-4 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground">Ready to deploy</p>
                          <p className="text-[11px] text-muted-foreground">Copy the embed code and paste it on your website to start collecting leads.</p>
                        </div>
                        <Button size="sm" className="shrink-0 h-7 text-xs" onClick={() => handleViewEmbed(detailForm)}>Get code</Button>
                      </div>
                    )}

                    {/* Fields list */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Fields ({Array.isArray(detailForm.fields) ? detailForm.fields.length : 0})</p>
                        <div className="space-y-2">
                          {Array.isArray(detailForm.fields) && detailForm.fields.length > 0 ? (
                            detailForm.fields.map((field: any, i: number) => (
                              <div key={i} className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-2.5">
                                <div className="flex items-center gap-2.5">
                                  <span className="text-[10px] text-muted-foreground font-mono w-5 text-right">{i + 1}</span>
                                  <span className="text-sm font-medium">{field.label || field.type}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-[10px]">{field.type}</Badge>
                                  {field.required && <Badge variant="outline" className="text-[10px] border-amber-400/40 bg-amber-400/10 text-amber-600 dark:text-amber-400">Required</Badge>}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No fields configured</p>
                          )}
                        </div>
                      </div>

                      {/* Metrics */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Analytics</p>
                        <FormMetrics formId={detailForm.id} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full rounded-xl border border-dashed flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">Select a form to view details and analytics</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="auto-response" className="mt-4 space-y-4">
          {forms.length === 0 ? (
            <EmptyState icon={FileText} title="No forms to automate" description="Create an intake form first, then configure the response that follows each submission." />
          ) : (
            <div className="space-y-4">
              {forms.map((form) => (
                <div key={form.id} className="rounded-xl border bg-card overflow-hidden">
                  <div className="px-5 py-3 border-b bg-muted/20 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">{form.name}</span>
                    <Badge variant="outline" className={cn("text-[10px] ml-auto", form.is_active ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                      {form.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="p-5">
                    <FormAutoResponseConfig formId={form.id} initialConfig={(form as any).auto_response_config} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="mt-4 space-y-4">
          {forms.length === 0 ? (
            <EmptyState icon={BarChart3} title="Analytics will appear after launch" description="Once a form is active, views, submissions, and conversion signals will collect here." />
          ) : (
            <div className="space-y-6">
              {forms.map((form) => (
                <div key={form.id} className="rounded-xl border bg-card overflow-hidden">
                  <div className="px-5 py-3 border-b bg-muted/20 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">{form.name}</span>
                  </div>
                  <div className="p-5 space-y-4">
                    <FormMetrics formId={form.id} />
                    <FormAnalyticsView formId={form.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ab-testing" className="mt-4 space-y-4">
          {forms.length === 0 ? (
            <EmptyState icon={FileText} title="No experiments yet" description="Create a form before testing alternate copy, fields, or submission flows." />
          ) : (
            <div className="space-y-4">
              {forms.map((form) => (
                <div key={form.id} className="rounded-xl border bg-card overflow-hidden">
                  <div className="px-5 py-3 border-b bg-muted/20 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">{form.name}</span>
                  </div>
                  <div className="p-5">
                    <FormABTestManager formId={form.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreateFormDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} onSuccess={fetchForms} />
      {selectedForm && <FormEmbedDialog open={embedDialogOpen} onOpenChange={setEmbedDialogOpen} form={selectedForm} />}
    </div>
  );
}
