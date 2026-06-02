import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import {
  Search, Users, Mail, Phone, Building2, Calendar, DollarSign,
  KeyRound, Copy, Check, Loader2, CreditCard, ShoppingCart,
  Clock, ChevronRight, ArrowLeft, MailPlus,
} from "lucide-react";
import { PointOfSaleDialog } from "@/components/pos/PointOfSaleDialog";
import { PageHeader } from "@/components/layout/PageHeader";

interface CustomerLead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  value: number;
  source: string | null;
  customer_user_id: string | null;
  created_at: string;
}

interface Sale {
  id: string;
  total: number;
  payment_method: string | null;
  status: string;
  created_at: string;
}

interface Booking {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  status: string | null;
  item_id: string | null;
}

const Customers = () => {
  const [customers, setCustomers] = useState<CustomerLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CustomerLead | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetResult, setResetResult] = useState<{ temp_password?: string } | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [posOpen, setPosOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .limit(1)
      .maybeSingle();

    if (!membership) { setLoading(false); return; }

    const { data, error } = await supabase
      .from("leads")
      .select("id, name, email, phone, company, value, source, customer_user_id, created_at")
      .eq("workspace_id", membership.workspace_id)
      .not("customer_user_id", "is", null)
      .order("created_at", { ascending: false });

    if (!error) setCustomers(data || []);
    setLoading(false);
  };

  const openCustomer = async (customer: CustomerLead) => {
    setSelected(customer);
    setResetResult(null);
    setDetailLoading(true);

    const now = new Date().toISOString();

    // Fetch sales, upcoming bookings, past bookings in parallel
    const [salesRes, upcomingRes, pastRes] = await Promise.all([
      supabase
        .from("sales")
        .select("id, total, payment_method, status, created_at")
        .eq("lead_id", customer.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("bookings")
        .select("id, title, start_time, end_time, status, item_id")
        .eq("lead_id", customer.id)
        .gte("start_time", now)
        .order("start_time", { ascending: true })
        .limit(20),
      supabase
        .from("bookings")
        .select("id, title, start_time, end_time, status, item_id")
        .eq("lead_id", customer.id)
        .lt("start_time", now)
        .order("start_time", { ascending: false })
        .limit(30),
    ]);

    setSales((salesRes.data as Sale[]) || []);
    setBookings(upcomingRes.data || []);
    setPastBookings(pastRes.data || []);
    setDetailLoading(false);
  };

  const handleResetPassword = async (notifyByEmail: boolean) => {
    if (!selected) return;
    setResettingPassword(true);
    setResetResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("reset-customer-password", {
        body: { lead_id: selected.id, send_email: notifyByEmail },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResetResult({ temp_password: data.temp_password });
      toast({
        title: "Password reset",
        description: notifyByEmail ? "New password generated and emailed" : "New password generated (not emailed)",
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setResettingPassword(false);
    }
  };

  const handleCopyPassword = (pw: string) => {
    navigator.clipboard.writeText(pw);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total), 0);

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || "").includes(search)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Relationships"
        title="Customers"
        description="Promoted leads with portal access — manage their accounts, schedule, and purchases."
        actions={
          <Badge variant="secondary" className="text-sm">
            {customers.length} customer{customers.length !== 1 ? "s" : ""}
          </Badge>
        }
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search customers…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground">
            {search ? "No customers match your search" : "No customers yet — promote leads from the Leads page"}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(customer => (
            <Card
              key={customer.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => openCustomer(customer)}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold truncate">{customer.name}</p>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
                {customer.email && (
                  <p className="text-sm text-muted-foreground truncate flex items-center gap-1.5">
                    <Mail className="h-3 w-3 shrink-0" /> {customer.email}
                  </p>
                )}
                {customer.phone && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Phone className="h-3 w-3 shrink-0" /> {customer.phone}
                  </p>
                )}
                <div className="flex items-center justify-between pt-1">
                  <Badge variant="outline" className="text-[10px]">{customer.source || "direct"}</Badge>
                  <span className="text-xs text-muted-foreground">
                    Since {format(new Date(customer.created_at), "MMM yyyy")}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Customer Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={o => { if (!o) setSelected(null); }}>
        <SheetContent className="w-full sm:max-w-2xl">
          {selected && (
            <>
              <SheetHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="ghost" className="shrink-0 h-8 w-8" onClick={() => setSelected(null)}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <SheetTitle>{selected.name}</SheetTitle>
                </div>
                <Button size="sm" onClick={() => setPosOpen(true)} className="mr-4">
                  <ShoppingCart className="h-4 w-4 mr-1" /> Log Sale
                </Button>
              </SheetHeader>

              <ScrollArea className="h-[calc(100vh-180px)] mt-6">
                <div className="space-y-6 pr-4">
                  {/* Contact Info */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Contact</h3>
                    <div className="grid gap-2">
                      {selected.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <a href={`mailto:${selected.email}`} className="text-primary hover:underline">{selected.email}</a>
                        </div>
                      )}
                      {selected.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <a href={`tel:${selected.phone}`} className="text-primary hover:underline">{selected.phone}</a>
                        </div>
                      )}
                      {selected.company && (
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span>{selected.company}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg border bg-muted/30 text-center">
                      <DollarSign className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                      <p className="text-lg font-bold">${totalRevenue.toFixed(0)}</p>
                      <p className="text-[10px] text-muted-foreground">Total Revenue</p>
                    </div>
                    <div className="p-3 rounded-lg border bg-muted/30 text-center">
                      <Calendar className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                      <p className="text-lg font-bold">{bookings.length}</p>
                      <p className="text-[10px] text-muted-foreground">Upcoming</p>
                    </div>
                    <div className="p-3 rounded-lg border bg-muted/30 text-center">
                      <ShoppingCart className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                      <p className="text-lg font-bold">{sales.length}</p>
                      <p className="text-[10px] text-muted-foreground">Purchases</p>
                    </div>
                  </div>

                  <Separator />

                  {detailLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <Tabs defaultValue="schedule" className="w-full">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="schedule">Schedule</TabsTrigger>
                        <TabsTrigger value="purchases">Purchases</TabsTrigger>
                        <TabsTrigger value="payments">Payments</TabsTrigger>
                        <TabsTrigger value="account">Account</TabsTrigger>
                      </TabsList>

                      {/* Schedule Tab */}
                      <TabsContent value="schedule" className="space-y-4 mt-4">
                        <h4 className="font-semibold text-sm">Upcoming</h4>
                        {bookings.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No upcoming appointments</p>
                        ) : (
                          <div className="space-y-2">
                            {bookings.map(b => (
                              <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border">
                                <div>
                                  <p className="text-sm font-medium">{b.title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(b.start_time), "MMM dd, h:mm a")} — {format(new Date(b.end_time), "h:mm a")}
                                  </p>
                                </div>
                                <Badge variant={b.status === "confirmed" ? "default" : "secondary"} className="text-[10px]">
                                  {b.status || "pending"}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}

                        <Separator />

                        <h4 className="font-semibold text-sm flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" /> Past
                        </h4>
                        {pastBookings.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No past appointments</p>
                        ) : (
                          <div className="space-y-2">
                            {pastBookings.map(b => (
                              <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border opacity-70">
                                <div>
                                  <p className="text-sm font-medium">{b.title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(b.start_time), "MMM dd, yyyy 'at' h:mm a")}
                                  </p>
                                </div>
                                <Badge variant="outline" className="text-[10px]">{b.status || "completed"}</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>

                      {/* Purchases Tab */}
                      <TabsContent value="purchases" className="space-y-4 mt-4">
                        {sales.length === 0 ? (
                          <div className="text-center py-8 space-y-2">
                            <ShoppingCart className="h-10 w-10 mx-auto text-muted-foreground/50" />
                            <p className="text-sm text-muted-foreground">No purchases yet</p>
                            <Button size="sm" variant="outline" onClick={() => setPosOpen(true)}>
                              <ShoppingCart className="h-3 w-3 mr-1" /> Log a Sale
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {sales.map(s => (
                              <div key={s.id} className="p-3 rounded-lg border space-y-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-semibold">${Number(s.total).toFixed(2)}</p>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(s.created_at), "MMM dd, yyyy")}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-[10px]">{s.payment_method}</Badge>
                                  <Badge variant={s.status === "completed" ? "default" : "secondary"} className="text-[10px]">
                                    {s.status}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>

                      {/* Payments Tab */}
                      <TabsContent value="payments" className="space-y-4 mt-4">
                        <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm font-medium">Card on File</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Card on file management is available in the customer portal. The customer can add or update their card from their portal login.
                          </p>
                        </div>

                        <Separator />

                        <h4 className="font-semibold text-sm">Payment History</h4>
                        {sales.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No payment history</p>
                        ) : (
                          <div className="space-y-2">
                            {sales.map(s => (
                              <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border">
                                <div>
                                  <p className="text-sm font-medium">${Number(s.total).toFixed(2)}</p>
                                  <p className="text-xs text-muted-foreground">{s.payment_method}</p>
                                </div>
                                <div className="text-right">
                                  <Badge variant={s.status === "completed" ? "default" : "secondary"} className="text-[10px]">
                                    {s.status}
                                  </Badge>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {format(new Date(s.created_at), "MMM dd")}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>

                      {/* Account Tab */}
                      <TabsContent value="account" className="space-y-4 mt-4">
                        <div className="p-4 rounded-lg border space-y-3">
                          <div className="flex items-center gap-2">
                            <KeyRound className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm font-medium">Account Credentials</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Login: <span className="font-mono text-foreground">{selected.email}</span>
                          </p>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline" className="w-full" disabled={resettingPassword}>
                                {resettingPassword ? (
                                  <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Resetting…</>
                                ) : (
                                  <><KeyRound className="h-3 w-3 mr-1" /> Reset Password</>
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Reset customer password?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Generate a new temporary password for {selected.name}. Notify by email?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleResetPassword(false)} className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
                                  Reset Only
                                </AlertDialogAction>
                                <AlertDialogAction onClick={() => handleResetPassword(true)}>
                                  Reset & Email
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          {resetResult?.temp_password && (
                            <div className="space-y-1 pt-2 border-t">
                              <p className="text-xs text-muted-foreground">New temporary password:</p>
                              <div className="flex items-center gap-2">
                                <code className="text-xs bg-background border rounded px-2 py-1 flex-1 font-mono">
                                  {resetResult.temp_password}
                                </code>
                                <Button size="sm" variant="outline" className="shrink-0" onClick={() => handleCopyPassword(resetResult.temp_password!)}>
                                  {copiedPassword ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="p-4 rounded-lg border space-y-2">
                          <p className="text-sm font-medium">Account Details</p>
                          <div className="grid gap-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Customer since</span>
                              <span>{format(new Date(selected.created_at), "MMM dd, yyyy")}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Lifetime value</span>
                              <span className="font-semibold">${totalRevenue.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total bookings</span>
                              <span>{bookings.length + pastBookings.length}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Source</span>
                              <Badge variant="outline" className="text-[10px]">{selected.source || "direct"}</Badge>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>

      <PointOfSaleDialog
        open={posOpen}
        onOpenChange={setPosOpen}
        lead={selected ? { id: selected.id, name: selected.name, email: selected.email, phone: selected.phone, value: selected.value } : null}
      />
    </div>
  );
};

export default Customers;
