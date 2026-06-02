import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SeededArtifact {
  icon: LucideIcon;
  label: string;
  hint?: string;
}

interface LiveEmptyProps {
  eyebrow?: string;
  title: string;
  description: string;
  artifacts?: SeededArtifact[];
  primaryAction?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  className?: string;
  children?: ReactNode;
}

/**
 * LiveEmpty — empty states that imply latent activity.
 * Renders seeded artifacts as already-existing surfaces the operator
 * can step into, instead of a passive "nothing here" prompt.
 */
export function LiveEmpty({
  eyebrow,
  title,
  description,
  artifacts = [],
  primaryAction,
  secondaryAction,
  className,
  children,
}: LiveEmptyProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 sm:p-8",
        className
      )}
      style={{ background: "var(--gradient-subtle, hsl(var(--card)))" }}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
      />
      <div className="relative max-w-2xl">
        {eyebrow && (
          <div className="inline-flex items-center gap-1.5 text-[10px] font-medium text-primary/80 uppercase tracking-wider mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            {eyebrow}
          </div>
        )}
        <h3 className="text-lg sm:text-xl font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1.5">{description}</p>

        {artifacts.length > 0 && (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {artifacts.map((a, i) => {
              const Icon = a.icon;
              return (
                <div
                  key={i}
                  className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-background/60 backdrop-blur-sm px-3 py-2.5"
                >
                  <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{a.label}</p>
                    {a.hint && (
                      <p className="text-[11px] text-muted-foreground truncate">{a.hint}</p>
                    )}
                  </div>
                  <span className="ml-auto text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    Ready
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {(primaryAction || secondaryAction) && (
          <div className="mt-5 flex flex-wrap gap-2">
            {primaryAction && (
              <Button onClick={primaryAction.onClick}>{primaryAction.label}</Button>
            )}
            {secondaryAction && (
              <Button variant="outline" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}

        {children && <div className="mt-5">{children}</div>}
      </div>
    </div>
  );
}
