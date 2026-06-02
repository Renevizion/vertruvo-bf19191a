import { Handle, Position, useReactFlow } from "reactflow";
import { GitBranch, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { NodeConfigDialog } from "../NodeConfigDialog";

export function ConditionNode({ data, id }: { data: any; id: string }) {
  const [showConfig, setShowConfig] = useState(false);
  const { setNodes } = useReactFlow();

  const handleSaveConfig = (config: any) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, config } } : node
      )
    );
  };

  return (
    <>
      <div className="bg-secondary text-secondary-foreground border-2 border-secondary rounded-lg shadow-lg min-w-[200px] group">
        <Handle type="target" position={Position.Top} className="!bg-secondary" />
        <div className="p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              <span className="text-xs font-medium">CONDITION</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setShowConfig(true)}
            >
              <Settings className="h-3 w-3" />
            </Button>
          </div>
          <div className="font-medium text-sm">{data.label}</div>
          {data.config && Object.keys(data.config).length > 0 && (
            <div className="text-xs mt-1">Configured</div>
          )}
        </div>
        <Handle type="source" position={Position.Bottom} id="true" className="!bg-green-500 !left-1/4" />
        <Handle type="source" position={Position.Bottom} id="false" className="!bg-red-500 !left-3/4" />
      </div>

      <NodeConfigDialog
        open={showConfig}
        onOpenChange={setShowConfig}
        nodeType="condition"
        nodeLabel={data.label}
        config={data.config || {}}
        onSave={handleSaveConfig}
      />
    </>
  );
}
