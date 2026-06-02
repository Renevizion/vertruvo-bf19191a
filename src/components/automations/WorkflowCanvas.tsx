import { useCallback, useState, useEffect } from "react";
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
  NodeTypes,
  ConnectionLineType,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { Button } from "@/components/ui/button";
import { Save, Play, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TriggerNode } from "./nodes/TriggerNode";
import { ActionNode } from "./nodes/ActionNode";
import { ConditionNode } from "./nodes/ConditionNode";
import { WebhookNode } from "./nodes/WebhookNode";
import { NodeToolbar } from "./NodeToolbar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  webhook: WebhookNode,
};

interface WorkflowCanvasProps {
  workflow: {
    id: string;
    name: string;
    is_active: boolean | null;
    workspace_id: string | null;
    nodes: any;
    edges: any;
  };
  onUpdate: () => void;
  onNodeClick?: (nodeType: string, nodeLabel: string, nodeId: string) => void;
}

export function WorkflowCanvas({ workflow, onUpdate, onNodeClick }: WorkflowCanvasProps) {
  const { toast } = useToast();
  const [nodes, setNodes, onNodesChange] = useNodesState(workflow.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(workflow.edges || []);
  const [isSaving, setIsSaving] = useState(false);
  const [isActive, setIsActive] = useState(workflow.is_active || false);

  useEffect(() => {
    setNodes(workflow.nodes || []);
    setEdges(workflow.edges || []);
    setIsActive(workflow.is_active || false);
  }, [workflow.id]);

  const onConnect = useCallback(
    (params: Connection) => {
      const edge = {
        ...params,
        type: 'smoothstep',
        animated: true,
        style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: 'hsl(var(--primary))',
        },
      };
      setEdges((eds) => addEdge(edge, eds));
    },
    [setEdges]
  );

  const isValidConnection = useCallback((connection: Connection) => {
    // Get source and target nodes
    const sourceNode = nodes.find(n => n.id === connection.source);
    const targetNode = nodes.find(n => n.id === connection.target);
    
    if (!sourceNode || !targetNode) return false;

    // Trigger can connect to Action, Condition, or Integration
    if (sourceNode.type === 'trigger') {
      return targetNode.type === 'action' || targetNode.type === 'condition' || targetNode.type === 'webhook';
    }

    // Condition can connect to Action or Integration
    if (sourceNode.type === 'condition') {
      return targetNode.type === 'action' || targetNode.type === 'webhook';
    }

    // Action can connect to Action, Condition, or Integration
    if (sourceNode.type === 'action') {
      return targetNode.type === 'action' || targetNode.type === 'condition' || targetNode.type === 'webhook';
    }

    if (sourceNode.type === 'webhook') {
      return targetNode.type === 'action' || targetNode.type === 'condition' || targetNode.type === 'webhook';
    }

    return true;
  }, [nodes]);

  const addNode = useCallback((type: 'trigger' | 'action' | 'condition' | 'webhook', data: any) => {
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data,
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  const saveWorkflow = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('workflows')
        .update({
          nodes: JSON.parse(JSON.stringify(nodes)),
          edges: JSON.parse(JSON.stringify(edges)),
          is_active: isActive,
        })
        .eq('id', workflow.id);

      if (error) throw error;

      toast({
        title: "Workflow saved",
        description: "Your changes have been saved successfully",
      });
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save workflow",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleNodeClick = useCallback((_event: any, node: Node) => {
    if (onNodeClick && node.data?.label) {
      onNodeClick(node.type || 'unknown', node.data.label, node.id);
    }
  }, [onNodeClick]);

  return (
    <div className="h-full flex flex-col border rounded-lg bg-background overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div>
          <h2 className="text-lg font-semibold">{workflow.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Switch
              id="active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="active" className="text-sm text-muted-foreground cursor-pointer">
              {isActive ? "Active" : "Inactive"}
            </Label>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                const { data, error } = await supabase.functions.invoke('workflow-executor', {
                  body: {
                    workflowId: workflow.id,
                    triggerData: {
                      workspace_id: workflow.workspace_id,
                      test: true,
                      lead: { name: "Test Lead", email: "test@example.com", value: 1000 },
                    }
                  }
                });
                
                if (error) throw error;
                
                toast({
                  title: "Test run started",
                  description: "Check the run history for results",
                });
                onUpdate();
              } catch (error) {
                toast({
                  title: "Test failed",
                  description: error instanceof Error ? error.message : "Unknown error",
                  variant: "destructive",
                });
              }
            }}
          >
            <Play className="h-4 w-4 mr-2" />
            Test Run
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={saveWorkflow}
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <NodeToolbar onAddNode={addNode} />

      <div className="flex-1 min-h-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDoubleClick={handleNodeClick}
          isValidConnection={isValidConnection}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
          connectionLineType={ConnectionLineType.SmoothStep}
          connectionLineStyle={{ stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
          snapToGrid={true}
          snapGrid={[15, 15]}
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: true,
            style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: 'hsl(var(--primary))',
            },
          }}
          className="bg-muted/10"
        >
          <Background gap={15} />
          <Controls />
          <MiniMap 
            nodeColor={(node) => {
              if (node.type === 'trigger') return 'hsl(var(--primary))';
              if (node.type === 'condition') return 'hsl(var(--secondary))';
              return 'hsl(var(--muted))';
            }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
