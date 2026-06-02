import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  format,
  startOfDay,
  endOfDay,
  parseISO,
  addMinutes,
  differenceInMinutes,
} from "date-fns";
import { Link } from "react-router-dom";
import { CheckSquare, Columns3, ArrowRight, Maximize2 } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

/* ───── types ───── */
type ResourceRow = Database["public"]["Tables"]["resources"]["Row"];
type BookingRow = Database["public"]["Tables"]["bookings"]["Row"] & {
  leads?: { name: string } | null;
  items?: { title: string } | null;
};

interface TodayTask {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  description: string | null;
  contact?: { name: string } | null;
}

/* ───── mini-grid constants ─────
   Compact: full day fits in view, and grid range auto-expands to cover early/late bookings. */
const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 21;
const SLOT_MINUTES = 30;
const SLOT_HEIGHT = 18; // px — comfortable; full day visible without scroll

function cssAlpha(color: string, alpha: number) {
  const m = color.trim().match(/^hsl\(\s*(.+)\s*\)$/i);
  if (m) return `hsl(${m[1]} / ${alpha})`;
  return color;
}

export function TodayHub() {
  const queryClient = useQueryClient();
  const now = new Date();
  const todayStart = startOfDay(now).toISOString();
  const todayEnd = endOfDay(now).toISOString();

  /* workspace id */
  const { data: workspaceId } = useQuery({
    queryKey: ["workspace-id"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      return data?.workspace_id ?? null;
    },
  });

  /* resources */
  const { data: resources = [] } = useQuery({
    queryKey: ["resources", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .eq("is_active", true)
        .order("position", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ResourceRow[];
    },
  });

  /* today's bookings */
  const { data: bookings = [] } = useQuery({
    queryKey: ["today-bookings", workspaceId, todayStart],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, leads(name), items(title)")
        .eq("workspace_id", workspaceId!)
        .gte("start_time", todayStart)
        .lte("start_time", todayEnd)
        .order("start_time", { ascending: true });
      if (error) throw error;
      return (data ?? []) as BookingRow[];
    },
  });

  /* today's tasks */
  const { data: tasks = [] } = useQuery({
    queryKey: ["today-tasks", todayStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select(
          "id, title, status, due_date, description, contact:contacts(name)"
        )
        .in("status", ["pending", "in_progress"])
        .lte("due_date", todayEnd)
        .order("due_date", { ascending: true })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as TodayTask[];
    },
  });

  const completeTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ status: "completed" })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task completed!");
      queryClient.invalidateQueries({ queryKey: ["today-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    },
  });

  /* group bookings by resource */
  const bookingsByResource = useMemo(() => {
    const map = new Map<string, BookingRow[]>();
    for (const b of bookings) {
      const rid = b.resource_id ?? "";
      if (!rid) continue;
      if (!map.has(rid)) map.set(rid, []);
      map.get(rid)!.push(b);
    }
    return map;
  }, [bookings]);

  const hasResources = resources.length > 0;
  const hasBookings = bookings.length > 0;
  const hasTasks = tasks.length > 0;

  /* Dynamic grid range — expand to cover any early/late bookings so nothing gets clipped. */
  const { GRID_START_HOUR, GRID_END_HOUR, PX_PER_MIN, TOTAL_SLOTS, GRID_HEIGHT } = useMemo(() => {
    let startH = DEFAULT_START_HOUR;
    let endH = DEFAULT_END_HOUR;
    for (const b of bookings) {
      const s = parseISO(b.start_time);
      const e = parseISO(b.end_time);
      startH = Math.min(startH, s.getHours());
      endH = Math.max(endH, e.getHours() + (e.getMinutes() > 0 ? 1 : 0));
    }
    startH = Math.max(0, startH);
    endH = Math.min(24, endH);
    const pxPerMin = SLOT_HEIGHT / SLOT_MINUTES;
    const totalSlots = ((endH - startH) * 60) / SLOT_MINUTES;
    return {
      GRID_START_HOUR: startH,
      GRID_END_HOUR: endH,
      PX_PER_MIN: pxPerMin,
      TOTAL_SLOTS: totalSlots,
      GRID_HEIGHT: totalSlots * SLOT_HEIGHT,
    };
  }, [bookings]);

  /* current-time indicator position */
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const gridStartMins = GRID_START_HOUR * 60;
  const gridEndMins = GRID_END_HOUR * 60;
  const showNowLine =
    nowMins >= gridStartMins && nowMins <= gridEndMins;
  const nowLineTop = (nowMins - gridStartMins) * PX_PER_MIN;

  return (
    <div className="space-y-4">
      {/* ── Mini Booking Sheet ── */}
      {hasResources && (
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Columns3 className="h-4 w-4 text-muted-foreground" />
              Today's Schedule
              {hasBookings && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {bookings.length}
                </Badge>
              )}
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/booking-sheet">
                <Maximize2 className="h-3.5 w-3.5 mr-1" />
                Full View
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border-t">
              <div className="w-full">
                {/* Resource header row */}
                <div className="flex border-b bg-card">
                  <div className="shrink-0 w-[44px] sm:w-[56px] border-r bg-card" />
                  {resources.map((r) => (
                    <div
                      key={r.id}
                      className="flex-1 min-w-0 border-r px-1.5 sm:px-2 py-2 bg-card"
                    >
                      <div className="text-[11px] sm:text-xs font-semibold truncate">
                        {r.name}
                      </div>
                      {r.resource_type && (
                        <div className="text-[10px] text-muted-foreground truncate hidden sm:block">
                          {r.resource_type}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Grid body */}
                <div className="flex">
                  {/* Time gutter */}
                  <div className="shrink-0 w-[44px] sm:w-[56px] border-r bg-card relative">
                    <div style={{ height: GRID_HEIGHT }}>
                      {Array.from({ length: TOTAL_SLOTS }).map((_, i) => {
                        const mins = GRID_START_HOUR * 60 + i * SLOT_MINUTES;
                        const isHour = mins % 60 === 0;
                        return (
                          <div
                            key={i}
                            className="border-b px-1"
                            style={{ height: SLOT_HEIGHT }}
                          >
                            {isHour && (
                              <div className="text-[10px] font-medium text-muted-foreground pt-0.5">
                                {format(
                                  addMinutes(startOfDay(now), mins),
                                  "h a"
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Resource columns */}
                  {resources.map((r) => {
                    const rBookings = bookingsByResource.get(r.id) ?? [];
                    return (
                      <div
                        key={r.id}
                        className="flex-1 min-w-0 border-r relative"
                      >
                        {/* Slot lines */}
                        <div style={{ height: GRID_HEIGHT }}>
                          {Array.from({ length: TOTAL_SLOTS }).map((_, i) => {
                            const mins =
                              GRID_START_HOUR * 60 + i * SLOT_MINUTES;
                            const isHour = mins % 60 === 0;
                            return (
                              <div
                                key={i}
                                className={`border-b ${isHour ? "bg-muted/20" : ""}`}
                                style={{ height: SLOT_HEIGHT }}
                              />
                            );
                          })}
                        </div>

                        {/* Booking blocks */}
                        {rBookings.map((b) => {
                          const start = parseISO(b.start_time);
                          const end = parseISO(b.end_time);
                          const dayStart = addMinutes(
                            startOfDay(now),
                            GRID_START_HOUR * 60
                          );
                          const topPx = Math.max(
                            0,
                            differenceInMinutes(start, dayStart) * PX_PER_MIN
                          );
                          const heightPx = Math.max(
                            20,
                            differenceInMinutes(end, start) * PX_PER_MIN
                          );
                          const isClosed = b.status === "closed";
                          const isPast = now > end;
                          const color = b.color || "hsl(var(--chart-1))";
                          const bg = cssAlpha(color, 0.18);
                          const border = cssAlpha(color, 0.55);

                          return (
                            <Link
                              key={b.id}
                              to="/booking-sheet"
                              className={`absolute left-1 right-1 z-10 rounded border px-1.5 py-0.5 text-left transition-shadow hover:shadow-md ${
                                isClosed || isPast ? "opacity-50" : ""
                              }`}
                              style={{
                                top: topPx,
                                height: Math.max(20, heightPx),
                                backgroundColor: bg,
                                borderColor: border,
                              }}
                            >
                              <div className="text-[11px] font-semibold leading-tight truncate">
                                {b.title}
                              </div>
                              {heightPx > 28 && (
                                <div className="text-[10px] text-muted-foreground truncate">
                                  {format(start, "h:mm")}–
                                  {format(end, "h:mm a")}
                                  {b.leads?.name ? ` · ${b.leads.name}` : ""}
                                </div>
                              )}
                            </Link>
                          );
                        })}

                        {/* Now line */}
                        {showNowLine && (
                          <div
                            className="absolute left-0 right-0 z-20 border-t-2 border-destructive pointer-events-none"
                            style={{ top: nowLineTop }}
                          >
                            <div className="absolute -left-0.5 -top-1 w-2 h-2 rounded-full bg-destructive" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Tasks Due Today ── */}
      {hasTasks && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
              Tasks Due
              <Badge variant="secondary" className="ml-1 text-xs">
                {tasks.length}
              </Badge>
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/tasks">
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {tasks.map((t) => {
              const isOverdue =
                t.due_date && new Date(t.due_date) < startOfDay(now);
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    checked={false}
                    onCheckedChange={() => completeTask.mutate(t.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    {t.contact?.name && (
                      <p className="text-xs text-muted-foreground truncate">
                        {t.contact.name}
                      </p>
                    )}
                  </div>
                  {isOverdue && (
                    <Badge
                      variant="destructive"
                      className="text-[10px] px-1.5 py-0"
                    >
                      Overdue
                    </Badge>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
