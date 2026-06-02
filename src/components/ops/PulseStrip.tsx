import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PulseTile {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "primary" | "warning" | "success";
  onClick?: () => void;
  pulse?: boolean;
}

const toneRing: Record<NonNullable<PulseTile["tone"]>, string> = {
  default: "ring-border/60",
  primary: "ring-primary/25",
  warning: "ring-amber-500/30",
  success: "ring-emerald-500/30",
};

const toneIcon: Record<NonNullable<PulseTile["tone"]>, string> = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

interface PulseStripProps {
  tiles: PulseTile[];
  className?: string;
}

export function PulseStrip({ tiles, className }: PulseStripProps) {
  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3", className)}>
      {tiles.map((t, i) => {
        const Icon = t.icon;
        const interactive = !!t.onClick;
        const Tag = interactive ? "button" : "div";
        return (
          <Tag
            key={i}
            type={interactive ? "button" : undefined}
            onClick={t.onClick}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-left transition-all ring-1",
              toneRing[t.tone || "default"],
              "border-border/60",
              interactive && "hover:border-primary/40 hover:shadow-sm hover:-translate-y-0.5 cursor-pointer"
            )}
          >
            <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0", toneIcon[t.tone || "default"])}>
              <Icon className="h-4 w-4" />
              {t.pulse && (
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">
                {t.label}
              </p>
              <p className="text-base sm:text-lg font-semibold text-foreground tabular-nums leading-tight">
                {t.value}
              </p>
              {t.hint && (
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">{t.hint}</p>
              )}
            </div>
          </Tag>
        );
      })}
    </div>
  );
}
