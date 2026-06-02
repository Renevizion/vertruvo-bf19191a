import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Star, Copy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  nodes: any;
  edges: any;
  trigger_type: string;
  is_featured: boolean;
  use_count: number;
}

export const WorkflowTemplateLibrary = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    category: "",
  });

  const { data: templates } = useQuery({
    queryKey: ["workflow-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_config")
        .select("*")
        .eq("key", "workflow_templates")
        .single();

      if (error && error.code !== "PGRST116") throw error;
      // The value is directly the array, not nested in templates property
      return (data?.value as any) || [];
    },
  });

  const { data: workflows } = useQuery({
    queryKey: ["all-workflows"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflows")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const publishTemplate = useMutation({
    mutationFn: async (workflowId: string) => {
      const workflow = workflows?.find((w) => w.id === workflowId);
      if (!workflow) throw new Error("Workflow not found");

      const template: WorkflowTemplate = {
        id: crypto.randomUUID(),
        name: newTemplate.name,
        description: newTemplate.description,
        category: newTemplate.category,
        nodes: workflow.nodes,
        edges: workflow.edges,
        trigger_type: workflow.trigger_type,
        is_featured: false,
        use_count: 0,
      };

      const currentTemplates = templates || [];
      const { error } = await supabase
        .from("platform_config")
        .upsert({
          key: "workflow_templates",
          value: [...currentTemplates, template] as any,
          description: "Published workflow templates",
        } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-templates"] });
      setIsDialogOpen(false);
      setNewTemplate({ name: "", description: "", category: "" });
      toast.success("Template published successfully");
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const updatedTemplates = (templates || []).filter(
        (t: WorkflowTemplate) => t.id !== templateId
      );

      const { error } = await supabase
        .from("platform_config")
        .upsert({
          key: "workflow_templates",
          value: updatedTemplates as any,
          description: "Published workflow templates",
        } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-templates"] });
      toast.success("Template deleted");
    },
  });

  const toggleFeatured = useMutation({
    mutationFn: async (templateId: string) => {
      const updatedTemplates = (templates || []).map((t: WorkflowTemplate) =>
        t.id === templateId ? { ...t, is_featured: !t.is_featured } : t
      );

      const { error } = await supabase
        .from("platform_config")
        .upsert({
          key: "workflow_templates",
          value: updatedTemplates as any,
          description: "Published workflow templates",
        } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-templates"] });
    },
  });

  const categories = Array.from(
    new Set((templates || []).map((t: WorkflowTemplate) => t.category))
  ).filter(Boolean) as string[];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Workflow Template Library
            </CardTitle>
            <CardDescription>
              Publish and manage workflow templates for all workspaces to use
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Publish Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Publish Workflow as Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="workflow">Select Workflow</Label>
                  <select
                    id="workflow"
                    className="w-full mt-1 rounded-md border p-2"
                    value={selectedWorkflow || ""}
                    onChange={(e) => setSelectedWorkflow(e.target.value)}
                  >
                    <option value="">Choose a workflow...</option>
                    {workflows?.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    value={newTemplate.name}
                    onChange={(e) =>
                      setNewTemplate({ ...newTemplate, name: e.target.value })
                    }
                    placeholder="Lead Nurturing Campaign"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newTemplate.description}
                    onChange={(e) =>
                      setNewTemplate({ ...newTemplate, description: e.target.value })
                    }
                    placeholder="Automatically nurture new leads with a series of follow-up emails..."
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={newTemplate.category}
                    onChange={(e) =>
                      setNewTemplate({ ...newTemplate, category: e.target.value })
                    }
                    placeholder="Sales, Marketing, Support, etc."
                  />
                </div>
                <Button
                  onClick={() => selectedWorkflow && publishTemplate.mutate(selectedWorkflow)}
                  disabled={
                    !selectedWorkflow || !newTemplate.name || !newTemplate.description
                  }
                  className="w-full"
                >
                  Publish Template
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {categories.map((category) => (
              <Badge key={category} variant="secondary">
                {category}
              </Badge>
            ))}
          </div>
        )}

        {/* Templates Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates && templates.length > 0 ? (
            (templates as WorkflowTemplate[]).map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {template.category}
                      </Badge>
                    </div>
                    {template.is_featured && (
                      <Star className="h-5 w-5 fill-primary text-primary" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {template.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Used {template.use_count} times</span>
                    <span>{template.trigger_type}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => toggleFeatured.mutate(template.id)}
                    >
                      <Star
                        className={`h-4 w-4 mr-1 ${
                          template.is_featured ? "fill-current" : ""
                        }`}
                      />
                      {template.is_featured ? "Unfeature" : "Feature"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTemplate.mutate(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No templates published yet</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
