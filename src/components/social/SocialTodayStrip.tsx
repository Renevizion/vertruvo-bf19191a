import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Sparkles, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Props {
  pendingScheduled: number;
  lastPostedAt?: string | null;
}

export function SocialTodayStrip({ pendingScheduled, lastPostedAt }: Props) {
  const { data: pendingSuggestions = 0 } = useQuery({
    queryKey: ["coach-pending-count"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      const { count } = await supabase
        .from("social_post_suggestions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "pending");
      return count || 0;
    },
    refetchInterval: 60000,
  });

  const daysSince = lastPostedAt
    ? Math.floor((Date.now() - new Date(lastPostedAt).getTime()) / 86400000)
    : null;
  const overdue = daysSince !== null && daysSince >= 4;

  const pills = [
    {
      icon: Sparkles,
      label: pendingSuggestions > 0 ? `${pendingSuggestions} draft${pendingSuggestions === 1 ? "" : "s"} awaiting approval` : "Coach is watching",
      tone: pendingSuggestions > 0 ? "primary" : "muted",
    },
    {
      icon: Clock,
      label: pendingScheduled > 0 ? `${pendingScheduled} scheduled` : "Nothing scheduled",
      tone: pendingScheduled > 0 ? "primary" : "muted",
    },
    {
      icon: overdue ? AlertCircle : CheckCircle2,
      label: lastPostedAt
        ? `Last post ${formatDistanceToNow(new Date(lastPostedAt), { addSuffix: true })}`
        : "No posts yet",
      tone: overdue ? "warn" : "ok",
    },
  ];

  return (
    <Card className="p-3 sm:p-4 bg-gradient-to-r from-primary/5 via-background to-background border-primary/10">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary px-1">Today</span>
        {pills.map((p, i) => {
          const Icon = p.icon;
          const cls =
            p.tone === "primary"
              ? "bg-primary/10 text-primary border-primary/20"
              : p.tone === "warn"
              ? "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400"
              : p.tone === "ok"
              ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400"
              : "bg-muted text-muted-foreground border-border";
          return (
            <div key={i} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${cls}`}>
              <Icon className="h-3.5 w-3.5" />
              <span className="truncate max-w-[200px] sm:max-w-none">{p.label}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
