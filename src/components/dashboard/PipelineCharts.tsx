import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, CircleDot } from "lucide-react";

const FALLBACK_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--muted-foreground))",
];

interface StageData {
  name: string;
  count: number;
  value: number;
  color: string;
}

const normalizeStageName = (name: string) => {
  const normalized = name.trim().toLowerCase().replace(/\s+/g, " ");

  if (normalized === "new" || normalized === "new inquiry" || normalized === "new inquiries") {
    return "New Inquiries";
  }

  return name.trim();
};

export function PipelineCharts() {
  const { data, isLoading } = useQuery({
    queryKey: ["pipeline-chart-data"],
    queryFn: async () => {
      const [leadsRes, stagesRes] = await Promise.all([
        supabase.from("leads").select("stage_id, value, contact_type"),
        supabase
          .from("pipeline_stages")
          .select("id, name, position, color")
          .order("position", { ascending: true }),
      ]);

      const leads = leadsRes.data ?? [];
      const stages = stagesRes.data ?? [];

      // Stage distribution — group by normalized stage labels
      // so "New" and "New Inquiries" appear as one bucket.
      const nameMap = new Map<string, StageData>();
      const stageIdToKey = new Map<string, string>();
      let colorIndex = 0;

      // Sort stages by position so chart order is logical
      const sortedStages = [...stages].sort((a, b) => a.position - b.position);

      for (const s of sortedStages) {
        const normalizedName = normalizeStageName(s.name);
        const key = normalizedName.toLowerCase();
        const existing = nameMap.get(key);

        if (!existing) {
          nameMap.set(key, {
            name: normalizedName,
            count: 0,
            value: 0,
            color: s.color || FALLBACK_COLORS[colorIndex % FALLBACK_COLORS.length],
          });
          colorIndex++;
        } else if (s.color && FALLBACK_COLORS.includes(existing.color)) {
          existing.color = s.color;
        }

        stageIdToKey.set(s.id, key);
      }

      for (const l of leads) {
        if (!l.stage_id) continue;

        const key = stageIdToKey.get(l.stage_id);
        if (!key) continue;

        const entry = nameMap.get(key);
        if (!entry) continue;

        entry.count++;
        entry.value += l.value || 0;
      }

      const stageDistribution = Array.from(nameMap.values()).filter((s) => s.count > 0);

      // Contact type breakdown
      const typeCounts = { lead: 0, prospect: 0, customer: 0 };
      for (const l of leads) {
        const t = (l.contact_type as keyof typeof typeCounts) || "lead";
        if (t in typeCounts) typeCounts[t]++;
      }
      const contactTypes = [
        { name: "Leads", count: typeCounts.lead },
        { name: "Prospects", count: typeCounts.prospect },
        { name: "Customers", count: typeCounts.customer },
      ].filter((c) => c.count > 0);

      const totalLeads = leads.length;

      return { stageDistribution, contactTypes, totalLeads };
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-6">
          <Skeleton className="h-[220px] w-full" />
        </Card>
        <Card className="p-6">
          <Skeleton className="h-[220px] w-full" />
        </Card>
      </div>
    );
  }

  const hasStages = data && data.stageDistribution.length > 0;
  const hasTypes = data && data.contactTypes.length > 0;

  if (!hasStages && !hasTypes) {
    return null;
  }

  const totalValue = data?.stageDistribution.reduce((sum, s) => sum + (s.value || 0), 0) ?? 0;
  const maxStageCount = Math.max(...(data?.stageDistribution.map((s) => s.count) ?? [1]), 1);
  const maxTypeCount = Math.max(...(data?.contactTypes.map((s) => s.count) ?? [1]), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-3 sm:gap-4">
      {/* Stage Distribution */}
      {hasStages && (
        <Card className="border-border/70 overflow-hidden">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <span className="p-1.5 rounded-md bg-primary/10 text-primary">
                <BarChart3 className="h-3.5 w-3.5" />
              </span>
              Pipeline stages
            </CardTitle>
            {totalValue > 0 && (
              <span className="text-xs text-muted-foreground tabular-nums px-2 py-1 rounded-md bg-muted">
                ${(totalValue / 1000).toFixed(1)}k pipeline
              </span>
            )}
          </CardHeader>
          <CardContent className="pb-4 space-y-3">
            {data!.stageDistribution.map((stage) => (
              <div key={stage.name} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-foreground truncate">{stage.name}</span>
                  <span className="text-muted-foreground tabular-nums shrink-0">{stage.count}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max(6, (stage.count / maxStageCount) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Contact Type Breakdown */}
      {hasTypes && (
        <Card className="border-border/70 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <span className="p-1.5 rounded-md bg-primary/10 text-primary">
                <CircleDot className="h-3.5 w-3.5" />
              </span>
              Contact mix
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 space-y-3">
            <div>
              <p className="text-3xl font-semibold tracking-normal tabular-nums text-foreground">{data?.totalLeads ?? 0}</p>
              <p className="text-xs text-muted-foreground">total opportunities</p>
            </div>
            {data!.contactTypes.map((type) => (
              <div key={type.name} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-foreground truncate">{type.name}</span>
                  <span className="text-muted-foreground tabular-nums shrink-0">{type.count}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{ width: `${Math.max(6, (type.count / maxTypeCount) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
