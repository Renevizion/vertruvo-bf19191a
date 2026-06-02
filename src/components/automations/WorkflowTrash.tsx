import { RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface DeletedWorkflow {
  id: string;
  name: string;
  description: string | null;
  deleted_at: string;
  trigger_type: string;
}

interface WorkflowTrashProps {
  workflows: DeletedWorkflow[];
}

export function WorkflowTrash({ workflows }: WorkflowTrashProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const restoreWorkflowMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("workflows")
        .update({
          is_deleted: false,
          deleted_at: null,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      queryClient.invalidateQueries({ queryKey: ["deleted-workflows"] });
      toast({
        title: "Workflow restored",
        description: "The workflow has been restored from trash",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to restore workflow",
        variant: "destructive",
      });
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("workflows")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deleted-workflows"] });
      toast({
        title: "Workflow permanently deleted",
        description: "The workflow has been permanently removed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete workflow",
        variant: "destructive",
      });
    },
  });

  if (workflows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-center">
        <Trash2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">No deleted workflows</h3>
        <p className="text-sm text-muted-foreground">
          Deleted workflows will appear here and can be restored
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Deleted Workflows</h3>
        <p className="text-xs text-muted-foreground">
          {workflows.length} workflow{workflows.length !== 1 ? "s" : ""} in trash
        </p>
      </div>
      
      <div className="space-y-2">
        {workflows.map((workflow) => (
          <Card key={workflow.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm mb-1">{workflow.name}</h4>
                {workflow.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {workflow.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Deleted {formatDistanceToNow(new Date(workflow.deleted_at), { addSuffix: true })}
                </p>
              </div>
              
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => restoreWorkflowMutation.mutate(workflow.id)}
                  disabled={restoreWorkflowMutation.isPending}
                >
                  <RotateCcw className="h-3 w-3" />
                  Restore
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => permanentDeleteMutation.mutate(workflow.id)}
                  disabled={permanentDeleteMutation.isPending}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
