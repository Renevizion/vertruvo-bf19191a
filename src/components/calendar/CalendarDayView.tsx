import { format } from "date-fns";
import { Plus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarEventCard } from "./CalendarEventCard";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

interface CalendarDayViewProps {
  selectedDate: Date;
  events: CalendarEvent[];
  onCreateEvent: () => void;
  onRefresh: () => void;
}

export const CalendarDayView = ({ selectedDate, events, onCreateEvent, onRefresh }: CalendarDayViewProps) => {
  const tasks = events.filter(e => e.type === 'task');
  const activities = events.filter(e => e.type === 'activity');
  const calls = events.filter(e => e.type === 'call');

  const handleToggleTaskComplete = async (taskId: string, currentStatus: string | undefined) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId);

    if (error) {
      toast.error('Failed to update task');
    } else {
      toast.success(newStatus === 'completed' ? 'Task completed!' : 'Task reopened');
      onRefresh();
    }
  };

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {format(selectedDate, 'EEEE')}
          </CardTitle>
          <Button variant="outline" size="icon" onClick={onCreateEvent}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-2xl font-bold">{format(selectedDate, 'd')}</p>
        <p className="text-sm text-muted-foreground">{format(selectedDate, 'MMMM yyyy')}</p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          {events.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground text-sm">No events scheduled</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={onCreateEvent}>
                <Plus className="h-4 w-4 mr-1" />
                Add Event
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Tasks Section */}
              {tasks.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                    Tasks ({tasks.length})
                  </h4>
                  <div className="space-y-2">
                    {tasks.map(task => (
                      <div key={task.id} className="flex items-start gap-2">
                        <Checkbox
                          checked={task.status === 'completed'}
                          onCheckedChange={() => handleToggleTaskComplete(task.id, task.status)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <CalendarEventCard event={task} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activities Section */}
              {activities.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                    Activities ({activities.length})
                  </h4>
                  <div className="space-y-2">
                    {activities.map(activity => (
                      <CalendarEventCard key={activity.id} event={activity} />
                    ))}
                  </div>
                </div>
              )}

              {/* Calls Section */}
              {calls.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                    Calls ({calls.length})
                  </h4>
                  <div className="space-y-2">
                    {calls.map(call => (
                      <CalendarEventCard key={call.id} event={call} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
