import { useState, useMemo, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, addDays, startOfDay, addMinutes } from "date-fns";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Clock, CheckCircle2, MapPin, ArrowLeft, CreditCard, Loader2, ShieldCheck, AlertTriangle, CalendarPlus } from "lucide-react";
import { toast } from "sonner";

const START_HOUR = 7;
const END_HOUR = 21;
const SLOT_MINUTES = 30;

interface PublicItem {
  id: string;
  title: string;
  description: string | null;
  price: number;
  item_type: string;
  payment_timing: string | null;
  duration_minutes: number | null;
}

interface BookingSlot {
  start_time: string;
  end_time: string;
  resource_id: string | null;
}

// --- Add to Calendar helpers ---
function buildICalBlob(title: string, start: Date, end: Date, location: string, description: string): string {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Thermi//Booking//EN",
    "BEGIN:VEVENT",
    `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
    `SUMMARY:${title}`, `LOCATION:${location}`, `DESCRIPTION:${description}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}

function downloadICal(title: string, start: Date, end: Date, location: string, description: string) {
  const blob = new Blob([buildICalBlob(title, start, end, location, description)], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "booking.ics"; a.click();
  URL.revokeObjectURL(url);
}

function googleCalUrl(title: string, start: Date, end: Date, location: string, description: string) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE", text: title,
    dates: `${fmt(start)}/${fmt(end)}`,
    location, details: description,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

export default function PublicBooking() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [step, setStep] = useState<"service" | "date" | "time" | "info" | "confirmed">("service");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientNotes, setClientNotes] = useState("");

  const paidParam = searchParams.get("paid");
  const cardSavedParam = searchParams.get("card_saved");
  const sessionId = searchParams.get("session_id");
  const cancelled = searchParams.get("cancelled");

  const { data: confirmResult, isLoading: confirmingPayment } = useQuery({
    queryKey: ["confirm-booking-payment", sessionId],
    enabled: (paidParam === "true" || cardSavedParam === "true") && !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("confirm-public-booking", {
        body: { session_id: sessionId },
      });
      if (error) throw error;
      return data;
    },
    retry: 2,
  });

  useEffect(() => {
    if (confirmResult?.success) {
      setStep("confirmed");
      searchParams.delete("paid");
      searchParams.delete("card_saved");
      searchParams.delete("session_id");
      setSearchParams(searchParams, { replace: true });
    }
  }, [confirmResult]);

  useEffect(() => {
    if (cancelled === "true") {
      toast.error("Payment was cancelled. Your booking was not created.");
      searchParams.delete("cancelled");
      setSearchParams(searchParams, { replace: true });
    }
  }, [cancelled]);

  const { data: bookingData, isLoading: wsLoading, error: wsError } = useQuery({
    queryKey: ["public-booking-data", slug],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_booking_data", { _slug: slug! });
      if (error) throw error;
      return data as unknown as {
        workspace: { id: string; name: string };
        settings: {
          business_name: string | null;
          business_phone: string | null;
          logo_url: string | null;
          city: string | null;
          state_province: string | null;
          business_category: string | null;
          cancellation_policy_hours: number;
        } | null;
        items: PublicItem[];
        resources: { id: string; name: string }[];
      } | null;
    },
    enabled: !!slug,
  });

  const workspace = bookingData?.workspace ?? null;
  const settings = bookingData?.settings ?? null;
  const items: PublicItem[] = bookingData?.items ?? [];
  const resources = bookingData?.resources ?? [];

  const { data: existingSlots = [] } = useQuery({
    queryKey: ["public-booking-slots", workspace?.id, format(selectedDate, "yyyy-MM-dd")],
    enabled: !!workspace?.id && (step === "time" || step === "date"),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_booking_slots", {
        _workspace_id: workspace!.id,
        _date: format(selectedDate, "yyyy-MM-dd"),
      });
      if (error) throw error;
      return (data as unknown as BookingSlot[]) ?? [];
    },
  });

  const selectedItem = items.find((i) => i.id === selectedItemId);
  const duration = selectedItem?.duration_minutes || 60;
  const price = selectedItem ? Number(selectedItem.price) : 0;
  const paymentTiming = selectedItem?.payment_timing || (price > 0 ? "upfront" : "free");
  const cancellationHours = settings?.cancellation_policy_hours ?? 24;

  const availableSlots = useMemo(() => {
    const slots: string[] = [];
    const now = new Date();
    const isToday = format(selectedDate, "yyyy-MM-dd") === format(now, "yyyy-MM-dd");
    for (let hour = START_HOUR; hour < END_HOUR; hour++) {
      for (let min = 0; min < 60; min += SLOT_MINUTES) {
        const slotStart = addMinutes(startOfDay(selectedDate), hour * 60 + min);
        const slotEnd = addMinutes(slotStart, duration);
        if (isToday && slotStart <= now) continue;
        if (slotEnd > addMinutes(startOfDay(selectedDate), END_HOUR * 60)) continue;
        const hasConflict = existingSlots.some((b) => {
          const bStart = new Date(b.start_time);
          const bEnd = new Date(b.end_time);
          return slotStart < bEnd && slotEnd > bStart;
        });
        if (!hasConflict) slots.push(format(slotStart, "HH:mm"));
      }
    }
    return slots;
  }, [selectedDate, existingSlots, duration]);

  const dateOptions = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(new Date(), i)), []);

  // Free booking — direct insert
  const freeBookMutation = useMutation({
    mutationFn: async () => {
      if (!workspace?.id || !selectedTime || !selectedItemId) throw new Error("Missing data");
      const [hours, minutes] = selectedTime.split(":").map(Number);
      const startTime = addMinutes(startOfDay(selectedDate), hours * 60 + minutes);
      const endTime = addMinutes(startTime, duration);

      const { data: lead, error: leadError } = await supabase.from("leads").insert({
        name: clientName, email: clientEmail || null, phone: clientPhone || null,
        source: "booking_page", workspace_id: workspace.id, notes: clientNotes || null,
      }).select("id").single();
      if (leadError) throw leadError;

      const { error: bookingError } = await supabase.from("bookings").insert({
        title: `${clientName} — ${selectedItem?.title || "Appointment"}`,
        start_time: startTime.toISOString(), end_time: endTime.toISOString(),
        workspace_id: workspace.id, lead_id: lead.id, item_id: selectedItemId,
        resource_id: resources.length > 0 ? resources[0].id : null,
        status: "confirmed", notes: clientNotes || null,
      });
      if (bookingError) throw bookingError;
    },
    onSuccess: () => setStep("confirmed"),
    onError: (e) => toast.error("Booking failed: " + e.message),
  });

  // Upfront payment — Stripe Checkout (payment mode)
  const upfrontMutation = useMutation({
    mutationFn: async () => {
      if (!workspace?.id || !selectedTime || !selectedItemId || !selectedItem) throw new Error("Missing data");
      if (!clientEmail.trim()) throw new Error("Email is required for payment");
      const [hours, minutes] = selectedTime.split(":").map(Number);
      const startTime = addMinutes(startOfDay(selectedDate), hours * 60 + minutes);
      const endTime = addMinutes(startTime, duration);

      const { data, error } = await supabase.functions.invoke("public-booking-checkout", {
        body: {
          workspace_id: workspace.id, item_id: selectedItemId, item_title: selectedItem.title,
          amount_cents: Math.round(price * 100),
          client_name: clientName, client_email: clientEmail,
          client_phone: clientPhone || undefined, client_notes: clientNotes || undefined,
          start_time: startTime.toISOString(), end_time: endTime.toISOString(),
          resource_id: resources.length > 0 ? resources[0].id : undefined,
        },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("No checkout URL returned");
      window.location.href = data.url;
    },
    onError: (e) => toast.error("Payment setup failed: " + e.message),
  });

  // At-close — Stripe Checkout (setup mode, card vaulted)
  const setupCardMutation = useMutation({
    mutationFn: async () => {
      if (!workspace?.id || !selectedTime || !selectedItemId || !selectedItem) throw new Error("Missing data");
      if (!clientEmail.trim()) throw new Error("Email is required to save your card");
      const [hours, minutes] = selectedTime.split(":").map(Number);
      const startTime = addMinutes(startOfDay(selectedDate), hours * 60 + minutes);
      const endTime = addMinutes(startTime, duration);

      const { data, error } = await supabase.functions.invoke("public-booking-setup-card", {
        body: {
          workspace_id: workspace.id, item_id: selectedItemId, item_title: selectedItem.title,
          amount_cents: Math.round(price * 100),
          client_name: clientName, client_email: clientEmail,
          client_phone: clientPhone || undefined, client_notes: clientNotes || undefined,
          start_time: startTime.toISOString(), end_time: endTime.toISOString(),
          resource_id: resources.length > 0 ? resources[0].id : undefined,
        },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("No checkout URL returned");
      window.location.href = data.url;
    },
    onError: (e) => toast.error("Card setup failed: " + e.message),
  });

  const handleSubmit = () => {
    if (paymentTiming === "at_close") setupCardMutation.mutate();
    else if (paymentTiming === "upfront") upfrontMutation.mutate();
    else freeBookMutation.mutate();
  };

  const isSubmitting = freeBookMutation.isPending || upfrontMutation.isPending || setupCardMutation.isPending;
  // Public-facing name MUST come from business_settings only.
  // The workspace name is an internal identifier (often the owner's first name)
  // and must never leak to clients on the public booking page.
  const businessName = (settings?.business_name && settings.business_name.trim())
    ? settings.business_name.trim()
    : "Book a service";
  const hasBrandedName = Boolean(settings?.business_name && settings.business_name.trim());
  const location = [settings?.city, settings?.state_province].filter(Boolean).join(", ");

  // --- SEO data ---
  const pageTitle = hasBrandedName ? `Book with ${businessName} | Thermi` : `Online Booking | Thermi`;
  const pageDescription = hasBrandedName
    ? (settings?.business_category
        ? `Book appointments online with ${businessName} — ${settings.business_category} in ${location || "your area"}. Powered by Thermi.`
        : `Book appointments online with ${businessName}${location ? ` in ${location}` : ""}. Powered by Thermi.`)
    : `Book an appointment online. Powered by Thermi.`;
  const pageUrl = `https://thermi.com/book/${slug}`;

  // --- Calendar event data for confirmation ---
  const confirmedStart = useMemo(() => {
    if (!selectedTime || !selectedDate) return null;
    const [h, m] = selectedTime.split(":").map(Number);
    return addMinutes(startOfDay(selectedDate), h * 60 + m);
  }, [selectedTime, selectedDate]);
  const confirmedEnd = useMemo(() => confirmedStart ? addMinutes(confirmedStart, duration) : null, [confirmedStart, duration]);

  if (confirmingPayment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        <p className="text-sm text-slate-500">Confirming your booking...</p>
      </div>
    );
  }

  if (wsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (wsError || !workspace) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <h1 className="text-xl font-semibold text-slate-800">Booking page not found</h1>
          <p className="text-slate-500 mt-2">This business doesn't have a public booking page yet.</p>
        </Card>
      </div>
    );
  }

  const getButtonContent = () => {
    if (isSubmitting) return <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Processing…</span>;
    if (paymentTiming === "upfront") return <span className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> Pay & Book — ${price.toFixed(2)}</span>;
    if (paymentTiming === "at_close") return <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Save Card & Book</span>;
    return "Confirm Booking";
  };

  const requiresEmail = paymentTiming !== "free";

  // JSON-LD structured data
  const jsonLd: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: businessName,
    url: pageUrl,
    ...(location && { address: { "@type": "PostalAddress", addressLocality: settings?.city, addressRegion: settings?.state_province } }),
    ...(settings?.business_phone && { telephone: settings.business_phone }),
    ...(settings?.logo_url && { image: settings.logo_url }),
    ...(settings?.business_category && { description: `${settings.business_category} services by ${businessName}` }),
  };

  const serviceJsonLd = items.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "Service",
    provider: { "@type": "LocalBusiness", name: businessName },
    name: items.map(i => i.title).join(", "),
    url: pageUrl,
    ...(items[0] && Number(items[0].price) > 0 && {
      offers: {
        "@type": "Offer",
        price: Number(items[0].price).toFixed(2),
        priceCurrency: "USD",
      },
    }),
  } : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* SEO — dynamic per business */}
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="robots" content={hasBrandedName ? "index, follow" : "noindex, nofollow"} />
        <link rel="canonical" href={pageUrl} />
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        {settings?.logo_url && <meta property="og:image" content={settings.logo_url} />}
        <meta property="og:site_name" content="Thermi" />
        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        {settings?.logo_url && <meta name="twitter:image" content={settings.logo_url} />}
        {/* JSON-LD */}
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        {serviceJsonLd && <script type="application/ld+json">{JSON.stringify(serviceJsonLd)}</script>}
      </Helmet>

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-5">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {settings?.logo_url && <img src={settings.logo_url} alt={businessName} className="h-10 w-10 rounded-lg object-cover" />}
          <div>
            <h1 className="text-lg font-bold text-slate-900">{businessName}</h1>
            {location && <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin className="h-3 w-3" /> {location}</p>}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Progress */}
        {step !== "confirmed" && (
          <div className="flex items-center gap-2 mb-6">
            {["service", "date", "time", "info"].map((s, i) => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${["service", "date", "time", "info"].indexOf(step) >= i ? "bg-slate-800" : "bg-slate-200"}`} />
            ))}
          </div>
        )}

        {/* Step 1: Service */}
        {step === "service" && (
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-1">Select a service</h2>
            <p className="text-sm text-slate-500 mb-4">Choose what you'd like to book</p>
            {items.length === 0 ? (
              <Card className="p-6 text-center text-slate-500">No services available for booking at this time.</Card>
            ) : (
              <div className="space-y-3">
                {items.map((item) => {
                  const itemPrice = Number(item.price);
                  const timing = item.payment_timing || (itemPrice > 0 ? "upfront" : "free");
                  const itemDuration = item.duration_minutes || 60;
                  return (
                    <button key={item.id} onClick={() => { setSelectedItemId(item.id); setStep("date"); }}
                      className="w-full text-left p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-400 hover:shadow-sm transition-all">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-slate-900">{item.title}</div>
                          {item.description && <p className="text-sm text-slate-500 mt-0.5">{item.description}</p>}
                          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Clock className="h-3 w-3" /> {itemDuration} min</p>
                        </div>
                        <div className="text-right shrink-0">
                          {itemPrice > 0 ? (
                            <div>
                              <span className="text-sm font-semibold text-slate-800">${itemPrice.toFixed(2)}</span>
                              {timing === "at_close" && <p className="text-[10px] text-slate-400">Charged after session</p>}
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-green-600">Free</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Date */}
        {step === "date" && (
          <div>
            <button onClick={() => setStep("service")} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3"><ArrowLeft className="h-4 w-4" /> Back</button>
            <h2 className="text-xl font-semibold text-slate-900 mb-1">Pick a date</h2>
            <p className="text-sm text-slate-500 mb-4">{selectedItem?.title} — {duration} min</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {dateOptions.map((d) => (
                <button key={d.toISOString()} onClick={() => { setSelectedDate(d); setSelectedTime(null); setStep("time"); }}
                  className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-400 text-left transition-all">
                  <div className="text-xs font-medium text-slate-600">{format(d, "EEEE")}</div>
                  <div className="text-lg font-bold text-slate-900">{format(d, "MMM d")}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Time */}
        {step === "time" && (
          <div>
            <button onClick={() => setStep("date")} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3"><ArrowLeft className="h-4 w-4" /> Back</button>
            <h2 className="text-xl font-semibold text-slate-900 mb-1">Pick a time</h2>
            <p className="text-sm text-slate-500 mb-4">{format(selectedDate, "EEEE, MMMM d")} — {selectedItem?.title}</p>
            {availableSlots.length === 0 ? (
              <Card className="p-6 text-center text-slate-500">No available times on this date. Try another day.</Card>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {availableSlots.map((time) => {
                  const [h, m] = time.split(":").map(Number);
                  const display = format(addMinutes(startOfDay(new Date()), h * 60 + m), "h:mm a");
                  return (
                    <button key={time} onClick={() => { setSelectedTime(time); setStep("info"); }}
                      className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-400 text-center font-medium text-sm transition-all">
                      {display}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Info + Payment */}
        {step === "info" && (
          <div>
            <button onClick={() => setStep("time")} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3"><ArrowLeft className="h-4 w-4" /> Back</button>
            <h2 className="text-xl font-semibold text-slate-900 mb-1">Your details</h2>
            <p className="text-sm text-slate-500 mb-4">
              {selectedItem?.title} — {format(selectedDate, "EEE, MMM d")} at{" "}
              {selectedTime && format(addMinutes(startOfDay(new Date()), parseInt(selectedTime.split(":")[0]) * 60 + parseInt(selectedTime.split(":")[1])), "h:mm a")}
            </p>

            {paymentTiming === "upfront" && (
              <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4 text-blue-600 shrink-0" />
                <span className="text-blue-800">Payment of <strong>${price.toFixed(2)}</strong> will be collected securely via Stripe</span>
              </div>
            )}
            {paymentTiming === "at_close" && (
              <div className="mb-4 p-3 rounded-lg bg-slate-100 border border-slate-200 flex items-start gap-2 text-sm">
                <ShieldCheck className="h-4 w-4 text-slate-600 mt-0.5 shrink-0" />
                <div className="text-slate-700">
                  <p>Your card will be <strong>saved securely</strong> but <strong>not charged now</strong>.</p>
                  <p className="text-xs mt-1 text-slate-500">
                    You'll be charged <strong>${price.toFixed(2)}</strong> after your session is complete.
                    {cancellationHours > 0 && ` Cancel at least ${cancellationHours}hrs before for no charge.`}
                  </p>
                </div>
              </div>
            )}

            {/* Cancellation policy banner — visible right before submission */}
            {cancellationHours > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2 text-xs text-amber-800">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>Cancellations must be made at least <strong>{cancellationHours} hours</strong> before your appointment. Late cancellations may be charged.</span>
              </div>
            )}

            <Card className="p-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Your full name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email {requiresEmail ? "*" : ""}</Label>
                <Input id="email" type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input id="phone" type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="+1 (555) 123-4567" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={clientNotes} onChange={(e) => setClientNotes(e.target.value)} placeholder="Anything we should know?" rows={2} />
              </div>

              <Button className="w-full" size="lg"
                disabled={!clientName.trim() || !clientPhone.trim() || (requiresEmail && !clientEmail.trim()) || isSubmitting}
                onClick={handleSubmit}>
                {getButtonContent()}
              </Button>
            </Card>
          </div>
        )}

        {/* Step 5: Confirmation */}
        {step === "confirmed" && (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">You're booked!</h2>
            <p className="text-slate-500 mb-2">
              {confirmResult?.paid && "Payment confirmed — your appointment is secured."}
              {confirmResult?.card_saved && "Card saved — you'll be charged after your session."}
              {!confirmResult?.paid && !confirmResult?.card_saved && "We'll see you at your appointment."}
            </p>
            {cancellationHours > 0 && (
              <p className="text-xs text-slate-400 mb-6">
                Need to cancel? Please notify us at least {cancellationHours} hours in advance.
              </p>
            )}

            {/* Add to Calendar */}
            {confirmedStart && confirmedEnd && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-6">
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <a
                    href={googleCalUrl(
                      `${selectedItem?.title || "Appointment"} — ${businessName}`,
                      confirmedStart, confirmedEnd,
                      location || "", `Booked with ${businessName}`
                    )}
                    target="_blank" rel="noopener noreferrer"
                  >
                    <CalendarPlus className="h-4 w-4" /> Google Calendar
                  </a>
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => {
                  downloadICal(
                    `${selectedItem?.title || "Appointment"} — ${businessName}`,
                    confirmedStart!, confirmedEnd!,
                    location || "", `Booked with ${businessName}`
                  );
                }}>
                  <CalendarPlus className="h-4 w-4" /> iCal / Outlook
                </Button>
              </div>
            )}

            <Card className="p-4 max-w-sm mx-auto text-left">
              <div className="text-sm text-slate-600">
                <p className="font-medium text-slate-900">{businessName}</p>
                {location && <p>{location}</p>}
                {settings?.business_phone && <p>{settings.business_phone}</p>}
              </div>
            </Card>
            <Button variant="outline" className="mt-6" onClick={() => {
              setStep("service"); setSelectedItemId(null); setSelectedTime(null);
              setClientName(""); setClientEmail(""); setClientPhone(""); setClientNotes("");
            }}>
              Book another appointment
            </Button>
          </div>
        )}
      </div>

      <div className="text-center py-4 text-xs text-slate-400">
        Powered by <span className="font-medium">Thermi</span>
      </div>
    </div>
  );
}
