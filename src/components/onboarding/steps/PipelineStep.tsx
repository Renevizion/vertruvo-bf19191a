import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

interface PipelineStage {
  name: string;
  color: string;
}

interface PipelineStepProps {
  pipelineName: string;
  setPipelineName: (v: string) => void;
  pipelineStages: PipelineStage[];
  setPipelineStages: (v: PipelineStage[]) => void;
}

export const PipelineStep = ({
  pipelineName, setPipelineName,
  pipelineStages, setPipelineStages,
}: PipelineStepProps) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Create your first pipeline</h3>
        <p className="text-sm text-muted-foreground">
          Organize your leads through sales stages
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pipeline-name">Pipeline Name</Label>
          <Input
            id="pipeline-name"
            value={pipelineName}
            onChange={(e) => setPipelineName(e.target.value)}
            placeholder="Sales Pipeline"
          />
        </div>

        <div className="border rounded-lg p-4 bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">Pipeline Stages</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPipelineStages([...pipelineStages, { name: "New Stage", color: "#6b7280" }])}
              className="text-xs h-7"
            >
              + Add Stage
            </Button>
          </div>
          <div className="space-y-2">
            {pipelineStages.map((stage, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="color"
                  value={stage.color}
                  onChange={(e) => {
                    const updated = [...pipelineStages];
                    updated[i] = { ...updated[i], color: e.target.value };
                    setPipelineStages(updated);
                  }}
                  className="w-8 h-8 rounded cursor-pointer border-0"
                />
                <Input
                  value={stage.name}
                  onChange={(e) => {
                    const updated = [...pipelineStages];
                    updated[i] = { ...updated[i], name: e.target.value };
                    setPipelineStages(updated);
                  }}
                  className="flex-1 h-8"
                  placeholder="Stage name"
                />
                {pipelineStages.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPipelineStages(pipelineStages.filter((_, idx) => idx !== i))}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Click on a color to change it, or edit stage names directly
          </p>
        </div>
      </div>
    </div>
  );
};
