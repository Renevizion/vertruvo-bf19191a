import { memo, useEffect, useState } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "reactflow";
import { Settings, Webhook } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NodeConfigDialog } from "../NodeConfigDialog";

export const WebhookNode = memo(({ data, id }: NodeProps) => {
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
        node.id === id ? { ...node, data: { ...node.data, ...config, config, autoConfigure: false } } : node
      )
    );
  };

  return (
    <>
      <Card className="group min-w-[220px] border-2 border-primary shadow-lg">
        <Handle type="target" position={Position.Top} className="w-3 h-3" />
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Integration</h3>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-80 transition-opacity group-hover:opacity-100" onClick={() => setShowConfig(true)}>
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {data.label || "Send HTTP Request"}
          </p>
          {(data.config?.url || data.url) && (
            <p className="text-xs text-muted-foreground truncate">
              {data.config?.method || data.method || "POST"} {data.config?.url || data.url}
            </p>
          )}
          {data.config && Object.keys(data.config).length > 0 && (
            <p className="text-xs text-primary">Configured</p>
          )}
        </div>
        <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
      </Card>

      <NodeConfigDialog
        open={showConfig}
        onOpenChange={setShowConfig}
        nodeType="webhook"
        nodeLabel={data.label || "Webhook (HTTP)"}
        config={data.config || { method: data.method || "POST", url: data.url || "" }}
        onSave={handleSaveConfig}
      />
    </>
  );
});

WebhookNode.displayName = "WebhookNode";
