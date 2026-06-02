import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Phone, Mail, MessageSquare, Calendar, ListTodo, Trophy, Bot } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getActivitySummary } from "@/lib/activity-format";

interface Activity {
  id: string;
  type: string;
  title: string | null;
  description: string | null;
  created_at: string;
  lead_id: string | null;
  contact_id: string | null;
  lead?: { name: string } | null;
  contact?: { name: string } | null;
}

export const ActivityTimeline = () => {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['recent-activities-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          lead:leads(name),
          contact:contacts(name)
        `)
        .in('type', ['note', 'call', 'email', 'meeting', 'deal_closed', 'task_created', 'task_completed', 'agent_action'])
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data as Activity[];
    },
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "call": return Phone;
      case "email": return Mail;
      case "meeting": return Calendar;
      case "note": return MessageSquare;
      case "deal_closed": return Trophy;
      case "task_created": return ListTodo;
      case "task_completed": return CheckCircle2;
      case "agent_action": return Bot;
      default: return MessageSquare;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "deal_closed": return "bg-green-100 dark:bg-green-900/20";
      case "call": return "bg-blue-100 dark:bg-blue-900/20";
      case "email": return "bg-purple-100 dark:bg-purple-900/20";
      case "meeting": return "bg-indigo-100 dark:bg-indigo-900/20";
      case "note": return "bg-orange-100 dark:bg-orange-900/20";
      case "task_created": return "bg-slate-100 dark:bg-slate-900/20";
      case "task_completed": return "bg-emerald-100 dark:bg-emerald-900/20";
      case "agent_action": return "bg-cyan-100 dark:bg-cyan-900/20";
      default: return "bg-muted";
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case "deal_closed": return "text-green-600";
      case "call": return "text-blue-600";
      case "email": return "text-purple-600";
      case "meeting": return "text-indigo-600";
      case "note": return "text-orange-600";
      case "task_created": return "text-slate-600";
      case "task_completed": return "text-emerald-600";
      case "agent_action": return "text-cyan-600";
      default: return "text-muted-foreground";
    }
  };

  const formatActivityType = (type: string): string => {
    const typeMap: { [key: string]: string } = {
      'deal_closed': 'Won',
      'call': 'Call',
      'email': 'Email',
      'meeting': 'Meeting',
      'note': 'Note',
      'task_created': 'Task',
      'task_completed': 'Completed',
      'agent_action': 'AI Agent',
    };
    return typeMap[type] || type;
  };

  const formatActivityText = (activity: Activity): string => {
    if (activity.title) return activity.title;
    
    const typeMap: { [key: string]: string } = {
      'deal_closed': 'Deal Won!',
      'call': 'Call logged',
      'email': 'Email sent',
      'meeting': 'Meeting scheduled',
      'note': 'Note added',
      'task_created': 'New task created',
      'task_completed': 'Task completed',
      'agent_action': 'AI agent completed action',
    };
    
    return typeMap[activity.type] || 'Activity';
  };

  const getAssociatedName = (activity: Activity): string | null => {
    if (activity.lead?.name) return activity.lead.name;
    if (activity.contact?.name) return activity.contact.name;
    return null;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Recent Activity</h2>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/activity">View All</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading activities...</div>
      ) : !activities || activities.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No recent activities yet</p>
          <p className="text-sm mt-1">Add notes, log calls, or close deals to see them here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = getActivityIcon(activity.type);
            const associatedName = getAssociatedName(activity);
            return (
              <Link 
                key={activity.id} 
                to={`/activity`}
                className="flex gap-4 items-start hover:bg-accent/50 p-2 -mx-2 rounded-lg transition-colors cursor-pointer"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.type)}`}>
                  <Icon className={`w-5 h-5 ${getIconColor(activity.type)}`} />
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {formatActivityText(activity)}
                    </p>
                    {associatedName && (
                      <span className="text-xs text-primary font-medium truncate max-w-[120px]">
                        • {associatedName}
                      </span>
                    )}
                  </div>
                  {activity.description && (
                    <p className="text-sm text-muted-foreground mt-0.5 truncate max-w-full">
                      {getActivitySummary(activity.description)}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(activity.created_at), "MMM d · h:mm a")}
                  </p>
                </div>
                <Badge variant="outline" className="capitalize text-xs flex-shrink-0">
                  {formatActivityType(activity.type)}
                </Badge>
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
};
