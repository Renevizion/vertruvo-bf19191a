import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Clock, AlertCircle, CheckCircle2, Lightbulb } from "lucide-react";

interface WorkflowAnalytics {
  id: string;
  workflow_id: string;
  execution_count: number;
  success_count: number;
  error_count: number;
  avg_duration_ms: number;
  last_run_at: string | null;
  period_start: string;
  period_end: string;
}

interface WorkflowRecommendation {
  id: string;
  workflow_id: string;
  recommendation_type: string;
  title: string;
  description: string;
  expected_improvement: string;
  is_applied: boolean;
}

interface WorkflowAnalyticsViewProps {
  workflowId: string;
}

export function WorkflowAnalyticsView({ workflowId }: WorkflowAnalyticsViewProps) {
  const { data: analytics } = useQuery({
    queryKey: ['workflow-analytics', workflowId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_analytics')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('period_start', { ascending: false })
        .limit(30);
      
      if (error) throw error;
      return data as WorkflowAnalytics[];
    },
    enabled: !!workflowId
  });

  const { data: recommendations } = useQuery({
    queryKey: ['workflow-recommendations', workflowId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_recommendations')
        .select('*')
        .eq('workflow_id', workflowId)
        .eq('is_applied', false)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as WorkflowRecommendation[];
    },
    enabled: !!workflowId
  });

  const getMetricIcon = (type: string) => {
    switch(type) {
      case 'success_rate': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error_rate': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'avg_duration': return <Clock className="h-4 w-4 text-blue-500" />;
      default: return <TrendingUp className="h-4 w-4" />;
    }
  };

  const latestMetric = analytics?.[0]; // Most recent period

  const calculateSuccessRate = (metric: WorkflowAnalytics | undefined) => {
    if (!metric || metric.execution_count === 0) return 0;
    return (metric.success_count / metric.execution_count * 100).toFixed(1);
  };

  const calculateErrorRate = (metric: WorkflowAnalytics | undefined) => {
    if (!metric || metric.execution_count === 0) return 0;
    return (metric.error_count / metric.execution_count * 100).toFixed(1);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Workflow Performance Analytics</CardTitle>
          <CardDescription>
            <strong>Automatic tracking:</strong> Every workflow execution records success/failure, duration, and errors. Metrics update in real-time as workflows run.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Metrics Overview */}
          <div className="grid gap-4 md:grid-cols-4">
            {latestMetric ? (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      <CardDescription>Total Executions</CardDescription>
                    </div>
                    <CardTitle className="text-2xl">
                      {latestMetric.execution_count}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <CardDescription>Success Rate</CardDescription>
                    </div>
                    <CardTitle className="text-2xl">
                      {calculateSuccessRate(latestMetric)}%
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <CardDescription>Error Rate</CardDescription>
                    </div>
                    <CardTitle className="text-2xl">
                      {calculateErrorRate(latestMetric)}%
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <CardDescription>Avg Duration</CardDescription>
                    </div>
                    <CardTitle className="text-2xl">
                      {Math.round(latestMetric.avg_duration_ms)}ms
                    </CardTitle>
                  </CardHeader>
                </Card>
              </>
            ) : (
              <div className="col-span-4 text-center py-8 text-muted-foreground">
                <p>No metrics yet. Execute this workflow to start tracking performance data.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Optimization Recommendations
            </CardTitle>
            <CardDescription>
              AI-generated suggestions to improve workflow efficiency
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.map((rec) => (
              <div key={rec.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="font-medium">{rec.title}</h4>
                    <p className="text-sm text-muted-foreground">{rec.description}</p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {rec.recommendation_type.replace(/_/g, ' ')}
                  </Badge>
                </div>
                {rec.expected_improvement && (
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-green-500">{rec.expected_improvement}</span>
                  </div>
                )}
                <Button size="sm" variant="outline" className="w-full">
                  Apply Recommendation
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}