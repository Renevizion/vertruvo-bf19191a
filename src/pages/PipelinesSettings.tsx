import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PipelineManager } from "@/components/pipelines/PipelineManager";
import { Trash2, Pencil } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Pipeline {
  id: string;
  name: string;
  description: string | null;
  workspace_id: string;
  created_at: string;
  leads?: { count: number }[];
}

interface Stage {
  id: string;
  name: string;
  position: number;
  color: string;
}

export default function PipelinesSettings() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [stages, setStages] = useState<Record<string, Stage[]>>({});
  const [selectedPipeline, setSelectedPipeline] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pipelineToDelete, setPipelineToDelete] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchPipelines();
  }, []);

  const fetchPipelines = async () => {
    // Let RLS handle workspace filtering
    const { data, error } = await supabase
      .from('pipelines')
      .select(`
        *,
        leads:leads(count)
      `)
      .order('name');

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch pipelines",
        variant: "destructive",
      });
      return;
    }

    if (data && data.length > 0) {
      setPipelines(data as any);
      setSelectedPipeline(data[0].id);
      fetchAllStages(data.map(p => p.id));
    }
  };

  const fetchAllStages = async (pipelineIds: string[]) => {
    const { data } = await supabase
      .from('pipeline_stages')
      .select('*')
      .in('pipeline_id', pipelineIds)
      .order('position');

    if (data) {
      const stagesByPipeline: Record<string, Stage[]> = {};
      data.forEach(stage => {
        if (!stagesByPipeline[stage.pipeline_id!]) {
          stagesByPipeline[stage.pipeline_id!] = [];
        }
        stagesByPipeline[stage.pipeline_id!].push(stage);
      });
      setStages(stagesByPipeline);
    }
  };

  const handleDeletePipeline = async () => {
    if (!pipelineToDelete) return;

    const { error } = await supabase
      .from('pipelines')
      .delete()
      .eq('id', pipelineToDelete);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete pipeline",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Pipeline deleted successfully",
    });

    setDeleteDialogOpen(false);
    setPipelineToDelete(null);
    fetchPipelines();
  };

  const handleEditPipeline = (pipeline: Pipeline) => {
    setEditingPipeline(pipeline);
    setEditName(pipeline.name);
    setEditDescription(pipeline.description || "");
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingPipeline) return;

    const { error } = await supabase
      .from('pipelines')
      .update({
        name: editName,
        description: editDescription,
      })
      .eq('id', editingPipeline.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update pipeline",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Pipeline updated successfully",
    });

    setEditDialogOpen(false);
    setEditingPipeline(null);
    fetchPipelines();
  };

  const selectedPipelineData = pipelines.find(p => p.id === selectedPipeline);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pipeline Management</h1>
        <p className="text-muted-foreground">Manage your sales pipelines and stages</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Your Pipelines</CardTitle>
            <CardDescription>Select a pipeline to manage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {pipelines.map(pipeline => (
              <div key={pipeline.id} className="space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <Button
                    variant={selectedPipeline === pipeline.id ? "default" : "ghost"}
                    className="flex-1 justify-start"
                    onClick={() => setSelectedPipeline(pipeline.id)}
                  >
                    {pipeline.name}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditPipeline(pipeline)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setPipelineToDelete(pipeline.id);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground pl-3">
                  {pipeline.leads?.[0]?.count || 0} {pipeline.leads?.[0]?.count === 1 ? 'lead' : 'leads'}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="md:col-span-3">
          {selectedPipelineData ? (
            <PipelineManager
              stages={stages[selectedPipelineData.id] || []}
              pipelineId={selectedPipelineData.id}
              onUpdate={() => fetchAllStages(pipelines.map(p => p.id))}
            />
          ) : (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  Select a pipeline to manage stages
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pipeline</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this pipeline? This action cannot be undone.
              All associated leads will need to be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePipeline}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pipeline</DialogTitle>
            <DialogDescription>Update the pipeline name and description</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Pipeline name"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Pipeline description (optional)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
