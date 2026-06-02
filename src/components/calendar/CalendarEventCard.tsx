import { cn } from "@/lib/utils";
import { CheckSquare, Activity, Phone } from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  type: 'task' | 'activity' | 'call';
  date: Date;
  status?: string;
  contactName?: string;
  leadName?: string;
  description?: string;
}

interface CalendarEventCardProps {
  event: CalendarEvent;
  compact?: boolean;
  onClick?: () => void;
}

export const CalendarEventCard = ({ event, compact = false, onClick }: CalendarEventCardProps) => {
  const getTypeStyles = () => {
    switch (event.type) {
      case 'task':
        return {
          bg: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30',
          text: 'text-blue-700 dark:text-blue-300',
          icon: CheckSquare,
        };
      case 'activity':
        return {
          bg: 'bg-green-500/10 hover:bg-green-500/20 border-green-500/30',
          text: 'text-green-700 dark:text-green-300',
          icon: Activity,
        };
      case 'call':
        return {
          bg: 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30',
          text: 'text-purple-700 dark:text-purple-300',
          icon: Phone,
        };
      default:
        return {
          bg: 'bg-muted',
          text: 'text-muted-foreground',
          icon: CheckSquare,
        };
    }
  };

  const styles = getTypeStyles();
  const Icon = styles.icon;

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={cn(
          "text-xs px-1.5 py-0.5 rounded border truncate cursor-pointer transition-colors",
          styles.bg,
          styles.text
        )}
      >
        <span className="truncate">{event.title}</span>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-3 rounded-lg border cursor-pointer transition-all",
        styles.bg
      )}
    >
      <div className="flex items-start gap-2">
        <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", styles.text)} />
        <div className="flex-1 min-w-0">
          <p className={cn("font-medium text-sm", styles.text)}>{event.title}</p>
          {event.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {event.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            {event.contactName && (
              <span className="truncate">Contact: {event.contactName}</span>
            )}
            {event.leadName && (
              <span className="truncate">Lead: {event.leadName}</span>
            )}
          </div>
          {event.status && (
            <span
              className={cn(
                "inline-block mt-2 text-xs px-2 py-0.5 rounded-full",
                event.status === 'completed' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
                event.status === 'pending' && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
                event.status === 'in_progress' && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              )}
            >
              {event.status.replace('_', ' ')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
