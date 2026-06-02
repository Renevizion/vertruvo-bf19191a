import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Rocket, Users, DollarSign, CheckCircle, XCircle, Clock,
  Phone, Mail, MessageSquare, RefreshCw, Play, Search, TrendingUp,
  AlertTriangle, Zap, CreditCard, X
} from "lucide-react";

function useWorkspace() {
  return useQuery({
    queryKey: ["workspace-renewal"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();
      return data;
    },
  });
}

export function RenewalCampaignManager() {
  const queryClient = useQueryClient();
  const { data: ws } = useWorkspace();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [form, setForm] = useState({
    name: "",
    item_id: "",
    days_before_end: 14,
    message_template: `Hi {name}, your current period for {program} is coming up for renewal. Would you like us to reserve your next spot or send the available options?`,
    voice_enabled: true,
    sms_enabled: true,
    email_enabled: true,
  });

  const { data: items } = useQuery({
    queryKey: ["items-renewal"],
    queryFn: async () => {
      const { data } = await supabase
        .from("items")
        .select("id, title, price, item_type")
        .eq("is_active", true)
        .order("title");
      return data || [];
    },
    enabled: !!ws,
  });

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["renewal-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("renewal_campaigns" as any)
        .select("*, items(id, title, price)")
        .eq("workspace_id", ws!.workspace_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!ws,
  });

  const { data: campaignContacts } = useQuery({
    queryKey: ["renewal-contacts", selectedCampaign?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("renewal_contacts" as any)
        .select("*")
        .eq("campaign_id", selectedCampaign!.id)
        .order("outreach_status", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!selectedCampaign,
  });

  const createMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const { data, error } = await supabase
        .from("renewal_campaigns" as any)
        .insert({
          workspace_id: ws!.workspace_id,
          name: values.name,
          item_id: values.item_id || null,
          days_before_end: values.days_before_end,
          message_template: values.message_template,
          voice_enabled: values.voice_enabled,
          sms_enabled: values.sms_enabled,
          email_enabled: values.email_enabled,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["renewal-campaigns"] });
      toast.success("Campaign created");
      setCreateOpen(false);
      setForm({
        name: "", item_id: "", days_before_end: 14,
        message_template: form.message_template,
        voice_enabled: true, sms_enabled: true, email_enabled: true,
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const scanMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await supabase.functions.invoke("process-session-renewals", {
        body: { action: "scan", campaign_id: campaignId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["renewal-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["renewal-contacts"] });
      toast.success(`Found ${data.contacts_added} clients to reach out to`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const launchMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await supabase.functions.invoke("process-session-renewals", {
        body: { action: "launch", campaign_id: campaignId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["renewal-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["renewal-contacts"] });
      toast.success(`Outreach sent to ${data.contacted} clients`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const confirmMutation = useMutation({
    mutationFn: async ({ contactId, notes }: { contactId: string; notes?: string }) => {
      const { data, error } = await supabase.functions.invoke("process-session-renewals", {
        body: { action: "confirm", contact_id: contactId, notes },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["renewal-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["renewal-contacts"] });
      toast.success(data.charged ? "Confirmed & card charged!" : "Confirmed! Pending payment.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const declineMutation = useMutation({
    mutationFn: async ({ contactId, notes }: { contactId: string; notes?: string }) => {
      const { data, error } = await supabase.functions.invoke("process-session-renewals", {
        body: { action: "decline", contact_id: contactId, notes },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["renewal-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["renewal-contacts"] });
      toast.info("Marked as declined");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusBadge = (status: string) => {
    const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      pending: { variant: "outline", icon: Clock },
      contacted: { variant: "secondary", icon: Phone },
      confirmed: { variant: "default", icon: CheckCircle },
      declined: { variant: "destructive", icon: XCircle },
      no_response: { variant: "outline", icon: AlertTriangle },
    };
    const s = map[status] || map.pending;
    const Icon = s.icon;
    return (
      <Badge variant={s.variant} className="gap-1 text-xs capitalize">
        <Icon className="h-3 w-3" /> {status.replace("_", " ")}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Proactive Pipeline</h2>
          <p className="text-muted-foreground text-sm">
            Automate renewal outreach — never lose a client to inaction
          </p>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen((open) => !open)}>
          <Plus className="h-4 w-4" /> New Renewal Campaign
        </Button>
      </div>

      {createOpen && (
        <Card className="surface-glass sheen-top p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Create renewal campaign</h3>
              <p className="text-sm text-muted-foreground">Configure timing, message, and outreach channels in context.</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setCreateOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
            <div className="space-y-4">
              <div>
                <Label>Campaign Name</Label>
                <Input
                  placeholder="e.g. Next Session Re-enrollment"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Program / Service (optional)</Label>
                <Select value={form.item_id} onValueChange={(v) => setForm({ ...form, item_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="All programs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All programs</SelectItem>
                    {items?.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.title} {item.price ? `($${item.price})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Days Before Session Ends</Label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={form.days_before_end}
                  onChange={(e) => setForm({ ...form, days_before_end: parseInt(e.target.value) || 14 })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Reach out this many days before the current session ends
                </p>
              </div>
              <div>
                <Label>Outreach Message Template</Label>
                <Textarea
                  rows={4}
                  value={form.message_template}
                  onChange={(e) => setForm({ ...form, message_template: e.target.value })}
                  placeholder="Use {name} and {program} as variables..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Variables: {"{name}"}, {"{program}"}, {"{schedule}"}
                </p>
              </div>
              <div className="space-y-3">
                <Label>Outreach Channels</Label>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">AI Voice Call</span>
                  </div>
                  <Switch checked={form.voice_enabled} onCheckedChange={(v) => setForm({ ...form, voice_enabled: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Email</span>
                  </div>
                  <Switch checked={form.email_enabled} onCheckedChange={(v) => setForm({ ...form, email_enabled: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">SMS</span>
                  </div>
                  <Switch checked={form.sms_enabled} onCheckedChange={(v) => setForm({ ...form, sms_enabled: v })} />
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate(form)}
                disabled={!form.name || createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create Campaign"}
              </Button>
            </div>
        </Card>
      )}

      {/* Campaign List or Detail View */}
      {selectedCampaign ? (
        <CampaignDetail
          campaign={selectedCampaign}
          contacts={campaignContacts || []}
          onBack={() => setSelectedCampaign(null)}
          onScan={() => scanMutation.mutate(selectedCampaign.id)}
          onLaunch={() => launchMutation.mutate(selectedCampaign.id)}
          onConfirm={(contactId, notes) => confirmMutation.mutate({ contactId, notes })}
          onDecline={(contactId, notes) => declineMutation.mutate({ contactId, notes })}
          isScanning={scanMutation.isPending}
          isLaunching={launchMutation.isPending}
          isConfirming={confirmMutation.isPending}
        />
      ) : (
        <>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading campaigns...</p>
          ) : !campaigns?.length ? (
            <Card className="p-12 text-center border-dashed">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Rocket className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No renewal campaigns yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                Create a campaign to follow up before a current period ends, confirm next steps, and keep the relationship organized.
              </p>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Create campaign
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((c: any) => (
                <CampaignCard
                  key={c.id}
                  campaign={c}
                  onClick={() => setSelectedCampaign(c)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CampaignCard({ campaign: c, onClick }: { campaign: any; onClick: () => void }) {
  const total = c.total_contacts || 1;
  const confirmedPct = total > 0 ? ((c.confirmed_count || 0) / total) * 100 : 0;

  const statusColor = {
    draft: "bg-muted text-muted-foreground",
    active: "bg-primary/10 text-primary",
    completed: "bg-green-500/10 text-green-700",
  }[c.status as string] || "bg-muted text-muted-foreground";

  return (
    <Card
      className="p-5 cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-primary/60"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-sm truncate">{c.name}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {c.items?.title || "All programs"} · {c.days_before_end}d before end
          </p>
        </div>
        <Badge className={`text-[10px] ${statusColor} capitalize`}>{c.status}</Badge>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center">
          <p className="text-lg font-bold">{c.total_contacts || 0}</p>
          <p className="text-[10px] text-muted-foreground">Clients</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-primary">{c.confirmed_count || 0}</p>
          <p className="text-[10px] text-muted-foreground">Confirmed</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-destructive">{c.declined_count || 0}</p>
          <p className="text-[10px] text-muted-foreground">Declined</p>
        </div>
      </div>

      <Progress value={confirmedPct} className="h-1.5 mb-2" />

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground flex items-center gap-1">
          <DollarSign className="h-3 w-3" />
          ${(c.revenue_secured || 0).toLocaleString()} secured
        </span>
        <span className="text-destructive/70 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          ${(c.revenue_at_risk || 0).toLocaleString()} at risk
        </span>
      </div>
    </Card>
  );
}

function CampaignDetail({
  campaign: c,
  contacts,
  onBack,
  onScan,
  onLaunch,
  onConfirm,
  onDecline,
  isScanning,
  isLaunching,
  isConfirming,
}: {
  campaign: any;
  contacts: any[];
  onBack: () => void;
  onScan: () => void;
  onLaunch: () => void;
  onConfirm: (contactId: string, notes?: string) => void;
  onDecline: (contactId: string, notes?: string) => void;
  isScanning: boolean;
  isLaunching: boolean;
  isConfirming: boolean;
}) {
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all"
    ? contacts
    : contacts.filter((ct) => ct.outreach_status === filter);

  const total = c.total_contacts || 0;
  const confirmed = c.confirmed_count || 0;
  const declined = c.declined_count || 0;
  const pending = total - confirmed - declined - (c.no_response_count || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
        <div className="flex-1">
          <h3 className="text-xl font-bold">{c.name}</h3>
          <p className="text-sm text-muted-foreground">
            {c.items?.title || "All programs"} · Created {format(new Date(c.created_at), "MMM d, yyyy")}
          </p>
        </div>
        <div className="flex gap-2">
          {c.status === "draft" && (
            <>
              <Button variant="outline" onClick={onScan} disabled={isScanning} className="gap-1.5">
                <Search className="h-4 w-4" />
                {isScanning ? "Scanning..." : "Scan Bookings"}
              </Button>
              {total > 0 && (
                <Button onClick={onLaunch} disabled={isLaunching} className="gap-1.5">
                  <Rocket className="h-4 w-4" />
                  {isLaunching ? "Launching..." : "Launch Outreach"}
                </Button>
              )}
            </>
          )}
          {c.status === "active" && (
            <Button variant="outline" onClick={onLaunch} disabled={isLaunching} className="gap-1.5">
              <RefreshCw className="h-4 w-4" />
              {isLaunching ? "Sending..." : "Re-send to Pending"}
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPICard label="Total Clients" value={total} icon={Users} />
        <KPICard label="Confirmed" value={confirmed} icon={CheckCircle} color="text-primary" />
        <KPICard label="Declined" value={declined} icon={XCircle} color="text-destructive" />
        <KPICard label="Revenue Secured" value={`$${(c.revenue_secured || 0).toLocaleString()}`} icon={DollarSign} color="text-primary" />
        <KPICard label="Revenue at Risk" value={`$${(c.revenue_at_risk || 0).toLocaleString()}`} icon={AlertTriangle} color="text-destructive" />
      </div>

      {/* Conversion Funnel */}
      {total > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Conversion Rate</span>
            <span className="text-sm font-bold text-primary">
              {Math.round((confirmed / total) * 100)}%
            </span>
          </div>
          <Progress value={(confirmed / total) * 100} className="h-3" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{confirmed} confirmed</span>
            <span>{pending} pending</span>
            <span>{declined} declined</span>
          </div>
        </Card>
      )}

      {/* Contact List */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <h4 className="font-semibold">Clients</h4>
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs px-3 h-6">All ({contacts.length})</TabsTrigger>
              <TabsTrigger value="pending" className="text-xs px-3 h-6">Pending</TabsTrigger>
              <TabsTrigger value="contacted" className="text-xs px-3 h-6">Contacted</TabsTrigger>
              <TabsTrigger value="confirmed" className="text-xs px-3 h-6">Confirmed</TabsTrigger>
              <TabsTrigger value="declined" className="text-xs px-3 h-6">Declined</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {filtered.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">
              {contacts.length === 0
                ? "No clients found yet. Click 'Scan Bookings' to find clients with ending periods."
                : "No contacts match this filter."}
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((ct: any) => (
              <Card key={ct.id} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{ct.contact_name}</span>
                      {statusBadgeInline(ct.outreach_status)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {ct.program_name && <span className="font-medium">{ct.program_name}</span>}
                      {ct.current_schedule && <span> · {ct.current_schedule}</span>}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {ct.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{ct.phone}</span>}
                      {ct.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{ct.email}</span>}
                      {ct.charge_amount > 0 && (
                        <span className="flex items-center gap-1 font-medium">
                          <DollarSign className="h-3 w-3" />${ct.charge_amount}
                        </span>
                      )}
                      {ct.card_charged && (
                        <Badge variant="default" className="text-[10px] gap-1">
                          <CreditCard className="h-3 w-3" /> Charged
                        </Badge>
                      )}
                    </div>
                    {ct.outreach_method && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Reached via: {ct.outreach_method}
                        {ct.last_contacted_at && ` · ${format(new Date(ct.last_contacted_at), "MMM d, h:mm a")}`}
                        {ct.attempts > 1 && ` · ${ct.attempts} attempts`}
                      </p>
                    )}
                  </div>

                  {(ct.outreach_status === "pending" || ct.outreach_status === "contacted") && (
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => onConfirm(ct.id)}
                        disabled={isConfirming}
                        className="gap-1"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Confirm & Charge
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDecline(ct.id)}
                        className="gap-1"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Decline
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KPICard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color?: string }) {
  return (
    <Card className="p-3 text-center">
      <Icon className={`h-5 w-5 mx-auto mb-1 ${color || "text-muted-foreground"}`} />
      <p className="text-xl font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </Card>
  );
}

function statusBadgeInline(status: string) {
  const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    pending: { variant: "outline", label: "Pending" },
    contacted: { variant: "secondary", label: "Contacted" },
    confirmed: { variant: "default", label: "Confirmed" },
    declined: { variant: "destructive", label: "Declined" },
    no_response: { variant: "outline", label: "No Response" },
  };
  const s = map[status] || map.pending;
  return <Badge variant={s.variant} className="text-[10px] capitalize">{s.label}</Badge>;
}
