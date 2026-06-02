import { useEffect, useMemo, useState } from "react";
import { addMinutes, format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, Clock, User, Briefcase, Users, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ResourceRow = Database["public"]["Tables"]["resources"]["Row"];
type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type ItemRow = Database["public"]["Tables"]["items"]["Row"];

interface StaffOption {
  id: string;
  name: string;
}

const DURATION_OPTIONS_MIN = [15, 30, 45, 60, 90, 120];

export function CreateBookingDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string | null | undefined;
  resources: ResourceRow[];
  leads: LeadRow[];
  items: ItemRow[];
  staff: StaffOption[];
  initialStart: Date;
  initialResourceId?: string;
  initialLeadId?: string;
  onCreated?: (bookingId: string) => void;
}) {
  const { open, onOpenChange, workspaceId, resources, leads, items, staff, initialStart, initialResourceId, initialLeadId, onCreated } = props;
  const queryClient = useQueryClient();

  const [resourceId, setResourceId] = useState<string>(initialResourceId ?? "");
  const [leadId, setLeadId] = useState<string>(initialLeadId ?? "");
  const [itemId, setItemId] = useState<string>("");
  const [staffId, setStaffId] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>(format(initialStart, "yyyy-MM-dd"));
  const [timeStr, setTimeStr] = useState<string>(format(initialStart, "HH:mm"));
  const [durationMin, setDurationMin] = useState<number>(60);
  const [title, setTitle] = useState<string>("");
  const [attendeeCount, setAttendeeCount] = useState<string>("");

  const selectedLead = useMemo(() => leads.find((l) => l.id === leadId) ?? null, [leads, leadId]);
  const selectedItem = useMemo(() => items.find((i) => i.id === itemId) ?? null, [items, itemId]);

  useEffect(() => {
    if (!open) return;
    setResourceId(initialResourceId ?? "");
    setDateStr(format(initialStart, "yyyy-MM-dd"));
    setTimeStr(format(initialStart, "HH:mm"));
    setDurationMin(60);
    setLeadId(initialLeadId ?? "");
    setItemId("");
    setStaffId("");
    setTitle("");
    setAttendeeCount("");
  }, [open, initialResourceId, initialStart, initialLeadId]);

  useEffect(() => {
    if (title.trim()) return;
    if (!selectedLead && !selectedItem) return;
    const parts = [selectedLead?.name, selectedItem?.title].filter(Boolean);
    if (parts.length) setTitle(parts.join(" — "));
  }, [selectedLead, selectedItem, title]);

  const endTime = (() => {
    try { return format(addMinutes(new Date(`${dateStr}T${timeStr}:00`), durationMin), "h:mm a"); }
    catch { return "—"; }
  })();

  const createBooking = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace");
      if (!resourceId) throw new Error("Select a resource");
      if (!title.trim()) throw new Error("Title is required");
      const start = new Date(`${dateStr}T${timeStr}:00`);
      if (Number.isNaN(start.getTime())) throw new Error("Invalid date/time");
      const end = addMinutes(start, durationMin);
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");
      const { data, error } = await supabase.from("bookings").insert({
        workspace_id: workspaceId,
        resource_id: resourceId,
        lead_id: leadId || null,
        item_id: itemId || null,
        assigned_staff_id: staffId || null,
        title: title.trim(),
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        status: "open",
        attendee_count: attendeeCount ? Number(attendeeCount) : null,
        created_by: auth.user.id,
      }).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Booking created");
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      onOpenChange(false);
      onCreated?.(id);
      if (selectedLead?.email) {
        const start = new Date(`${dateStr}T${timeStr}:00`);
        const staffMember = staff.find(s => s.id === staffId);
        supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'booking-confirmation',
            recipientEmail: selectedLead.email,
            idempotencyKey: `booking-confirm-${id}`,
            templateData: {
              clientName: selectedLead.name,
              serviceName: selectedItem?.title || title,
              date: format(start, 'MMMM d, yyyy'),
              time: format(start, 'h:mm a'),
              staffName: staffMember?.name,
            },
          },
        }).catch(() => {});
      }
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0 gap-0">
        <SheetHeader className="px-6 py-5 border-b bg-muted/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <CalendarDays className="h-4 w-4 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-base">New Booking</SheetTitle>
              <SheetDescription className="text-xs mt-0.5">Schedule a resource, assign staff, and notify the customer.</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Booking Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., John — Court Rental" className="h-9" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Briefcase className="h-3 w-3" />Resource</Label>
              <Select value={resourceId} onValueChange={setResourceId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {resources.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}{r.resource_type ? ` (${r.resource_type})` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><User className="h-3 w-3" />Customer</Label>
              <Select value={leadId} onValueChange={setLeadId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {leads.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Program / Item</Label>
              <Select value={itemId} onValueChange={setItemId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {items.map((i) => <SelectItem key={i.id} value={i.id}>{i.title} — ${Number(i.price).toFixed(2)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assigned Staff</Label>
              <Select value={staffId} onValueChange={setStaffId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {staff.length === 0 && <div className="px-2 py-1.5 text-sm text-muted-foreground">No staff yet</div>}
                  {staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><CalendarDays className="h-3 w-3" />Date</Label>
              <Input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Clock className="h-3 w-3" />Start</Label>
              <Input type="time" value={timeStr} onChange={(e) => setTimeStr(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Users className="h-3 w-3" />Attendees</Label>
              <Input inputMode="numeric" value={attendeeCount} onChange={(e) => setAttendeeCount(e.target.value)} placeholder="1" className="h-9" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Duration</Label>
            <div className="flex flex-wrap gap-2">
              {DURATION_OPTIONS_MIN.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDurationMin(m)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                    durationMin === m
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:bg-muted"
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>
        </div>

        <SheetFooter className="px-6 py-4 border-t bg-muted/20 shrink-0 flex items-center justify-between sm:justify-between">
          <p className="text-sm text-muted-foreground">Ends at <span className="font-medium text-foreground">{endTime}</span></p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button size="sm" onClick={() => createBooking.mutate()} disabled={createBooking.isPending}>
              {createBooking.isPending ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Creating…</> : "Create Booking"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
