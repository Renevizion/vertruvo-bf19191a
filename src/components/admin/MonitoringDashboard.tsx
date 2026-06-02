import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Users, Workflow, Zap, TrendingUp, AlertTriangle } from "lucide-react";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";

export const MonitoringDashboard = () => {
  const { data: metrics } = useQuery({
    queryKey: ["system-metrics"],
    queryFn: async () => {
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const [usersResult, workspacesResult, workflowsResult, runsResult, errorRate] = await Promise.all([
        supabase.from("user_roles").select("id", { count: "exact" }),
        supabase.from("workspaces").select("id", { count: "exact" }),
        supabase.from("workflows").select("id", { count: "exact" }),
        supabase
          .from("workflow_runs")
          .select("id", { count: "exact" })
          .gte("started_at", hourAgo.toISOString()),
        supabase
          .from("workflow_runs")
          .select("id", { count: "exact" })
          .eq("status", "failed")
          .gte("started_at", hourAgo.toISOString()),
      ]);

      return {
        totalUsers: usersResult.count || 0,
        totalWorkspaces: workspacesResult.count || 0,
        totalWorkflows: workflowsResult.count || 0,
        runsLastHour: runsResult.count || 0,
        errorRate: errorRate.count || 0,
      };
    },
    refetchInterval: 30000,
  });

  const { data: recentActivity } = useQuery({
    queryKey: ["recent-activity"],
    queryFn: async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(10);

      return data || [];
    },
    refetchInterval: 10000,
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalUsers || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workspaces</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalWorkspaces || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workflows</CardTitle>
            <Workflow className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalWorkflows || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Runs (Last Hour)</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.runsLastHour || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.runsLastHour
                ? ((metrics.errorRate / metrics.runsLastHour) * 100).toFixed(1)
                : 0}
              %
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <PerformanceChart />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity?.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start justify-between border-b pb-3 last:border-0"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {activity.action} on {activity.entity}
                  </p>
                  {activity.entity_id && (
                    <p className="text-xs text-muted-foreground">ID: {activity.entity_id}</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(activity.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
            {(!recentActivity || recentActivity.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No recent activity
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
