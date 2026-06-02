import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, addMinutes, endOfDay, format, parseISO, startOfDay, subDays, differenceInMinutes } from "date-fns";
import { ChevronLeft, ChevronRight, Columns3, Plus, Search, ZoomIn, ZoomOut } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

import { CreateBookingDialog } from "@/components/bookings/CreateBookingDialog";
import { BookingDetailsSheet } from "@/components/bookings/BookingDetailsSheet";
import { RosterExportDialog } from "@/components/bookings/RosterExportDialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { FileSpreadsheet } from "lucide-react";

type ResourceRow = Database["public"]["Tables"]["resources"]["Row"];
type BookingRow = Database["public"]["Tables"]["bookings"]["Row"] & {
  leads?: Pick<Database["public"]["Tables"]["leads"]["Row"], "id" | "name" | "email" | "phone"> | null;
  items?: Pick<Database["public"]["Tables"]["items"]["Row"], "id" | "title" | "price" | "item_type"> | null;
};
type BookingColorRow = Database["public"]["Tables"]["booking_colors"]["Row"];
type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type ItemRow = Database["public"]["Tables"]["items"]["Row"];

const START_HOUR = 6;
const END_HOUR = 21;
const SLOT_MINUTES = 30;
const BASE_SLOT_HEIGHT_PX = 22;
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 2.5;
const TIME_GUTTER_WIDTH_PX = 64;
const RESOURCE_COL_MIN_WIDTH_PX = 140;

function cssColorToTransparent(color: string, alpha: number) {
  // Supports token-friendly values like "hsl(var(--chart-1))" by converting to
  // the modern alpha syntax: "hsl(var(--chart-1) / 0.18)".
  const trimmed = color.trim();
  const m = trimmed.match(/^hsl\(\s*(.+)\s*\)$/i);
  if (m) return `hsl(${m[1]} / ${alpha})`;
  return trimmed;
}

function bookingStyleForDay(params: {
  booking: BookingRow;
  day: Date;
  pxPerMinute: number;
}) {
  const { booking, day, pxPerMinute } = params;
  const start = parseISO(booking.start_time);
  const end = parseISO(booking.end_time);

  const dayStart = addMinutes(startOfDay(day), START_HOUR * 60);
  const minutesFromStart = Math.max(0, differenceInMinutes(start, dayStart));
  const durationMinutes = Math.max(15, differenceInMinutes(end, start));

  return {
    top: minutesFromStart * pxPerMinute,
    height: durationMinutes * pxPerMinute,
  };
}

export default function BookingSheet() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [day, setDay] = useState(() => new Date());
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createSeed, setCreateSeed] = useState<{ start: Date; resourceId?: string; leadId?: string } | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [rosterExportOpen, setRosterExportOpen] = useState(false);

  // If navigated with ?leadId=xxx, auto-open create dialog
  useEffect(() => {
    const leadId = searchParams.get("leadId");
    if (leadId) {
      setCreateSeed({ start: new Date(), leadId });
      setCreateOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const [createResourceOpen, setCreateResourceOpen] = useState(false);
  const [newResourceName, setNewResourceName] = useState("");
  const [newResourceType, setNewResourceType] = useState("");

  const [zoom, setZoom] = useState(1);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const SLOT_HEIGHT_PX = BASE_SLOT_HEIGHT_PX * zoom;
  const pxPerMinute = SLOT_HEIGHT_PX / SLOT_MINUTES;
  const totalSlots = ((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES;
  const scheduleHeight = totalSlots * SLOT_HEIGHT_PX;

  // Wheel + pinch zoom (ctrl/meta + wheel, or pinch on trackpad)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * (e.deltaY < 0 ? 1.08 : 0.93))));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const { data: workspaceId, isLoading: workspaceLoading } = useQuery({
    queryKey: ["workspace-id"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;

      const { data, error } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", auth.user.id)
        .maybeSingle();

      if (error) throw error;
      return data?.workspace_id ?? null;
    },
  });

  const { data: resources = [], isLoading: resourcesLoading } = useQuery({
    queryKey: ["resources", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("position", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ResourceRow[];
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff-members", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_members")
        .select("user_id, profiles:user_id(id, first_name, last_name)")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      return (data ?? []).map((m: any) => ({
        id: m.profiles?.id ?? m.user_id,
        name: [m.profiles?.first_name, m.profiles?.last_name].filter(Boolean).join(" ") || "Staff",
      }));
    },
  });

  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);

  const { data: bookingColors = [] } = useQuery({
    queryKey: ["booking-colors", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_colors")
        .select("*")
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return (data ?? []) as BookingColorRow[];
    },
  });

  const bookingColorByItemId = useMemo(() => {
    const map = new Map<string, string>();
    for (const bc of bookingColors) {
      if (bc.item_id && bc.color) map.set(bc.item_id, bc.color);
    }
    return map;
  }, [bookingColors]);

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["bookings", workspaceId, dayStart.toISOString()],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, leads(id,name,email,phone), items(id,title,price,item_type)")
        .eq("workspace_id", workspaceId)
        .gte("start_time", dayStart.toISOString())
        .lte("start_time", dayEnd.toISOString())
        .order("start_time", { ascending: true });
      if (error) throw error;
      return (data ?? []) as BookingRow[];
    },
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["leads", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as LeadRow[];
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ["items", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("title", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ItemRow[];
    },
  });

  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bookings;

    return bookings.filter((b) => {
      const title = b.title?.toLowerCase() ?? "";
      const leadName = b.leads?.name?.toLowerCase() ?? "";
      const itemTitle = b.items?.title?.toLowerCase() ?? "";
      return title.includes(q) || leadName.includes(q) || itemTitle.includes(q);
    });
  }, [bookings, search]);

  const bookingsByResourceId = useMemo(() => {
    const map = new Map<string, BookingRow[]>();
    for (const b of filteredBookings) {
      const rid = b.resource_id ?? "";
      if (!rid) continue;
      if (!map.has(rid)) map.set(rid, []);
      map.get(rid)!.push(b);
    }
    return map;
  }, [filteredBookings]);

  const selectedBooking = useMemo(() => {
    if (!selectedBookingId) return null;
    return bookings.find((b) => b.id === selectedBookingId) ?? null;
  }, [bookings, selectedBookingId]);

  const createResource = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace");
      if (!newResourceName.trim()) throw new Error("Resource name is required");

      const { error } = await supabase
        .from("resources")
        .insert({
          workspace_id: workspaceId,
          name: newResourceName.trim(),
          resource_type: newResourceType.trim() || null,
          is_active: true,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Resource added");
      setNewResourceName("");
      setNewResourceType("");
      setCreateResourceOpen(false);
      queryClient.invalidateQueries({ queryKey: ["resources", workspaceId] });
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSlotClick = (resourceId: string, start: Date) => {
    setCreateSeed({ start, resourceId });
    setCreateOpen(true);
  };

  const resolveBookingColor = (b: BookingRow) => {
    if (b.item_id && bookingColorByItemId.has(b.item_id)) return bookingColorByItemId.get(b.item_id)!;
    if (b.color) return b.color;
    // default to a token-driven color (works in light/dark)
    return "hsl(var(--chart-1))";
  };

  const isLoading = workspaceLoading || resourcesLoading || bookingsLoading;

  const todaysBookings = bookings?.filter((b) => {
    const d = parseISO(b.start_time);
    return d.toDateString() === day.toDateString();
  }) ?? [];
  const todaysRevenue = todaysBookings.reduce((s, b) => s + (b.items?.price ?? 0), 0);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Operations"
        title="Booking Sheet"
        description="Day view across resources (seats, courts, rooms, etc.)"
        actions={(
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => setDay((d) => subDays(d, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => setDay(new Date())}>Today</Button>
              <Button variant="outline" size="icon" onClick={() => setDay((d) => addDays(d, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Input
                type="date"
                className="w-[170px]"
                value={format(day, "yyyy-MM-dd")}
                onChange={(e) => {
                  const next = new Date(`${e.target.value}T12:00:00`);
                  if (!Number.isNaN(next.getTime())) setDay(next);
                }}
              />
            </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-[260px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search bookings…"
                className="pl-9"
              />
            </div>
            <Button variant="outline" onClick={() => setRosterExportOpen(true)} className="gap-1.5">
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden sm:inline">Export Roster</span>
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New booking
            </Button>
            <Button variant="outline" onClick={() => setCreateResourceOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add resource
            </Button>
          </div>
          </div>
        )}
      />

      {/* Setup prompt — show when no resources configured yet */}
      {!isLoading && resources.length === 0 && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-50/60 dark:bg-amber-900/10 px-5 py-4 flex items-start gap-4">
          <div className="h-9 w-9 rounded-lg bg-amber-400/20 flex items-center justify-center shrink-0 mt-0.5">
            <Columns3 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Add your first resource to start taking bookings.</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Resources are the things you book — a boat, a technician, a court, a room.
              Add one now and your calendar will be ready to take bookings immediately.
            </p>
          </div>
          <button
            onClick={() => setCreateResourceOpen(true)}
            className="shrink-0 text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline mt-0.5 whitespace-nowrap"
          >
            Add resource →
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Bookings today", value: todaysBookings.length },
          { label: "Resources", value: resources?.length ?? 0 },
          { label: "Revenue today", value: `$${todaysRevenue.toFixed(0)}` },
          { label: "Search results", value: search ? bookings?.filter(b => (b.leads?.name ?? "").toLowerCase().includes(search.toLowerCase())).length ?? 0 : "—" },
        ].map((t) => (
          <Card key={t.label} className="p-3">
            <div className="text-xs text-muted-foreground">{t.label}</div>
            <div className="text-lg font-semibold mt-0.5">{t.value}</div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center gap-1 border-b px-2 py-1.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z * 0.9))} title="Zoom out">
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground w-12 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.1))} title="Zoom in">
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setZoom(1)}>Fit</Button>
          <span className="text-[10px] text-muted-foreground ml-auto hidden sm:inline">Ctrl/⌘ + scroll to zoom · pinch to zoom</span>
        </div>
        <div ref={scrollRef} className="overflow-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
          <div className="min-w-full sm:min-w-[900px]">

            {/* Sticky header row */}
            <div className="sticky top-0 z-20 flex border-b bg-card">
              <div
                className="shrink-0 border-r bg-card"
                style={{ width: TIME_GUTTER_WIDTH_PX }}
              />
              <div className="flex flex-1">
                {resources.map((r) => (
                  <div
                    key={r.id}
                    className="flex-1 border-r bg-card px-3 py-3"
                    style={{ minWidth: RESOURCE_COL_MIN_WIDTH_PX }}
                  >
                    <div className="font-medium truncate">{r.name}</div>
                    {r.resource_type && <div className="text-xs text-muted-foreground truncate">{r.resource_type}</div>}
                  </div>
                ))}
                {resources.length === 0 && (
                  <div className="px-4 py-4 text-sm text-muted-foreground">No resources yet.</div>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="flex">
              {/* Time gutter */}
              <div
                className="sticky left-0 z-10 shrink-0 border-r bg-card"
                style={{ width: TIME_GUTTER_WIDTH_PX }}
              >
                <div style={{ height: scheduleHeight }} className="relative">
                  {Array.from({ length: totalSlots }).map((_, i) => {
                    const slotStart = addMinutes(addMinutes(startOfDay(day), START_HOUR * 60), i * SLOT_MINUTES);
                    const isHour = slotStart.getMinutes() === 0;
                    return (
                      <div
                        key={i}
                        className="border-b px-2"
                        style={{ height: SLOT_HEIGHT_PX }}
                      >
                        {isHour && (
                          <div className="pt-1 text-xs font-medium text-muted-foreground">
                            {format(slotStart, "h a")}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Resource columns */}
              <div className="flex flex-1">
                {resources.map((r) => {
                  const resourceBookings = bookingsByResourceId.get(r.id) ?? [];
                  return (
                    <div
                      key={r.id}
                      className="flex-1 border-r"
                      style={{ minWidth: RESOURCE_COL_MIN_WIDTH_PX }}
                    >
                      <div className="relative" style={{ height: scheduleHeight }}>
                        {/* Slots */}
                        {Array.from({ length: totalSlots }).map((_, i) => {
                          const slotStart = addMinutes(addMinutes(startOfDay(day), START_HOUR * 60), i * SLOT_MINUTES);
                          const isHour = slotStart.getMinutes() === 0;
                          return (
                            <button
                              key={i}
                              type="button"
                              className={
                                "block w-full text-left border-b px-2 hover:bg-accent/40 focus-visible:bg-accent/50 transition-colors" +
                                (isHour ? " bg-muted/20" : "")
                              }
                              style={{ height: SLOT_HEIGHT_PX }}
                              onClick={() => handleSlotClick(r.id, slotStart)}
                            >
                              <span className="sr-only">Create booking at {format(slotStart, "p")}</span>
                            </button>
                          );
                        })}

                        {/* Bookings */}
                        {resourceBookings.map((b) => {
                          const { top, height } = bookingStyleForDay({ booking: b, day, pxPerMinute });
                          const isClosed = b.status === "closed";
                          const color = resolveBookingColor(b);
                          const bg = cssColorToTransparent(color, 0.18);
                          const border = cssColorToTransparent(color, 0.65);

                          return (
                            <button
                              key={b.id}
                              type="button"
                              className={
                                "absolute left-2 right-2 z-10 rounded-md border px-2 py-1 text-left shadow-sm hover:shadow transition-shadow" +
                                (isClosed ? " opacity-60 grayscale" : "")
                              }
                              style={{
                                top,
                                height: Math.max(28, height),
                                backgroundColor: bg,
                                borderColor: border,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedBookingId(b.id);
                              }}
                            >
                              <div className="text-xs font-semibold leading-tight truncate">{b.title}</div>
                              <div className="text-[11px] text-muted-foreground truncate">
                                {format(parseISO(b.start_time), "p")}–{format(parseISO(b.end_time), "p")}
                                {b.leads?.name ? ` • ${b.leads.name}` : ""}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="border-t bg-muted/20 px-4 py-3 text-sm text-muted-foreground">Loading…</div>
        )}
      </Card>

      {/* Create booking */}
      <CreateBookingDialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setCreateSeed(null);
        }}
        workspaceId={workspaceId}
        resources={resources}
        leads={leads}
        items={items}
        staff={staff}
        initialStart={createSeed?.start ?? addMinutes(addMinutes(startOfDay(day), START_HOUR * 60), 0)}
        initialResourceId={createSeed?.resourceId}
        initialLeadId={createSeed?.leadId}
        onCreated={(id) => {
          queryClient.invalidateQueries({ queryKey: ["bookings", workspaceId, dayStart.toISOString()] });
          setSelectedBookingId(id);
        }}
      />

      {/* Booking details */}
      <BookingDetailsSheet
        open={!!selectedBookingId}
        onOpenChange={(open) => {
          if (!open) setSelectedBookingId(null);
        }}
        booking={selectedBooking}
        workspaceId={workspaceId}
        items={items}
        staff={staff}
      />

      {/* Create resource */}
      <Dialog open={createResourceOpen} onOpenChange={setCreateResourceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add resource</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Resources are the columns on your booking sheet — courts, rooms, chairs, stations, tables, or staff members.
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={newResourceName} onChange={(e) => setNewResourceName(e.target.value)} placeholder="e.g. Court 1, Room A, Chair 3, Dr. Smith…" />
            </div>
            <div className="space-y-2">
              <Label>Type (optional)</Label>
              <Input value={newResourceType} onChange={(e) => setNewResourceType(e.target.value)} placeholder="e.g. Court, Room, Chair, Station…" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["Court", "Room", "Chair", "Station", "Table", "Bay", "Suite"].map((t) => (
                <Button key={t} type="button" variant="outline" size="sm" onClick={() => { setNewResourceType(t); if (!newResourceName) setNewResourceName(`${t} 1`); }}>
                  {t}
                </Button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateResourceOpen(false)}>Cancel</Button>
              <Button onClick={() => createResource.mutate()} disabled={createResource.isPending}>
                {createResource.isPending ? "Adding…" : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Roster Export */}
      <RosterExportDialog open={rosterExportOpen} onOpenChange={setRosterExportOpen} />
    </div>
  );
}
