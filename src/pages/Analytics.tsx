import { Card } from "@/components/ui/card";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import { Skeleton } from "@/components/ui/skeleton";
import { EmailCampaignPerformance } from "@/components/analytics/EmailCampaignPerformance";
import { InstagramAnalytics } from "@/components/analytics/InstagramAnalytics";

import { ArrowUpRight, Target, TrendingUp, Layers } from "lucide-react";

const Analytics = () => {
  const { data: analytics, isLoading } = useAnalyticsData();

  const totalLeads = analytics?.conversionFunnel.total || 0;
  const stages = analytics?.conversionFunnel.byStage || [];
  const topStage = [...stages].sort((a, b) => b.count - a.count)[0];
  const topSource = analytics?.leadSources?.[0];
  const sourceCount = analytics?.leadSources?.length || 0;

  return (
    <div className="space-y-4">



      {/* Top KPI row — tabular, calm, premium */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile
          label="Total leads"
          value={totalLeads.toLocaleString()}
          icon={Layers}
          loading={isLoading}
        />
        <KpiTile
          label="Top stage"
          value={topStage ? topStage.name : "—"}
          sub={topStage ? `${topStage.count} leads` : undefined}
          icon={Target}
          loading={isLoading}
        />
        <KpiTile
          label="Top source"
          value={topSource ? topSource.source : "—"}
          sub={topSource ? `${topSource.percentage}%` : undefined}
          icon={ArrowUpRight}
          loading={isLoading}
        />
        <KpiTile
          label="Channels active"
          value={sourceCount.toString()}
          icon={TrendingUp}
          loading={isLoading}
        />
      </div>

      <PerformanceChart />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-semibold">Lead sources</h3>
              <p className="text-xs text-muted-foreground">Where your pipeline is coming from</p>
            </div>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : analytics?.leadSources.length ? (
            <div className="space-y-3">
              {analytics.leadSources.map(({ source, percentage }) => (
                <div key={source} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate">{source}</span>
                    <span className="tabular-nums text-muted-foreground">{percentage}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No lead source data yet.</p>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-semibold">Conversion funnel</h3>
              <p className="text-xs text-muted-foreground">Stage-by-stage volume</p>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">{totalLeads} total</span>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {stages.map(({ name, count }) => {
                const pct = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
                return (
                  <div key={name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate">{name}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {count} <span className="text-[10px]">· {pct}%</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary/80 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {stages.length === 0 && (
                <p className="text-sm text-muted-foreground">No pipeline activity yet.</p>
              )}
            </div>
          )}
        </Card>
      </div>

      <EmailCampaignPerformance />
      <InstagramAnalytics />
    </div>
  );
};

function KpiTile({
  label,
  value,
  sub,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{label}</span>
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      {loading ? (
        <Skeleton className="h-7 w-20" />
      ) : (
        <>
          <p className="text-2xl font-semibold tabular-nums leading-tight truncate">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>}
        </>
      )}
    </Card>
  );
}

export default Analytics;
