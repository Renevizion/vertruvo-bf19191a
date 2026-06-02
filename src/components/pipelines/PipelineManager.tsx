import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Stage {
  id: string;
  name: string;
  position: number;
  color: string;
}

interface PipelineManagerProps {
  stages: Stage[];
  pipelineId?: string;
  onUpdate: () => void;
}

export const PipelineManager = ({ stages, pipelineId, onUpdate }: PipelineManagerProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    color: "#6366f1",
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingStage) {
      // Update existing stage
      const { error } = await supabase
        .from("pipeline_stages")
        .update({
          name: formData.name,
          color: formData.color,
        })
        .eq("id", editingStage.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update stage",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Stage updated successfully",
        });
        resetForm();
        onUpdate();
      }
    } else {
      // Create new stage
      const maxPosition = Math.max(...stages.map((s) => s.position), 0);
      const { error } = await supabase.from("pipeline_stages").insert({
        name: formData.name,
        color: formData.color,
        position: maxPosition + 1,
        pipeline_id: pipelineId,
      });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create stage",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Stage created successfully",
        });
        resetForm();
        onUpdate();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this stage?")) return;

    const { error } = await supabase
      .from("pipeline_stages")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete stage",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Stage deleted successfully",
      });
      onUpdate();
    }
  };

  const handleEdit = (stage: Stage) => {
    setEditingStage(stage);
    setFormData({
      name: stage.name,
      color: stage.color,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: "", color: "#6366f1" });
    setEditingStage(null);
    setDialogOpen(false);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Pipeline Stages
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage your opportunity flow stages
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingStage(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Stage
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingStage ? "Edit Stage" : "Add New Stage"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="stage-name">Stage Name *</Label>
                <Input
                  id="stage-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Qualified, Negotiation"
                  required
                />
              </div>
              <div>
                <Label htmlFor="stage-color">Color</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="stage-color"
                    type="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingStage ? "Update Stage" : "Add Stage"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Position</TableHead>
            <TableHead>Stage Name</TableHead>
            <TableHead>Color</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stages.map((stage) => (
            <TableRow key={stage.id}>
              <TableCell className="font-medium">{stage.position}</TableCell>
              <TableCell>{stage.name}</TableCell>
              <TableCell>
                <Badge
                  style={{
                    backgroundColor: stage.color + "20",
                    color: stage.color,
                  }}
                >
                  {stage.color}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(stage)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(stage.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};
