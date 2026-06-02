import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
  /** Compact = inside cards/panels. Default is page-level. */
  size?: "default" | "compact";
}

/**
 * Unified premium empty-state. One look across every surface.
 * Replaces ad-hoc "No X yet" patterns with a consistent AAA treatment.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = "default",
}: EmptyStateProps) {
  const padding = size === "compact" ? "py-8 px-4" : "py-14 px-6";
  return (
    <div
      role="status"
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm text-center",
        "surface-glass sheen-top",
        padding,
        className,
      )}
    >
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-60 bg-[radial-gradient(60%_50%_at_50%_0%,hsl(var(--primary)/0.10),transparent_70%)]" />
      {Icon && (
        <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      )}
      <h3 className="text-display text-xl sm:text-2xl text-foreground tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground leading-6">
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
