import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Play, Save, Trash2, Archive, FileText, BarChart3, Lightbulb, ChevronRight, Circle, MoreVertical, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WorkflowCanvas } from "@/components/automations/WorkflowCanvas";
import { WorkflowList } from "@/components/automations/WorkflowList";
import { WorkflowRunHistory } from "@/components/automations/WorkflowRunHistory";
import { WorkflowTemplates } from "@/components/automations/WorkflowTemplates";
import { WorkflowAIAssistant } from "@/components/automations/WorkflowAIAssistant";
import { WorkflowRecommendations } from "@/components/automations/WorkflowRecommendations";
import { WorkflowAnalyticsView } from "@/components/automations/WorkflowAnalyticsView";
import { WorkflowTrash } from "@/components/automations/WorkflowTrash";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { UpgradeDialog } from "@/components/subscription/UpgradeDialog";
import { cn } from "@/lib/utils";

const Automations = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("workflows");
  const { canCreate } = useUsageLimits();
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const [newWorkflowDescription, setNewWorkflowDescription] = useState("");
  const [contextualHelp, setContextualHelp] = useState<{ nodeType: string; nodeLabel: string; nodeId: string } | null>(null);

  useEffect(() => {
    if (searchParams.get('showCreateWorkflow') === 'true') {
      setIsCreateDialogOpen(true);
      searchParams.delete('showCreateWorkflow');
      setSearchParams(searchParams, { replace: true });
    }
    if (searchParams.get('showQuickAutomation') === 'true') {
      setActiveTab('templates');
      searchParams.delete('showQuickAutomation');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: workspace } = useQuery({
    queryKey: ['user-workspace', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', session!.user.id)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ? { workspace_id: data.id } : null;
    },
  });

  const { data: workflows, isLoading } = useQuery({
    queryKey: ['workflows', workspace?.workspace_id],
    enabled: !!workspace?.workspace_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('workspace_id', workspace!.workspace_id)
        .is('is_deleted', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: deletedWorkflows } = useQuery({
    queryKey: ['deleted-workflows', workspace?.workspace_id],
    enabled: !!workspace?.workspace_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('workspace_id', workspace!.workspace_id)
        .eq('is_deleted', true)
        .order('deleted_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createWorkflowMutation = useMutation({
    mutationFn: async () => {
      if (!canCreate('workflows')) {
        setUpgradeOpen(true);
        throw new Error('UPGRADE_NEEDED');
      }
      if (!workspace?.workspace_id) throw new Error('No workspace found');
      const { data, error } = await supabase
        .from('workflows')
        .insert({
          workspace_id: workspace.workspace_id,
          name: newWorkflowName,
          description: newWorkflowDescription,
          trigger_type: 'manual',
          nodes: [],
          edges: [],
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      setSelectedWorkflowId(data.id);
      setIsCreateDialogOpen(false);
      setNewWorkflowName("");
      setNewWorkflowDescription("");
      toast({ title: "Workflow created", description: "Your automation workflow has been created" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create workflow", variant: "destructive" });
    },
  });

  const deleteWorkflowMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('workflows')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      queryClient.invalidateQueries({ queryKey: ['deleted-workflows'] });
      setSelectedWorkflowId(null);
      toast({ title: "Workflow moved to trash", description: "You can restore it from the Trash tab" });
    },
  });

  const selectedWorkflow = workflows?.find(w => w.id === selectedWorkflowId);
  const activeCount = workflows?.filter(w => w.is_active).length ?? 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading workflows...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden gap-0">
      {/* Top bar */}
      <div className="flex items-center justify-between px-0 pb-3 shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium mb-0.5">Operations</p>
            <h1 className="text-2xl font-bold tracking-tight leading-none">Automations</h1>
          </div>
          {activeCount > 0 && (
            <Badge className="bg-emerald-600 text-white text-[10px] h-5 px-2 rounded-full">
              {activeCount} active
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Tab switcher — compact pill */}
          <div className="hidden sm:flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
            {[
              { value: "workflows", icon: Zap, label: "Workflows" },
              { value: "templates", icon: FileText, label: "Templates" },
              { value: "analytics", icon: BarChart3, label: "Analytics" },
              { value: "recommendations", icon: Lightbulb, label: "Tips" },
              { value: "trash", icon: Archive, label: "Trash" },
            ].map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => setActiveTab(value)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  activeTab === value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          <Sheet open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <SheetTrigger asChild>
              <Button size="sm" className="gap-1.5 h-8">
                <Plus className="h-3.5 w-3.5" />
                New Workflow
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-lg">
              <SheetHeader>
                <SheetTitle>Create Workflow</SheetTitle>
                <SheetDescription>Give your automation a name and describe what it should do.</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 py-6">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Workflow Name *</Label>
                  <Input
                    value={newWorkflowName}
                    onChange={(e) => setNewWorkflowName(e.target.value)}
                    placeholder="e.g., Lead Follow-up"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</Label>
                  <Textarea
                    value={newWorkflowDescription}
                    onChange={(e) => setNewWorkflowDescription(e.target.value)}
                    placeholder="What does this workflow do?"
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>
              <SheetFooter className="gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => createWorkflowMutation.mutate()}
                  disabled={!newWorkflowName || createWorkflowMutation.isPending}
                >
                  Create
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {/* WORKFLOWS TAB — full split layout */}
        {activeTab === "workflows" && (
          <div className="h-full flex gap-3 overflow-hidden">
            {/* Left: slim workflow list */}
            <div className="w-[200px] shrink-0 flex flex-col gap-2 overflow-y-auto">
              {(!workflows || workflows.length === 0) ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-2">
                  <Zap className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">No workflows yet</p>
                  <Button variant="ghost" size="sm" className="mt-2 text-xs h-7" onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-3 w-3 mr-1" />Create one
                  </Button>
                </div>
              ) : (
                workflows.map((wf) => (
                  <button
                    key={wf.id}
                    onClick={() => setSelectedWorkflowId(wf.id)}
                    className={cn(
                      "w-full text-left rounded-xl border px-3 py-2.5 transition-all group",
                      selectedWorkflowId === wf.id
                        ? "border-primary/50 bg-primary/5"
                        : "bg-card hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Circle className={cn("h-2 w-2 shrink-0 fill-current", wf.is_active ? "text-emerald-500" : "text-muted-foreground/30")} />
                      <span className="text-xs font-semibold truncate flex-1">{wf.name}</span>
                    </div>
                    {wf.description && (
                      <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed pl-4">{wf.description}</p>
                    )}
                    <div className="flex items-center gap-1 mt-1.5 pl-4">
                      <Badge variant="outline" className={cn("text-[9px] h-4 px-1.5", wf.is_active ? "border-emerald-400/40 text-emerald-600" : "text-muted-foreground")}>
                        {wf.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Center: canvas — dominant */}
            <div className="flex-1 min-w-0 rounded-xl border overflow-hidden flex flex-col">
              {selectedWorkflow ? (
                <WorkflowCanvas
                  workflow={selectedWorkflow}
                  onUpdate={() => queryClient.invalidateQueries({ queryKey: ['workflows'] })}
                  onNodeClick={(nodeType, nodeLabel, nodeId) => {
                    setContextualHelp({ nodeType, nodeLabel, nodeId });
                  }}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-4 bg-muted/10">
                  <div className="text-center">
                    <Zap className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-base font-semibold text-muted-foreground">Select a workflow to edit</p>
                    <p className="text-sm text-muted-foreground/60 mt-1">Or create a new one to get started</p>
                  </div>
                  <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Your First Workflow
                  </Button>
                </div>
              )}
            </div>

            {/* Right: run history — only when workflow selected */}
            {selectedWorkflow && (
              <div className="w-[200px] shrink-0 rounded-xl border overflow-y-auto p-3">
                <WorkflowRunHistory workflowId={selectedWorkflow.id} />
              </div>
            )}
          </div>
        )}

        {/* TEMPLATES TAB */}
        {activeTab === "templates" && (
          <div className="h-full overflow-auto">
            <WorkflowTemplates
              onSelectTemplate={(template) => {
                if (!workspace?.workspace_id) {
                  toast({ title: "Error", description: "No workspace found", variant: "destructive" });
                  return;
                }
                supabase
                  .from('workflows')
                  .insert({
                    workspace_id: workspace.workspace_id,
                    name: template.name,
                    description: template.description,
                    trigger_type: 'manual',
                    nodes: template.nodes,
                    edges: template.edges,
                    is_active: false,
                  })
                  .select()
                  .single()
                  .then(({ data, error }) => {
                    if (error) {
                      toast({ title: "Error", description: "Failed to create workflow from template", variant: "destructive" });
                    } else {
                      queryClient.invalidateQueries({ queryKey: ['workflows'] });
                      setSelectedWorkflowId(data.id);
                      setActiveTab("workflows");
                      toast({ title: "Template Applied", description: "Workflow created. Configure and activate it!" });
                    }
                  });
              }}
            />
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === "analytics" && (
          <div className="h-full overflow-auto">
            {selectedWorkflow ? (
              <WorkflowAnalyticsView workflowId={selectedWorkflow.id} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <BarChart3 className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Select a workflow in the Workflows tab to view its analytics</p>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("workflows")}>Go to Workflows</Button>
              </div>
            )}
          </div>
        )}

        {/* RECOMMENDATIONS TAB */}
        {activeTab === "recommendations" && (
          <div className="h-full overflow-auto">
            {selectedWorkflow ? (
              <WorkflowRecommendations workflowId={selectedWorkflow.id} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <Lightbulb className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Select a workflow to get AI recommendations</p>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("workflows")}>Go to Workflows</Button>
              </div>
            )}
          </div>
        )}

        {/* TRASH TAB */}
        {activeTab === "trash" && (
          <div className="h-full overflow-auto">
            <div className="max-w-4xl mx-auto">
              <WorkflowTrash workflows={deletedWorkflows || []} />
            </div>
          </div>
        )}
      </div>

      <WorkflowAIAssistant
        currentWorkflow={selectedWorkflow}
        contextualHelp={contextualHelp}
        onCloseContextualHelp={() => setContextualHelp(null)}
        onValidateWorkflow={async () => {
          queryClient.invalidateQueries({ queryKey: ['workflows'] });
        }}
        onApplyWorkflow={(workflow) => {
          if (!workspace?.workspace_id) return;
          supabase
            .from('workflows')
            .insert({
              workspace_id: workspace.workspace_id,
              name: workflow.name,
              description: workflow.description,
              trigger_type: workflow.trigger_type || 'manual',
              nodes: workflow.nodes,
              edges: workflow.edges,
              is_active: false,
            })
            .select()
            .single()
            .then(({ data, error }) => {
              if (error) {
                toast({ title: "Error", description: "Failed to apply workflow", variant: "destructive" });
              } else {
                queryClient.invalidateQueries({ queryKey: ['workflows'] });
                setSelectedWorkflowId(data.id);
                setActiveTab("workflows");
                toast({ title: "Workflow Applied", description: "AI-generated workflow added. Configure and activate it!" });
              }
            });
        }}
      />

      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} feature="workflows" />
    </div>
  );
};

export default Automations;
