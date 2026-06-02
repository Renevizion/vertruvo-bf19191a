import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { Activity, Mail, Calendar, Bot, DollarSign, FileText, MessageSquare } from "lucide-react";
import { useMemo } from "react";

interface TickerEvent {
  id: string;
  icon: typeof Activity;
  label: string;
  ago: string;
  tone: string;
}

const TYPE_MAP: Record<string, { icon: typeof Activity; tone: string; verb: string }> = {
  form_submission: { icon: FileText, tone: "text-primary", verb: "Form submitted" },
  email_sent: { icon: Mail, tone: "text-blue-600 dark:text-blue-400", verb: "Email sent" },
  booking_created: { icon: Calendar, tone: "text-emerald-600 dark:text-emerald-400", verb: "Booking created" },
  booking_closed: { icon: DollarSign, tone: "text-emerald-600 dark:text-emerald-400", verb: "Booking closed" },
  payment_captured: { icon: DollarSign, tone: "text-emerald-600 dark:text-emerald-400", verb: "Payment captured" },
  agent_reply: { icon: Bot, tone: "text-purple-600 dark:text-purple-400", verb: "Agent replied" },
  conversation: { icon: MessageSquare, tone: "text-blue-600 dark:text-blue-400", verb: "Inbound message" },
};

export function OperationalTicker() {
  const { data: events = [] } = useQuery({
    queryKey: ["operational-ticker"],
    queryFn: async () => {
      const { data } = await supabase
        .from("activities")
        .select("id, type, description, created_at")
        .order("created_at", { ascending: false })
        .limit(8);
      return data || [];
    },
    refetchInterval: 60_000,
  });

  const items: TickerEvent[] = useMemo(() => {
    return events.map((e: any) => {
      const meta = TYPE_MAP[e.type] || { icon: Activity, tone: "text-muted-foreground", verb: e.type?.replace(/_/g, " ") || "Activity" };
      return {
        id: e.id,
        icon: meta.icon,
        label: meta.verb,
        tone: meta.tone,
        ago: formatDistanceToNow(new Date(e.created_at), { addSuffix: true }),
      };
    });
  }, [events]);

  // Idle state — imply the system is listening, never blank
  const renderItems: TickerEvent[] = items.length
    ? items
    : [
        { id: "idle-1", icon: Activity, label: "System listening", ago: "live", tone: "text-emerald-600 dark:text-emerald-400" },
        { id: "idle-2", icon: Bot, label: "Agents standing by", ago: "live", tone: "text-purple-600 dark:text-purple-400" },
        { id: "idle-3", icon: FileText, label: "Forms ready to receive", ago: "live", tone: "text-primary" },
      ];

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Live activity
        </span>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <div className="flex items-center gap-4 px-3 py-2 whitespace-nowrap">
          {renderItems.map((it) => {
            const Icon = it.icon;
            return (
              <div key={it.id} className="flex items-center gap-1.5 text-xs">
                <Icon className={`h-3.5 w-3.5 ${it.tone}`} />
                <span className="text-foreground/80 font-medium">{it.label}</span>
                <span className="text-muted-foreground">· {it.ago}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
