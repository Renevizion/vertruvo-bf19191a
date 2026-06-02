import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Clock, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface WorkflowRunHistoryProps {
  workflowId: string;
}

export function WorkflowRunHistory({ workflowId }: WorkflowRunHistoryProps) {
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set());
  
  const { data: runs, isLoading } = useQuery({
    queryKey: ['workflow-runs', workflowId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_runs')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('started_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });

  const toggleExpand = (runId: string) => {
    const newExpanded = new Set(expandedRuns);
    if (newExpanded.has(runId)) {
      newExpanded.delete(runId);
    } else {
      newExpanded.add(runId);
    }
    setExpandedRuns(newExpanded);
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading runs...</div>;
  }

  return (
    <div>
      <h3 className="font-semibold mb-3">Run History</h3>
      
      {!runs || runs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No runs yet</p>
      ) : (
        <div className="space-y-2">
          {runs.map((run) => {
            const isExpanded = expandedRuns.has(run.id);
            const executionLog = run.execution_log as any[] || [];
            
            return (
              <div key={run.id} className="border rounded-lg">
                <div 
                  className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleExpand(run.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {executionLog.length > 0 && (
                        isExpanded ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                      )}
                      
                      {run.status === 'running' && (
                        <Badge variant="secondary" className="gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Running
                        </Badge>
                      )}
                      {run.status === 'completed' && (
                        <Badge variant="default" className="gap-1 bg-green-500">
                          <CheckCircle2 className="h-3 w-3" />
                          Success
                        </Badge>
                      )}
                      {run.status === 'failed' && (
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Failed
                        </Badge>
                      )}
                    </div>
                    
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(run.started_at!), { addSuffix: true })}
                    </span>
                  </div>
                  
                  {run.error_message && (
                    <p className="text-xs text-destructive mt-1">{run.error_message}</p>
                  )}
                </div>
                
                {isExpanded && executionLog.length > 0 && (
                  <div className="border-t p-3 bg-muted/20">
                    <div className="space-y-2">
                      {executionLog.map((log, idx) => (
                        <div key={idx} className="text-xs flex items-start gap-2 pb-2 border-b last:border-0">
                          <span className="text-muted-foreground min-w-[60px]">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {log.type}
                              </Badge>
                              {log.status === 'success' && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                              {log.status === 'failed' && <XCircle className="h-3 w-3 text-destructive" />}
                            </div>
                            <p className="mt-1">{log.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
