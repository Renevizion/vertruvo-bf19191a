import { InsightsDashboard } from "@/components/insights/InsightsDashboard";
import { Sparkles, TrendingUp, Target, UserX, RefreshCw, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { subDays } from "date-fns";

const tiles = [
  { icon: Sparkles, label: "Pattern detection", body: "Surfaces what changed since last week and why.", color: "text-violet-600 bg-violet-400/10" },
  { icon: TrendingUp, label: "Opportunity ranking", body: "Sorts leads, classes, and campaigns by upside.", color: "text-emerald-600 bg-emerald-400/10" },
  { icon: Target, label: "Next best step", body: "One concrete action per insight, no fluff.", color: "text-primary bg-primary/10" },
];

function LiveCallouts() {
  const navigate = useNavigate();

  const { data: workspace } = useQuery({
    queryKey: ["workspace-for-callouts"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("workspaces").select("id").eq("owner_id", user.id).limit(1).maybeSingle();
      return data;
    },
  });

  const { data: coldLeads = 0 } = useQuery({
    queryKey: ["cold-leads-count", workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return 0;
      const cutoff = subDays(new Date(), 14).toISOString();
      const { count } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspace.id)
        .lt("last_contacted_at", cutoff);
      return count ?? 0;
    },
    enabled: !!workspace?.id,
  });

  const { data: renewalsDue = 0 } = useQuery({
    queryKey: ["renewals-due-count", workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return 0;
      const soon = subDays(new Date(), -7).toISOString();
      const { count } = await (supabase as any)
        .from("renewals")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspace.id)
        .lte("renewal_date", soon)
        .eq("status", "pending");
      return count ?? 0;
    },
    enabled: !!workspace?.id,
  });

  const callouts = [
    coldLeads > 0 && {
      icon: UserX,
      colorClass: "text-amber-600 bg-amber-400/10 border-amber-400/30",
      iconClass: "text-amber-600 bg-amber-400/15",
      title: `${coldLeads} lead${coldLeads !== 1 ? "s" : ""} gone cold`,
      body: "No contact in 14+ days. A quick follow-up now recovers most of them.",
      action: () => navigate("/leads"),
      actionLabel: "View leads",
    },
    renewalsDue > 0 && {
      icon: RefreshCw,
      colorClass: "text-red-600 bg-red-400/10 border-red-400/30",
      iconClass: "text-red-600 bg-red-400/15",
      title: `${renewalsDue} renewal${renewalsDue !== 1 ? "s" : ""} due soon`,
      body: "Renewals expiring within 7 days. Reach out before they lapse.",
      action: () => navigate("/renewals"),
      actionLabel: "View renewals",
    },
  ].filter(Boolean) as Array<{
    icon: React.ElementType;
    colorClass: string;
    iconClass: string;
    title: string;
    body: string;
    action: () => void;
    actionLabel: string;
  }>;

  if (callouts.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 shrink-0">
      {callouts.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.title} className={`rounded-xl border px-4 py-3.5 flex items-start gap-3 ${c.colorClass}`}>
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${c.iconClass}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{c.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{c.body}</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0 h-7 text-xs gap-1 mt-0.5"
              onClick={c.action}
            >
              {c.actionLabel} <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}

export default function Insights() {
  return (
    <div className="h-full flex flex-col overflow-hidden gap-4">
      {/* Header */}
      <div className="shrink-0">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium mb-0.5">Reporting</p>
        <h1 className="text-2xl font-bold tracking-tight">Insights</h1>
        <p className="text-sm text-muted-foreground mt-1">What changed, what's working, and the single next move — generated from your own activity.</p>
      </div>

      {/* Live actionable callouts — cold leads, renewals due, etc. */}
      <LiveCallouts />

      {/* Feature tiles */}
      <div className="grid gap-3 md:grid-cols-3 shrink-0">
        {tiles.map(({ icon: Icon, label, body, color }) => (
          <div key={label} className="rounded-xl border bg-card px-5 py-4 flex items-start gap-3.5">
            <div className={`h-9 w-9 shrink-0 rounded-lg flex items-center justify-center ${color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">{label}</p>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* AI Insights Dashboard — fills remaining height */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <InsightsDashboard />
      </div>
    </div>
  );
}
