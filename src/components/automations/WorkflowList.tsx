import { Trash2, Zap, ZapOff, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean | null;
  trigger_type: string;
  created_at: string;
}

interface WorkflowListProps {
  workflows: Workflow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function WorkflowList({ workflows, selectedId, onSelect, onDelete }: WorkflowListProps) {
  if (workflows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center px-4">
        <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center mb-3">
          <Zap className="h-5 w-5 text-muted-foreground/50" />
        </div>
        <p className="text-sm font-medium text-foreground">No workflows yet</p>
        <p className="text-xs text-muted-foreground mt-0.5">Create your first automation above</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {workflows.map((workflow) => {
        const isSelected = selectedId === workflow.id;
        return (
          <div
            key={workflow.id}
            onClick={() => onSelect(workflow.id)}
            className={cn(
              "group flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all",
              isSelected
                ? "bg-primary/5 border-primary/30"
                : "border-transparent hover:bg-accent/60 hover:border-border"
            )}
          >
            {/* Status dot */}
            <div className={cn(
              "h-2 w-2 rounded-full flex-shrink-0 mt-0.5",
              workflow.is_active ? "bg-emerald-500" : "bg-muted-foreground/30"
            )} />

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium truncate",
                isSelected ? "text-primary" : "text-foreground"
              )}>
                {workflow.name}
              </p>
              {workflow.description ? (
                <p className="text-xs text-muted-foreground truncate mt-0.5">{workflow.description}</p>
              ) : (
                <p className="text-xs text-muted-foreground/50 mt-0.5">
                  {workflow.trigger_type} · {format(new Date(workflow.created_at), "MMM d")}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(workflow.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <ChevronRight className={cn(
                "h-3.5 w-3.5 transition-colors",
                isSelected ? "text-primary" : "text-muted-foreground/40 group-hover:text-muted-foreground"
              )} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
