import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Zap, Clock, TrendingUp, CheckCircle2 } from "lucide-react";

export function QuickWinsWidget() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["quick-wins-stats"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: member } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();
      if (!member) return null;

      const wid = member.workspace_id;

      const leadsRes = await supabase.from("leads").select("id", { count: "exact" }).eq("workspace_id", wid);
      const tasksData = await supabase.from("tasks").select("id, status").eq("workspace_id", wid);
      const workflowData = await supabase.from("workflows").select("id, is_active").eq("workspace_id", wid);
      const agentData = await supabase.from("ai_agents").select("id, status").eq("workspace_id", wid);

      const completedTasks = (tasksData.data || []).filter((t) => t.status === "completed").length;
      const totalTasks = (tasksData.data || []).length;
      const activeWorkflows = (workflowData.data || []).filter((w) => w.is_active).length;
      const activeAgents = (agentData.data || []).filter((a) => a.status === "active").length;

      return {
        totalLeads: leadsRes.count || 0,
        activeWorkflows,
        activeAgents,
        taskCompletion: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        totalTasks,
        completedTasks,
      };
    },
  });

  if (isLoading || !stats) return null;

  const metrics = [
    {
      label: "Active Workflows",
      value: stats.activeWorkflows,
      sublabel: "automating your pipeline",
      icon: Zap,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      label: "AI Agents Live",
      value: stats.activeAgents,
      sublabel: "responding 24/7",
      icon: Clock,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "Pipeline Leads",
      value: stats.totalLeads,
      sublabel: "in your funnel",
      icon: TrendingUp,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Task Completion",
      value: `${stats.taskCompletion}%`,
      sublabel: `${stats.completedTasks}/${stats.totalTasks} done`,
      icon: CheckCircle2,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Quick Wins
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.label}
                className="flex flex-col items-center text-center p-3 rounded-lg border bg-card"
              >
                <div className={`p-2 rounded-full ${m.bgColor} mb-2`}>
                  <Icon className={`h-4 w-4 ${m.color}`} />
                </div>
                <div className="text-xl font-bold text-foreground">{m.value}</div>
                <div className="text-xs font-medium text-foreground">{m.label}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{m.sublabel}</div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
