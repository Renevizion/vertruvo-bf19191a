import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** Small uppercased label above the title (e.g. "CRM", "Schedule") */
  eyebrow?: string;
  /** The page title — H1 */
  title: string;
  /** Short supporting sentence under the title */
  description?: string;
  /** Right-aligned actions (buttons, filters, dropdowns) */
  actions?: ReactNode;
  /** Optional row below the title row (filters, tabs, KPI chips) */
  meta?: ReactNode;
  className?: string;
}

/**
 * Shared page header — gives every screen the same rhythm and breathing room.
 * Use at the top of any page above the main content.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  className,
}: PageHeaderProps) {
  return (
    <section
      className={cn("mb-3 sm:mb-4", className)}
      aria-labelledby={`${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-title`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-primary/70 uppercase tracking-wide mb-0.5">
              <span className="h-1 w-1 rounded-full bg-primary" />
              {eyebrow}
            </div>
          )}
          <h1
            id={`${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-title`}
            className="text-display text-xl sm:text-2xl text-foreground leading-tight text-balance"
          >
            {title}
          </h1>
          {description && (
            <p className="text-xs sm:text-[13px] text-muted-foreground mt-0.5 max-w-3xl leading-5">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {actions}
          </div>
        )}
      </div>
      {meta && (
        <div className="mt-2 pt-2 border-t border-border/60">
          {meta}
        </div>
      )}
    </section>
  );
}

