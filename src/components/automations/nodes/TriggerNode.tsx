import { Handle, Position } from "reactflow";
import { Zap } from "lucide-react";

export function TriggerNode({ data }: { data: any }) {
  return (
    <div className="bg-primary text-primary-foreground rounded-lg border-2 border-primary shadow-lg min-w-[200px]">
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-4 w-4" />
          <span className="text-xs font-medium">TRIGGER</span>
        </div>
        <div className="font-medium text-sm">{data.label}</div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-primary" />
    </div>
  );
}
