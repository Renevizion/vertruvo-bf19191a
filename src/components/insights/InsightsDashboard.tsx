import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus, Lightbulb, CheckCircle2, ArrowRight, Zap, BarChart2, Clock, Star } from "lucide-react";
import { toast } from "sonner";
import { useInsightsGeneration } from '@/hooks/useInsightsGeneration';
import { EmptyState } from "@/components/ui/empty-state";
import { InsightsButton } from "@/components/insights/InsightsButton";
import { useState } from "react";

interface Insight {
  id: string;
  insight_type: string;
  title: string;
  description: string;
  metric_value: number;
  metric_unit: string;
  trend: 'up' | 'down' | 'stable';
  trend_percentage: number;
  confidence_score: number;
  recommendations: Array<{
    action: string;
    impact: string;
    effort: string;
  }>;
  is_read: boolean;
  generated_at: string;
}

const typeConfig: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  conversion_rate: { label: "Conversion", icon: Zap, color: "text-blue-600", bg: "bg-blue-500/10" },
  best_contact_time: { label: "Timing", icon: Clock, color: "text-purple-600", bg: "bg-purple-500/10" },
  lead_quality: { label: "Lead Quality", icon: Star, color: "text-emerald-600", bg: "bg-emerald-500/10" },
  workflow_performance: { label: "Automation", icon: BarChart2, color: "text-orange-600", bg: "bg-orange-500/10" },
  revenue_trend: { label: "Revenue", icon: TrendingUp, color: "text-pink-600", bg: "bg-pink-500/10" },
};

export function InsightsDashboard() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    }
  });

  const { data: workspace } = useQuery({
    queryKey: ['user-workspace', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', session.user.id)
        .single();
      return data;
    },
    enabled: !!session?.user?.id
  });

  const { generateInsights, isGenerating } = useInsightsGeneration(workspace?.id || '');

  const { data: insightsData, refetch } = useQuery({
    queryKey: ['insights', workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      const { data, error } = await supabase
        .from('agent_insights')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('generated_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(d => ({
        ...d,
        recommendations: (d.recommendations as any) || []
      })) as Insight[];
    },
    enabled: !!workspace?.id
  });

  const markAsRead = async (insightId: string) => {
    const { error } = await supabase
      .from('agent_insights')
      .update({ is_read: true })
      .eq('id', insightId);
    if (error) {
      toast.error("Failed to mark insight as read");
    } else {
      refetch();
    }
  };

  if (!insightsData || insightsData.length === 0) {
    return (
      <EmptyState
        icon={Lightbulb}
        title="No insights yet"
        description="Let AI analyze your CRM data and surface trends, opportunities, and next-best actions."
        action={
          <InsightsButton
            loading={isGenerating}
            disabled={!workspace?.id}
            onClick={() => generateInsights()}
          />
        }
      />
    );
  }

  const unread = insightsData.filter(i => !i.is_read).length;
  const selected = insightsData.find(i => i.id === selectedId) ?? insightsData[0];

  return (
    <div className="flex gap-4 h-full min-h-0">
      {/* Left: insight list */}
      <div className="w-[300px] shrink-0 flex flex-col gap-2 overflow-y-auto">
        <div className="flex items-center justify-between mb-1 shrink-0">
          {unread > 0 && (
            <Badge className="text-[11px]">{unread} new</Badge>
          )}
          <div className="ml-auto">
            <InsightsButton
              refresh
              loading={isGenerating}
              variant="outline"
              size="sm"
              onClick={() => generateInsights()}
            />
          </div>
        </div>

        {insightsData.map((insight) => {
          const cfg = typeConfig[insight.insight_type] ?? { label: insight.insight_type, icon: Lightbulb, color: "text-muted-foreground", bg: "bg-muted" };
          const Icon = cfg.icon;
          const isActive = (selectedId ?? insightsData[0]?.id) === insight.id;
          return (
            <button
              key={insight.id}
              onClick={() => setSelectedId(insight.id)}
              className={`w-full text-left rounded-xl border px-4 py-3 transition-all ${isActive ? "border-primary bg-primary/5" : "bg-card hover:bg-muted/40"} ${!insight.is_read ? "border-l-4 border-l-primary" : ""}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
                  <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                </div>
                <span className="text-xs font-semibold truncate flex-1">{insight.title}</span>
                {insight.trend === 'up' && <TrendingUp className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                {insight.trend === 'down' && <TrendingDown className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                {insight.trend === 'stable' && <Minus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{insight.description}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs font-bold tabular-nums ${insight.trend === 'up' ? 'text-emerald-600' : insight.trend === 'down' ? 'text-red-500' : 'text-foreground'}`}>
                  {insight.metric_value} {insight.metric_unit}
                </span>
                {insight.trend_percentage !== 0 && (
                  <span className={`text-[10px] font-medium ${insight.trend === 'up' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {insight.trend_percentage > 0 ? '+' : ''}{insight.trend_percentage}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Right: detail panel */}
      {selected && (() => {
        const cfg = typeConfig[selected.insight_type] ?? { label: selected.insight_type, icon: Lightbulb, color: "text-muted-foreground", bg: "bg-muted" };
        const Icon = cfg.icon;
        return (
          <div className="flex-1 rounded-xl border bg-card overflow-y-auto p-6 flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                  <Icon className={`h-5 w-5 ${cfg.color}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide">{cfg.label}</Badge>
                    {!selected.is_read && <Badge className="text-[10px]">New</Badge>}
                  </div>
                  <h2 className="text-lg font-bold leading-tight">{selected.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{selected.description}</p>
                </div>
              </div>
              {!selected.is_read && (
                <Button size="sm" variant="outline" onClick={() => markAsRead(selected.id)} className="shrink-0">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  Mark read
                </Button>
              )}
            </div>

            {/* Metric */}
            <div className="rounded-xl border bg-muted/30 px-6 py-5 flex items-center gap-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Metric</p>
                <p className="text-4xl font-bold tabular-nums">{selected.metric_value}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{selected.metric_unit}</p>
              </div>
              {selected.trend_percentage !== 0 && (
                <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg ${selected.trend === 'up' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                  {selected.trend === 'up' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  <span className="text-lg font-bold tabular-nums">{selected.trend_percentage > 0 ? '+' : ''}{selected.trend_percentage}%</span>
                </div>
              )}
              <div className="ml-auto text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Confidence</p>
                <p className="text-2xl font-bold tabular-nums">{Math.round(selected.confidence_score * 100)}%</p>
              </div>
            </div>

            {/* Recommendations */}
            {selected.recommendations && selected.recommendations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Recommended Actions</h3>
                </div>
                <div className="flex flex-col gap-3">
                  {selected.recommendations.map((rec, idx) => (
                    <div key={idx} className="rounded-xl border bg-card px-4 py-3 flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{idx + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug">{rec.action}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="secondary" className="text-[10px]">Impact: {rec.impact}</Badge>
                          <Badge variant="outline" className="text-[10px]">Effort: {rec.effort}</Badge>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[11px] text-muted-foreground mt-auto">
              Generated {new Date(selected.generated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        );
      })()}
    </div>
  );
}
