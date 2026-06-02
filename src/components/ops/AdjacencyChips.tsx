import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AdjacencyChip {
  icon: LucideIcon;
  label: string;
  count?: number | string;
  tone?: "default" | "primary" | "warning" | "success" | "muted";
  onClick?: () => void;
  title?: string;
}

const toneClass: Record<NonNullable<AdjacencyChip["tone"]>, string> = {
  default: "bg-muted/60 text-foreground/80 hover:bg-muted",
  primary: "bg-primary/10 text-primary hover:bg-primary/15 ring-1 ring-primary/15",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/15",
  success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15",
  muted: "bg-muted/40 text-muted-foreground hover:bg-muted/70",
};

interface AdjacencyChipsProps {
  chips: AdjacencyChip[];
  className?: string;
  size?: "sm" | "md";
}

export function AdjacencyChips({ chips, className, size = "sm" }: AdjacencyChipsProps) {
  if (!chips.length) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {chips.map((c, i) => {
        const Icon = c.icon;
        const interactive = !!c.onClick;
        const Tag = interactive ? "button" : "div";
        return (
          <Tag
            key={i}
            type={interactive ? "button" : undefined}
            onClick={c.onClick}
            title={c.title}
            className={cn(
              "inline-flex items-center gap-1 rounded-full transition-colors tabular-nums",
              size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
              toneClass[c.tone || "default"],
              interactive && "cursor-pointer"
            )}
          >
            <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
            <span className="font-medium">{c.label}</span>
            {c.count !== undefined && (
              <span className="opacity-70">· {c.count}</span>
            )}
          </Tag>
        );
      })}
    </div>
  );
}
