import { Badge } from "@/components/ui/badge";

const stateMeta: Record<string, { label: string; className: string }> = {
  idle: { label: "Idle", className: "bg-muted text-muted-foreground" },
  connecting: { label: "Connecting", className: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  connected: { label: "Connected", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  speaking: { label: "Speaking", className: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  error: { label: "Error", className: "bg-destructive/15 text-destructive" },
};

export function CallStateBadge({ status }: { status: string }) {
  const meta = stateMeta[status] ?? stateMeta.idle;
  return <Badge className={meta.className}>{meta.label}</Badge>;
}
