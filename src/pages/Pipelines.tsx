import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { Plus, Pencil, Trash2, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PipelineManager } from "@/components/pipelines/PipelineManager";

interface Pipeline {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_at: string;
}

interface Stage {
  id: string;
  name: string;
  position: number;
  color: string;
  pipeline_id: string;
}

export default function Pipelines() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [stagesDialogOpen, setStagesDialogOpen] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const { toast } = useToast();

  const { data: pipelines, refetch: refetchPipelines } = useQuery({
    queryKey: ['pipelines'],
    queryFn: async () => {
      // Get pipelines with lead count
      const { data, error } = await supabase
        .from('pipelines')
        .select(`
          *,
          leads:leads(count)
        `)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as (Pipeline & { leads: { count: number }[] })[];
    }
  });

  const { data: stages, refetch: refetchStages } = useQuery({
    queryKey: ['pipeline-stages', selectedPipelineId],
    queryFn: async () => {
      if (!selectedPipelineId) return [];
      const { data, error } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', selectedPipelineId)
        .order('position', { ascending: true });
      
      if (error) throw error;
      return data as Stage[];
    },
    enabled: !!selectedPipelineId
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingPipeline) {
      const { error } = await supabase
        .from("pipelines")
        .update({
          name: formData.name,
          description: formData.description || null,
        })
        .eq("id", editingPipeline.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update pipeline",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Pipeline updated successfully",
        });
        resetForm();
        refetchPipelines();
      }
    } else {
      const { error } = await supabase.from("pipelines").insert({
        name: formData.name,
        description: formData.description || null,
        is_default: false,
      });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create pipeline",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Pipeline created successfully",
        });
        resetForm();
        refetchPipelines();
      }
    }
  };

  const handleDelete = async (id: string, isDefault: boolean) => {
    if (isDefault) {
      toast({
        title: "Cannot Delete",
        description: "Cannot delete the default pipeline",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("pipelines")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete pipeline",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Pipeline deleted successfully",
      });
      refetchPipelines();
    }
  };

  const handleEdit = (pipeline: Pipeline) => {
    setEditingPipeline(pipeline);
    setFormData({
      name: pipeline.name,
      description: pipeline.description || "",
    });
    setDialogOpen(true);
  };

  const handleManageStages = (pipelineId: string) => {
    setSelectedPipelineId(pipelineId);
    setStagesDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: "", description: "" });
    setEditingPipeline(null);
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Growth"
        title="Pipeline Management"
        description="Manage multiple pipelines for different workflows."
      />
      <div className="flex items-center justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingPipeline(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Pipeline
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingPipeline ? "Edit Pipeline" : "Create New Pipeline"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="pipeline-name">Pipeline Name *</Label>
                <Input
                  id="pipeline-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Enterprise Sales, SMB Pipeline"
                  required
                />
              </div>
              <div>
                <Label htmlFor="pipeline-description">Description</Label>
                <Textarea
                  id="pipeline-description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Describe this pipeline's purpose..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPipeline ? "Update Pipeline" : "Create Pipeline"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {pipelines?.map((pipeline) => (
          <Card key={pipeline.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-semibold">{pipeline.name}</h3>
                  {pipeline.is_default && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Default</span>
                  )}
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                    {pipeline.leads?.[0]?.count || 0} {pipeline.leads?.[0]?.count === 1 ? 'lead' : 'leads'}
                  </span>
                </div>
                {pipeline.description && (
                  <p className="text-sm text-muted-foreground mb-4">{pipeline.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleManageStages(pipeline.id)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(pipeline)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                {!pipeline.is_default && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Pipeline</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this pipeline? All associated stages will be removed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDelete(pipeline.id, pipeline.is_default)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Stages Management Dialog */}
      <Dialog open={stagesDialogOpen} onOpenChange={setStagesDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Pipeline Stages</DialogTitle>
          </DialogHeader>
          {selectedPipelineId && stages && (
            <PipelineManager 
              stages={stages} 
              pipelineId={selectedPipelineId}
              onUpdate={refetchStages} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
