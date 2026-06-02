import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { PointOfSaleDialog } from "@/components/pos/PointOfSaleDialog";
import { User, DollarSign, Phone, Mail, UserCheck } from "lucide-react";

type BookingRow = Database["public"]["Tables"]["bookings"]["Row"] & {
  leads?: Pick<Database["public"]["Tables"]["leads"]["Row"], "id" | "name" | "email" | "phone"> | null;
  items?: Pick<Database["public"]["Tables"]["items"]["Row"], "id" | "title" | "price" | "item_type"> | null;
};
type ItemRow = Database["public"]["Tables"]["items"]["Row"];

interface StaffOption {
  id: string;
  name: string;
}

export function BookingDetailsSheet(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingRow | null;
  workspaceId: string | null | undefined;
  items: ItemRow[];
  staff?: StaffOption[];
}) {
  const { open, onOpenChange, booking, workspaceId, staff = [] } = props;
  const queryClient = useQueryClient();
  const [posOpen, setPosOpen] = useState(false);

  const isClosed = booking?.status === "closed";

  const assignedStaffName = useMemo(() => {
    if (!booking?.assigned_staff_id || !staff.length) return null;
    return staff.find((s) => s.id === booking.assigned_staff_id)?.name ?? null;
  }, [booking, staff]);

  const leadForPOS = useMemo(() => {
    if (!booking?.leads) return null;
    return {
      id: booking.leads.id,
      name: booking.leads.name,
      email: booking.leads.email ?? undefined,
      phone: booking.leads.phone ?? undefined,
    };
  }, [booking]);

  const closeBooking = useMutation({
    mutationFn: async (params: { saleId?: string | null }) => {
      if (!workspaceId) throw new Error("No workspace");
      if (!booking) throw new Error("No booking");

      const { error } = await supabase
        .from("bookings")
        .update({
          status: "closed",
          closed_at: new Date().toISOString(),
          sale_id: params.saleId ?? booking.sale_id,
        })
        .eq("id", booking.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking closed");
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const reopenBooking = useMutation({
    mutationFn: async () => {
      if (!booking) throw new Error("No booking");
      const { error } = await supabase
        .from("bookings")
        .update({
          status: "open",
          closed_at: null,
          sale_id: null,
        })
        .eq("id", booking.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking reopened");
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const updateNotes = useMutation({
    mutationFn: async (notes: string) => {
      if (!booking) throw new Error("No booking");
      const { error } = await supabase.from("bookings").update({ notes: notes || null }).eq("id", booking.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notes saved");
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const [notesDraft, setNotesDraft] = useState("");

  useEffect(() => {
    setNotesDraft(booking?.notes ?? "");
  }, [booking?.id]);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Booking Details</SheetTitle>
          </SheetHeader>

          {!booking ? (
            <div className="mt-6 text-sm text-muted-foreground">No booking selected.</div>
          ) : (
            <div className="mt-6 space-y-4">
              <div>
                <div className="text-lg font-semibold leading-tight">{booking.title}</div>
                <div className="text-sm text-muted-foreground">
                  {format(parseISO(booking.start_time), "PPPP p")} — {format(parseISO(booking.end_time), "p")}
                </div>
              </div>

              <Separator />

              {/* Customer info */}
              {booking.leads && (
                <div className="rounded-lg border p-3 space-y-1.5">
                  <div className="flex items-center gap-2 font-medium text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {booking.leads.name}
                  </div>
                  {booking.leads.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      <a href={`tel:${booking.leads.phone}`} className="hover:underline">{booking.leads.phone}</a>
                    </div>
                  )}
                  {booking.leads.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      <a href={`mailto:${booking.leads.email}`} className="hover:underline">{booking.leads.email}</a>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="mt-0.5">
                    <Badge variant={isClosed ? "secondary" : "default"}>
                      {booking.status ?? "open"}
                    </Badge>
                  </div>
                </div>

                {booking.items && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Program / Item</Label>
                    <div className="mt-0.5 text-sm font-medium">{booking.items.title}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {Number(booking.items.price).toFixed(2)} • {booking.items.item_type}
                    </div>
                  </div>
                )}

                {assignedStaffName && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Assigned Staff</Label>
                    <div className="mt-0.5 text-sm flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                      {assignedStaffName}
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-xs text-muted-foreground">Attendees</Label>
                  <div className="mt-0.5 text-sm">{booking.attendee_count ?? "—"}</div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  placeholder="Add a note…"
                />
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateNotes.mutate(notesDraft)}
                    disabled={updateNotes.isPending}
                  >
                    {updateNotes.isPending ? "Saving…" : "Save notes"}
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="flex flex-wrap gap-2">
                {!isClosed ? (
                  <>
                    <Button
                      onClick={() => closeBooking.mutate({ saleId: booking.sale_id })}
                      disabled={closeBooking.isPending}
                    >
                      {closeBooking.isPending ? "Closing…" : "Close booking"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setPosOpen(true)}
                      disabled={!leadForPOS}
                      title={!leadForPOS ? "Add a customer to charge" : undefined}
                    >
                      Close & charge
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={() => reopenBooking.mutate()} disabled={reopenBooking.isPending}>
                    {reopenBooking.isPending ? "Reopening…" : "Reopen"}
                  </Button>
                )}

                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* POS dialog for Close & Charge */}
      <PointOfSaleDialog
        open={posOpen}
        onOpenChange={setPosOpen}
        lead={leadForPOS}
        initialItems={
          booking?.item_id
            ? [
                {
                  item_id: booking.item_id,
                  quantity: 1,
                },
              ]
            : undefined
        }
        onSaleCompleted={(sale) => {
          closeBooking.mutate({ saleId: sale.id });
          setPosOpen(false);
        }}
      />
    </>
  );
}
