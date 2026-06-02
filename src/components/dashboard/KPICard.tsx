import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  icon: LucideIcon;
}

export const KPICard = ({ title, value, change, changeType, icon: Icon }: KPICardProps) => {
  return (
    <Card
      className={cn(
        "p-4 transition-colors",
        "border-border/70 bg-card shadow-none hover:border-primary/30"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground leading-snug">
            {title}
          </p>
          <h3 className="text-2xl sm:text-3xl font-semibold tracking-normal mt-1 text-foreground tabular-nums">
            {value}
          </h3>
          <p
            className={cn(
              "text-xs mt-2 max-w-full leading-snug",
              changeType === "positive" && "text-success",
              changeType === "negative" && "text-destructive",
              changeType === "neutral" && "text-muted-foreground"
            )}
          >
            {change}
          </p>
        </div>
        <div
          className={cn(
            "p-2 rounded-lg shrink-0",
            "bg-primary/10 text-primary"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
};
