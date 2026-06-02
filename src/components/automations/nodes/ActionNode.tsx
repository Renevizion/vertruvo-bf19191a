import { Handle, Position, useReactFlow } from "reactflow";
import { Play, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { NodeConfigDialog } from "../NodeConfigDialog";

export function ActionNode({ data, id }: { data: any; id: string }) {
  const [showConfig, setShowConfig] = useState(false);
  const { setNodes } = useReactFlow();

  useEffect(() => {
    if (!data.autoConfigure) return;
    setShowConfig(true);
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, autoConfigure: false } } : node
      )
    );
  }, [data.autoConfigure, id, setNodes]);

  const handleSaveConfig = (config: any) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, config, autoConfigure: false } } : node
      )
    );
  };

  return (
    <>
      <div className="bg-card border-2 border-border rounded-lg shadow-lg min-w-[200px] group">
        <Handle type="target" position={Position.Top} className="!bg-border" />
        <div className="p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">ACTION</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-80 transition-opacity group-hover:opacity-100"
              onClick={() => setShowConfig(true)}
            >
              <Settings className="h-3 w-3" />
            </Button>
          </div>
          <div className="font-medium text-sm">{data.label}</div>
          {data.config && Object.keys(data.config).length > 0 && (
            <div className="text-xs text-muted-foreground mt-1">Configured</div>
          )}
        </div>
        <Handle type="source" position={Position.Bottom} className="!bg-border" />
      </div>

      <NodeConfigDialog
        open={showConfig}
        onOpenChange={setShowConfig}
        nodeType="action"
        nodeLabel={data.label}
        config={data.config || {}}
        onSave={handleSaveConfig}
      />
    </>
  );
}
