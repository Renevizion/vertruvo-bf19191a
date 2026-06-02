import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CalendarDays,
  LogOut,
  CreditCard,
  Clock,
  MapPin,
  Phone,
  Mail,
  ChevronRight,
  History,
  ShoppingBag,
} from "lucide-react";
import { format, isPast, isToday, isTomorrow } from "date-fns";

interface PortalBooking {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  status: string | null;
  notes: string | null;
  item_id: string | null;
  color?: string | null;
}

interface PortalService {
  id: string;
  title: string;
  description: string | null;
  price: number;
  item_type: string;
  duration_minutes: number | null;
  payment_timing: string | null;
}

interface PortalWorkspace {
  workspace_id: string;
  workspace_name: string;
  workspace_slug: string;
  logo_url: string | null;
  business_phone: string | null;
  business_email: string | null;
  cancellation_policy_hours: number;
  lead_id: string;
  card_brand: string | null;
  card_last_four: string | null;
  upcoming_bookings: PortalBooking[];
  past_bookings: PortalBooking[];
  available_services: PortalService[];
}

export default function Portal() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug?: string }>();
  const [profile, setProfile] = useState<{
    first_name?: string;
    last_name?: string;
    email?: string;
  } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Enforce tenant-scoped access — no global portal hub
  useEffect(() => {
    if (!slug) {
      navigate("/", { replace: true });
    }
  }, [slug, navigate]);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate(`/portal/login/${slug}`, { replace: true });
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const isCustomer = roles?.some((r) => r.role === "customer");
      if (!isCustomer) {
        navigate("/home", { replace: true });
        return;
      }

      const { data: prof } = await supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("id", user.id)
        .maybeSingle();

      setProfile(prof);
      setAuthChecked(true);
    };
    load();
  }, [slug, navigate]);

  const { data: portalData, isLoading } = useQuery({
    queryKey: ["customer-portal-data"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "customer-portal-data"
      );
      if (error) throw error;
      return data as { workspaces: PortalWorkspace[] };
    },
    enabled: authChecked,
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate(`/portal/login/${slug}`, { replace: true });
  };

  if (!slug) return null;

  if (!authChecked || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const allWorkspaces = portalData?.workspaces ?? [];
  const workspaces = allWorkspaces.filter((ws) => ws.workspace_slug === slug);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {workspaces.length === 1 && workspaces[0].logo_url ? (
            <img
              src={workspaces[0].logo_url}
              alt=""
              className="h-8 w-8 rounded-lg object-cover"
            />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-bold">
                {profile?.first_name?.[0] || "?"}
              </span>
            </div>
          )}
          <div>
            <h1 className="text-sm font-semibold">
              {workspaces.length === 1
                ? workspaces[0].workspace_name
                : "My Portal"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {profile?.first_name} {profile?.last_name}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" /> Sign Out
        </Button>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6 pb-20">
        {workspaces.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Your portal is being set up. Check back soon!
              </p>
            </CardContent>
          </Card>
        ) : (
          workspaces.map((ws) => (
            <WorkspacePortal key={ws.workspace_id} ws={ws} />
          ))
        )}
      </main>
    </div>
  );
}

function WorkspacePortal({ ws }: { ws: PortalWorkspace }) {
  const nextBooking = ws.upcoming_bookings[0];

  return (
    <div className="space-y-4">
      {/* Next appointment highlight */}
      {nextBooking && (
        <Card className="border-primary/30 bg-accent/30">
          <CardContent className="py-4">
            <p className="text-xs font-medium text-primary uppercase tracking-wide mb-1">
              Next Appointment
            </p>
            <p className="font-semibold text-foreground">{nextBooking.title}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {formatBookingDate(nextBooking.start_time)} ·{" "}
              {format(new Date(nextBooking.start_time), "h:mm a")} –{" "}
              {format(new Date(nextBooking.end_time), "h:mm a")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Upcoming bookings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-primary" />
            Upcoming
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ws.upcoming_bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No upcoming appointments
            </p>
          ) : (
            <div className="space-y-3">
              {ws.upcoming_bookings.map((b) => (
                <BookingRow key={b.id} booking={b} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past bookings */}
      {ws.past_bookings.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4 text-muted-foreground" />
              Recent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ws.past_bookings.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between py-2 text-sm text-muted-foreground"
                >
                  <span>{b.title}</span>
                  <span className="text-xs">
                    {format(new Date(b.start_time), "MMM d")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available services */}
      {ws.available_services.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingBag className="h-4 w-4 text-primary" />
              Book a Service
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ws.available_services.map((s) => (
                <a
                  key={s.id}
                  href={`/book/${ws.workspace_slug}`}
                  className="flex items-center justify-between py-2.5 px-3 rounded-md border hover:bg-accent/50 transition-colors group"
                >
                  <div>
                    <p className="text-sm font-medium">{s.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {s.price > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ${Number(s.price).toFixed(2)}
                        </span>
                      )}
                      {s.duration_minutes && (
                        <span className="text-xs text-muted-foreground">
                          · {s.duration_minutes}min
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Card on file */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4 text-primary" />
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ws.card_last_four ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-14 rounded border bg-muted flex items-center justify-center">
                  <span className="text-xs font-mono uppercase">
                    {ws.card_brand || "Card"}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium">
                    ····{ws.card_last_four}
                  </p>
                  <p className="text-xs text-muted-foreground">Card on file</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              No payment method on file
            </p>
          )}
        </CardContent>
      </Card>

      {/* Contact info */}
      {(ws.business_phone || ws.business_email) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ws.business_phone && (
              <a
                href={`tel:${ws.business_phone}`}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Phone className="h-4 w-4" />
                {ws.business_phone}
              </a>
            )}
            {ws.business_email && (
              <a
                href={`mailto:${ws.business_email}`}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Mail className="h-4 w-4" />
                {ws.business_email}
              </a>
            )}
          </CardContent>
        </Card>
      )}

      {/* Policy */}
      <p className="text-xs text-muted-foreground text-center px-4">
        Cancellations must be made at least{" "}
        {ws.cancellation_policy_hours} hours in advance.
      </p>
    </div>
  );
}

function BookingRow({ booking }: { booking: PortalBooking }) {
  const start = new Date(booking.start_time);
  const dateLabel = formatBookingDate(booking.start_time);

  return (
    <div className="flex items-start gap-3 py-2">
      <div
        className="w-1 h-10 rounded-full mt-0.5 shrink-0"
        style={{
          backgroundColor: booking.color || "hsl(var(--primary))",
        }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{booking.title}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <Clock className="h-3 w-3" />
          <span>
            {dateLabel} · {format(start, "h:mm a")} –{" "}
            {format(new Date(booking.end_time), "h:mm a")}
          </span>
        </div>
      </div>
      {booking.status && booking.status !== "confirmed" && (
        <Badge
          variant="outline"
          className="text-[10px] shrink-0 capitalize"
        >
          {booking.status}
        </Badge>
      )}
    </div>
  );
}

function formatBookingDate(isoStr: string): string {
  const d = new Date(isoStr);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "EEE, MMM d");
}
