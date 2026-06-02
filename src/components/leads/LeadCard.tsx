import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Phone, StickyNote, CheckSquare, MessageSquare, Video, Flame } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  value: number;
  notes?: string;
  created_at: string;
}

interface LeadCardProps {
  lead: Lead;
  onViewDetails: (id: string) => void;
  displaySettings?: {
    showEmail: boolean;
    showPhone: boolean;
    showValue: boolean;
    showScore: boolean;
    showSource: boolean;
    showDateReceived: boolean;
    showCompany: boolean;
    showActivities: boolean;
  };
  selected?: boolean;
  onSelect?: () => void;
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

export const LeadCard = ({ lead, onViewDetails, displaySettings, selected, onSelect }: LeadCardProps) => {
  const settings = displaySettings || {
    showEmail: true,
    showPhone: true,
    showValue: true,
    showScore: true,
    showSource: true,
    showDateReceived: false,
    showCompany: true,
    showActivities: true,
  };
  const [recentActivities, setRecentActivities] = useState<Array<{ type: string; created_at: string }>>([]);

  useEffect(() => {
    fetchRecentActivities();
  }, [lead.id]);

  const fetchRecentActivities = async () => {
    const { data } = await supabase
      .from("activities")
      .select("type, created_at")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false })
      .limit(5);
    if (data) setRecentActivities(data);
  };

  const getActivityIcon = (type: string) => {
    const iconClass = "h-3 w-3";
    switch (type) {
      case "note": return <StickyNote className={iconClass} />;
      case "email": return <Mail className={iconClass} />;
      case "call": return <Phone className={iconClass} />;
      case "meeting": return <Video className={iconClass} />;
      case "task": return <CheckSquare className={iconClass} />;
      default: return <MessageSquare className={iconClass} />;
    }
  };

  const getActivityLabel = (type: string) => {
    const labels: Record<string, string> = {
      note: "Note added",
      email: "Email sent/received",
      call: "Phone call",
      meeting: "Meeting scheduled",
      task: "Task created",
    };
    return labels[type] || type;
  };

  const selectionMode = selected !== undefined;
  const score = (lead as any).score ?? 0;
  const isHot = score >= 20;

  return (
    <Card
      className={cn(
        "group relative p-3.5 mb-2.5 bg-card border transition-all cursor-pointer overflow-hidden",
        "hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5",
        selected ? "border-primary ring-1 ring-primary/30" : "border-border/70"
      )}
      onClick={() => (selectionMode && onSelect ? onSelect() : onViewDetails(lead.id))}
    >
      {/* Tonal accent rail — subtle vertical bar in primary on hover */}
      <span
        aria-hidden
        className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-primary/0 group-hover:bg-primary/60 transition-colors"
      />

      <div className="space-y-2.5">
        <div className="flex items-start gap-2.5">
          {selectionMode && (
            <Checkbox
              checked={selected}
              onCheckedChange={() => onSelect?.()}
              onClick={(e) => e.stopPropagation()}
              className="mt-1 flex-shrink-0"
            />
          )}

          {/* Avatar */}
          <div className="flex-shrink-0 h-9 w-9 rounded-full bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/15 flex items-center justify-center text-[11px] font-semibold text-primary">
            {initialsOf(lead.name)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4
                className="font-semibold text-sm text-foreground leading-tight truncate group-hover:text-primary transition-colors"
                onClick={(e) => {
                  if (selectionMode) {
                    e.stopPropagation();
                    onViewDetails(lead.id);
                  }
                }}
              >
                {lead.name}
              </h4>
              {settings.showScore && (
                <div
                  className={cn(
                    "flex items-center gap-0.5 text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-md",
                    isHot
                      ? "bg-warning/15 text-warning ring-1 ring-warning/30"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {isHot && <Flame className="h-2.5 w-2.5" />}
                  {score}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {settings.showSource && lead.source && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-medium">
                  {lead.source}
                </Badge>
              )}
              {settings.showDateReceived && (
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(lead.created_at), "MMM dd")}
                </span>
              )}
            </div>
          </div>
        </div>

        {(settings.showEmail && lead.email) || (settings.showPhone && lead.phone) ? (
          <div className="space-y-1 text-xs text-muted-foreground pl-[46px]">
            {settings.showEmail && lead.email && (
              <div className="flex items-center gap-1.5">
                <Mail className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{lead.email}</span>
              </div>
            )}
            {settings.showPhone && lead.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{lead.phone}</span>
              </div>
            )}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-border/60">
          {settings.showValue && lead.value > 0 ? (
            <div className="text-sm font-semibold text-foreground tabular-nums">
              ${lead.value.toLocaleString()}
            </div>
          ) : (
            <span className="text-[11px] text-muted-foreground">No value set</span>
          )}

          {settings.showActivities && recentActivities.length > 0 && (
            <TooltipProvider>
              <div className="flex items-center gap-0.5">
                {recentActivities.slice(0, 3).map((activity, idx) => (
                  <Tooltip key={idx}>
                    <TooltipTrigger asChild>
                      <div className="p-1 rounded-md bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-help">
                        {getActivityIcon(activity.type)}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{getActivityLabel(activity.type)}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
                {recentActivities.length > 3 && (
                  <span className="text-[10px] text-muted-foreground ml-0.5 tabular-nums">
                    +{recentActivities.length - 3}
                  </span>
                )}
              </div>
            </TooltipProvider>
          )}
        </div>
      </div>
    </Card>
  );
};
