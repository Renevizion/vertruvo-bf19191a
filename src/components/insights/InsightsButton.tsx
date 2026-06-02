import { Button, ButtonProps } from "@/components/ui/button";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface InsightsButtonProps extends Omit<ButtonProps, "children"> {
  loading?: boolean;
  /** If true, this is a refresh of existing insights (uses RefreshCw + "Refresh"). */
  refresh?: boolean;
  /** Override the label. */
  label?: string;
}

/**
 * Single unified button for insight analysis across the entire app.
 * Replaces the 3+ ad-hoc variants previously scattered in:
 * - InsightsDashboard (default size)
 * - AgentInsightsCard (contextual compact action)
 * - AgentMonitoringView (custom)
 */
export function InsightsButton({
  loading = false,
  refresh = false,
  label,
  className,
  disabled,
  ...props
}: InsightsButtonProps) {
  const text =
    label ??
    (loading
      ? refresh
        ? "Refreshing…"
        : "Analyzing…"
      : refresh
        ? "Update analysis"
        : "Run analysis");

  return (
    <Button
      {...props}
      disabled={disabled || loading}
      className={cn("gap-2", className)}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : refresh ? (
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Sparkles className="h-4 w-4" aria-hidden="true" />
      )}
      {text}
    </Button>
  );
}
