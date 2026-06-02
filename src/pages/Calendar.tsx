import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CreateCalendarEventDialog } from "@/components/calendar/CreateCalendarEventDialog";
import { CalendarEventCard } from "@/components/calendar/CalendarEventCard";
import { CalendarDayView } from "@/components/calendar/CalendarDayView";
import { PageHeader } from "@/components/layout/PageHeader";

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

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedDateForCreate, setSelectedDateForCreate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Fetch workspace
  const { data: workspace } = useQuery({
    queryKey: ["workspace"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("workspaces")
        .select("id")
        .eq("owner_id", user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch tasks with due dates
  const { data: tasks, refetch: refetchTasks } = useQuery({
    queryKey: ["calendar-tasks", workspace?.id, format(monthStart, 'yyyy-MM')],
    queryFn: async () => {
      if (!workspace?.id) return [];
      
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          description,
          due_date,
          status,
          contact_id,
          lead_id,
          contacts:contact_id(name),
          leads:lead_id(name)
        `)
        .eq("workspace_id", workspace.id)
        .gte("due_date", format(calendarStart, 'yyyy-MM-dd'))
        .lte("due_date", format(calendarEnd, 'yyyy-MM-dd'));
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspace?.id,
  });

  // Fetch activities
  // Calendar shows only user-scheduled reminders (tasks). Logged activities and
  // auto-triggered calls live on the contact/lead timeline, not the calendar.
  const activities: any[] = [];
  const callLogs: any[] = [];

  // Combine all events
  const events: CalendarEvent[] = [
    ...(tasks?.map(task => ({
      id: task.id,
      title: task.title,
      type: 'task' as const,
      date: new Date(task.due_date!),
      status: task.status,
      description: task.description || undefined,
      contactName: (task.contacts as any)?.name,
      leadName: (task.leads as any)?.name,
    })) || []),
  ];

  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(event.date, day));
  };

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
  };

  const handleCreateEvent = (day: Date) => {
    setSelectedDateForCreate(day);
    setCreateDialogOpen(true);
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Schedule"
        title="Calendar"
        description="Reminders and scheduled tasks — logged activity lives on each contact's timeline."
        actions={(
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            New Event
          </Button>
        )}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
        {/* Calendar Grid — sized to fit viewport without scroll */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                {format(currentDate, 'MMMM yyyy')}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleToday}>
                  Today
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            {/* Week day headers */}
            <div className="grid grid-cols-7 gap-px mb-1">
              {weekDays.map(day => (
                <div key={day} className="text-center text-[10px] sm:text-xs font-medium text-muted-foreground py-1">
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{day[0]}</span>
                </div>
              ))}
            </div>

            {/* Calendar grid — fills available viewport height, no scroll */}
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {calendarDays.map((day) => {
                const dayEvents = getEventsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isTodayDate = isToday(day);

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      // Height scales with viewport: ~6 rows must fit. Reserve ~280px for chrome.
                      "h-[calc((100dvh-280px)/6)] min-h-[56px] sm:min-h-[72px] p-1 sm:p-1.5 bg-card cursor-pointer transition-colors hover:bg-accent/50 overflow-hidden flex flex-col",
                      !isCurrentMonth && "bg-muted/30",
                      isSelected && "ring-2 ring-primary ring-inset",
                      isTodayDate && "bg-primary/5"
                    )}
                  >
                    <div className="flex items-center justify-between mb-0.5 shrink-0">
                      <span
                        className={cn(
                          "text-[11px] sm:text-xs font-medium leading-none",
                          !isCurrentMonth && "text-muted-foreground",
                          isTodayDate && "bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px]"
                        )}
                      >
                        {format(day, 'd')}
                      </span>
                    </div>
                    <div className="space-y-0.5 flex-1 min-h-0 overflow-hidden">
                      {dayEvents.slice(0, 2).map(event => (
                        <CalendarEventCard key={event.id} event={event} compact />
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-[9px] sm:text-[10px] text-muted-foreground px-1">
                          +{dayEvents.length - 2}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Day view — sidebar on desktop, hidden on mobile (tap day shows in calendar) */}
        <div className="hidden lg:block">
          <CalendarDayView
            selectedDate={selectedDate || new Date()}
            events={selectedDate ? getEventsForDay(selectedDate) : getEventsForDay(new Date())}
            onCreateEvent={() => handleCreateEvent(selectedDate || new Date())}
            onRefresh={refetchTasks}
          />
        </div>

      </div>

      {/* Create Event Dialog */}
      <CreateCalendarEventDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        defaultDate={selectedDateForCreate || selectedDate || new Date()}
        onSuccess={() => {
          refetchTasks();
          setCreateDialogOpen(false);
        }}
      />
    </div>
  );
};

export default Calendar;
