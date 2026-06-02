import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DOMPurify from "dompurify";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Mail, Send, Eye, Trash2, Clock, CheckCircle2, XCircle, Users, Loader2,
  CalendarClock, MousePointerClick, MailOpen, BarChart3, ChevronRight
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EmptyState } from "@/components/ui/empty-state";
import { format } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { cn } from "@/lib/utils";

const COMMON_TIMEZONES = [
  { label: "UTC", value: "UTC" },
  { label: "Eastern (ET)", value: "America/New_York" },
  { label: "Central (CT)", value: "America/Chicago" },
  { label: "Mountain (MT)", value: "America/Denver" },
  { label: "Pacific (PT)", value: "America/Los_Angeles" },
  { label: "London (GMT/BST)", value: "Europe/London" },
  { label: "Paris / Berlin (CET)", value: "Europe/Paris" },
  { label: "Dubai (GST)", value: "Asia/Dubai" },
  { label: "India (IST)", value: "Asia/Kolkata" },
  { label: "Singapore (SGT)", value: "Asia/Singapore" },
  { label: "Tokyo (JST)", value: "Asia/Tokyo" },
  { label: "Sydney (AEDT)", value: "Australia/Sydney" },
];

interface Campaign {
  id: string;
  name: string;
  subject: string | null;
  content: string | null;
  status: string;
  target_list_ids: string[] | null;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
}

interface EmailList {
  id: string;
  name: string;
  color: string;
  subscriber_count?: number;
}

interface CampaignMetrics {
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_clicked: number;
  total_bounced: number;
}

const EmailCampaigns = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [composerOpen, setComposerOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  const [newCampaign, setNewCampaign] = useState({
    name: "",
    subject: "",
    content: "",
    targetLists: [] as string[],
    scheduleDate: undefined as Date | undefined,
    scheduleTime: "08:30",
    scheduleTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    isScheduled: false,
  });

  const { data: workspace } = useQuery({
    queryKey: ["workspace"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("workspaces").select("id").eq("owner_id", user.id).single();
      return data;
    },
  });

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["email-campaigns", workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      const { data, error } = await supabase
        .from("email_campaigns")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Campaign[];
    },
    enabled: !!workspace?.id,
  });

  const { data: emailLists } = useQuery({
    queryKey: ["email-lists", workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      const { data: lists, error } = await supabase
        .from("email_lists")
        .select("id, name, color")
        .eq("workspace_id", workspace.id)
        .eq("is_active", true);
      if (error) throw error;
      const listsWithCounts = await Promise.all(
        (lists || []).map(async (list) => {
          const { count } = await supabase
            .from("email_list_subscribers")
            .select("*", { count: "exact", head: true })
            .eq("list_id", list.id)
            .eq("status", "active");
          return { ...list, subscriber_count: count || 0 };
        })
      );
      return listsWithCounts as EmailList[];
    },
    enabled: !!workspace?.id,
  });

  const { data: campaignMetrics } = useQuery({
    queryKey: ["campaign-metrics", selectedCampaign?.id],
    queryFn: async () => {
      if (!selectedCampaign?.id) return null;
      const { data, error } = await supabase
        .from("email_campaign_metrics")
        .select("*")
        .eq("campaign_id", selectedCampaign.id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data as CampaignMetrics | null;
    },
    enabled: !!selectedCampaign?.id,
  });

  const createCampaign = useMutation({
    mutationFn: async () => {
      if (!workspace?.id) throw new Error("No workspace");
      let scheduledAt: string | null = null;
      if (newCampaign.isScheduled && newCampaign.scheduleDate) {
        const [hours, minutes] = newCampaign.scheduleTime.split(":").map(Number);
        const localDt = new Date(newCampaign.scheduleDate);
        localDt.setHours(hours, minutes, 0, 0);
        scheduledAt = fromZonedTime(localDt, newCampaign.scheduleTimezone).toISOString();
      }
      const { error } = await supabase.from("email_campaigns").insert({
        workspace_id: workspace.id,
        name: newCampaign.name,
        subject: newCampaign.subject,
        content: newCampaign.content,
        target_list_ids: newCampaign.targetLists,
        status: scheduledAt ? "scheduled" : "draft",
        scheduled_at: scheduledAt,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
      toast({ title: newCampaign.isScheduled ? "Campaign scheduled!" : "Campaign saved as draft" });
      setComposerOpen(false);
      setNewCampaign({ name: "", subject: "", content: "", targetLists: [], scheduleDate: undefined, scheduleTime: "08:30", scheduleTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", isScheduled: false });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase.from("email_campaigns").delete().eq("id", campaignId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
      toast({ title: "Campaign deleted" });
      setSelectedCampaign(null);
    },
  });

  const sendCampaign = async (campaignId: string, testEmailAddress?: string) => {
    if (!workspace?.id) return;
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-campaign-email", {
        body: { campaignId, workspaceId: workspace.id, testEmail: testEmailAddress },
      });
      if (error) throw error;
      if (data.success) {
        if (testEmailAddress) {
          toast({ title: "Test sent!", description: `Delivered to ${testEmailAddress}` });
        } else {
          toast({ title: "Campaign sent!", description: `${data.stats.sent} emails delivered` });
          queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
          queryClient.invalidateQueries({ queryKey: ["campaign-metrics"] });
        }
      } else {
        throw new Error(data.error || "Failed to send");
      }
    } catch (error: any) {
      toast({ title: "Send failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const statusBadge = (status: string, scheduledAt?: string | null) => {
    switch (status) {
      case "draft": return <Badge variant="secondary" className="gap-1 text-[10px]"><Clock className="h-2.5 w-2.5" />Draft</Badge>;
      case "scheduled": return <Badge variant="outline" className="gap-1 text-[10px] border-amber-400/40 bg-amber-400/10 text-amber-600 dark:text-amber-400"><CalendarClock className="h-2.5 w-2.5" />{scheduledAt ? format(new Date(scheduledAt), "MMM d") : "Scheduled"}</Badge>;
      case "sending": return <Badge className="gap-1 text-[10px]"><Loader2 className="h-2.5 w-2.5 animate-spin" />Sending</Badge>;
      case "sent": return <Badge className="gap-1 text-[10px] bg-emerald-600 text-white"><CheckCircle2 className="h-2.5 w-2.5" />Sent</Badge>;
      case "failed": return <Badge variant="destructive" className="gap-1 text-[10px]"><XCircle className="h-2.5 w-2.5" />Failed</Badge>;
      default: return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
    }
  };

  const totalSent = campaigns?.filter(c => c.status === "sent").length || 0;
  const totalScheduled = campaigns?.filter(c => c.status === "scheduled").length || 0;
  const totalDrafts = campaigns?.filter(c => c.status === "draft").length || 0;
  const totalSubscribers = newCampaign.targetLists.reduce((sum, id) => sum + (emailLists?.find(l => l.id === id)?.subscriber_count || 0), 0);

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Top bar */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium mb-0.5">Growth</p>
          <h1 className="text-2xl font-bold tracking-tight">Email Campaigns</h1>
        </div>
        <Button onClick={() => setComposerOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Campaign
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
        {[
          { label: "Total", value: campaigns?.length || 0, color: "text-foreground" },
          { label: "Sent", value: totalSent, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Scheduled", value: totalScheduled, color: "text-amber-600 dark:text-amber-400" },
          { label: "Drafts", value: totalDrafts, color: "text-muted-foreground" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border bg-card px-4 py-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">{label}</p>
            <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Main content */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !campaigns?.length ? (
        <EmptyState
          icon={Mail}
          title="No campaigns yet"
          description="Create your first email campaign to reach your subscribers."
          action={<Button onClick={() => setComposerOpen(true)} size="lg" className="gap-2"><Plus className="h-4 w-4" />Create Campaign</Button>}
        />
      ) : (
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Left: campaign list */}
          <div className="flex flex-col gap-3 w-full xl:w-[420px] shrink-0 overflow-y-auto">
            <Tabs defaultValue="all">
              <TabsList className="w-full">
                <TabsTrigger value="all" className="flex-1">All ({campaigns.length})</TabsTrigger>
                <TabsTrigger value="draft" className="flex-1">Drafts ({totalDrafts})</TabsTrigger>
                <TabsTrigger value="scheduled" className="flex-1">Scheduled ({totalScheduled})</TabsTrigger>
                <TabsTrigger value="sent" className="flex-1">Sent ({totalSent})</TabsTrigger>
              </TabsList>

              {["all", "draft", "scheduled", "sent"].map(tab => (
                <TabsContent key={tab} value={tab} className="mt-3 space-y-2">
                  {(tab === "all" ? campaigns : campaigns.filter(c => c.status === tab)).map(campaign => {
                    const listNames = campaign.target_list_ids?.map(id => emailLists?.find(l => l.id === id)?.name).filter(Boolean) || [];
                    const isSelected = selectedCampaign?.id === campaign.id;
                    return (
                      <button
                        key={campaign.id}
                        onClick={() => setSelectedCampaign(campaign)}
                        className={cn(
                          "w-full text-left rounded-xl border px-4 py-3.5 transition-all hover:border-primary/30 hover:bg-muted/30",
                          isSelected && "border-primary/50 bg-primary/5"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm truncate">{campaign.name}</p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{campaign.subject || "No subject"}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {statusBadge(campaign.status, campaign.scheduled_at)}
                            <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", isSelected && "rotate-90")} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-1">
                            {listNames.slice(0, 2).map((n, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] py-0 h-4">{n}</Badge>
                            ))}
                            {listNames.length > 2 && <Badge variant="outline" className="text-[10px] py-0 h-4">+{listNames.length - 2}</Badge>}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {campaign.sent_at ? format(new Date(campaign.sent_at), "MMM d") : format(new Date(campaign.created_at), "MMM d")}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </TabsContent>
              ))}
            </Tabs>
          </div>

          {/* Right: detail panel */}
          <div className="hidden xl:flex flex-1 min-w-0">
            {selectedCampaign ? (
              <div className="w-full rounded-xl border bg-card overflow-hidden flex flex-col">
                {/* Detail header */}
                <div className="px-6 py-5 border-b bg-muted/20 shrink-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {statusBadge(selectedCampaign.status, selectedCampaign.scheduled_at)}
                      </div>
                      <h2 className="text-xl font-bold truncate">{selectedCampaign.name}</h2>
                      <p className="text-sm text-muted-foreground mt-0.5">Subject: {selectedCampaign.subject || "No subject"}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => { if (confirm(`Delete "${selectedCampaign.name}"?`)) deleteCampaign.mutate(selectedCampaign.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Send controls */}
                  <div className="flex gap-2 mt-4">
                    <Input
                      placeholder="Send test to email…"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      className="h-8 text-sm flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => sendCampaign(selectedCampaign.id, testEmail)}
                      disabled={!testEmail || isSending}
                    >
                      {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Test"}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => sendCampaign(selectedCampaign.id)}
                      disabled={isSending || selectedCampaign.status === "sent"}
                      className="gap-1.5"
                    >
                      {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Send
                    </Button>
                  </div>
                </div>

                {/* Metrics (if sent) */}
                {selectedCampaign.status === "sent" && campaignMetrics && (
                  <div className="grid grid-cols-4 divide-x border-b shrink-0">
                    {[
                      { icon: Send, label: "Sent", value: campaignMetrics.total_sent },
                      { icon: CheckCircle2, label: "Delivered", value: campaignMetrics.total_delivered },
                      { icon: MailOpen, label: "Opened", value: campaignMetrics.total_opened },
                      { icon: MousePointerClick, label: "Clicked", value: campaignMetrics.total_clicked },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="px-4 py-3 text-center">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-1" />
                        <p className="text-lg font-bold">{value}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Email body preview */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="rounded-lg border bg-background p-6 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedCampaign.content || "<p class='text-muted-foreground'>No content</p>") }}
                  />
                </div>
              </div>
            ) : (
              <div className="w-full rounded-xl border border-dashed flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Select a campaign to preview and send</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Composer Sheet */}
      <Sheet open={composerOpen} onOpenChange={setComposerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0 gap-0">
          <SheetHeader className="px-6 py-5 border-b bg-muted/30 shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Mail className="h-4 w-4 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-base">New Campaign</SheetTitle>
                <SheetDescription className="text-xs mt-0.5">Compose, target, and schedule your email campaign.</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Campaign Name *</Label>
                <Input placeholder="e.g. Summer Registration" value={newCampaign.name} onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Subject Line *</Label>
                <Input placeholder="What recipients see" value={newCampaign.subject} onChange={(e) => setNewCampaign({ ...newCampaign, subject: e.target.value })} className="h-9" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Target Lists</Label>
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2 max-h-36 overflow-y-auto">
                {!emailLists?.length ? (
                  <p className="text-xs text-muted-foreground py-2 text-center">No email lists yet.</p>
                ) : emailLists.map((list) => (
                  <label key={list.id} className="flex items-center gap-3 p-1.5 rounded-md hover:bg-accent/50 cursor-pointer transition-colors">
                    <Checkbox
                      checked={newCampaign.targetLists.includes(list.id)}
                      onCheckedChange={(checked) => setNewCampaign({
                        ...newCampaign,
                        targetLists: checked ? [...newCampaign.targetLists, list.id] : newCampaign.targetLists.filter(id => id !== list.id),
                      })}
                    />
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: list.color }} />
                    <span className="text-sm flex-1">{list.name}</span>
                    <Badge variant="secondary" className="text-[10px]"><Users className="h-2.5 w-2.5 mr-1" />{list.subscriber_count}</Badge>
                  </label>
                ))}
              </div>
              {newCampaign.targetLists.length > 0 && (
                <p className="text-xs text-primary font-medium flex items-center gap-1.5">
                  <Users className="h-3 w-3" />{totalSubscribers} recipients across {newCampaign.targetLists.length} list{newCampaign.targetLists.length > 1 ? "s" : ""}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email Content</Label>
              <RichTextEditor
                placeholder="Write your email content here…"
                value={newCampaign.content}
                onChange={(html) => setNewCampaign({ ...newCampaign, content: html })}
                minHeight="12rem"
              />
            </div>

            <div className="rounded-lg border p-4 space-y-3 bg-muted/10">
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={newCampaign.isScheduled}
                  onCheckedChange={(checked) => setNewCampaign({ ...newCampaign, isScheduled: !!checked })}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">Schedule for later</p>
                  <p className="text-xs text-muted-foreground">Pick a date and time to send automatically</p>
                </div>
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
              </label>

              {newCampaign.isScheduled && (
                <div className="flex gap-4 items-start pt-1">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs">Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal", !newCampaign.scheduleDate && "text-muted-foreground")}>
                          <CalendarClock className="h-3.5 w-3.5 mr-2" />
                          {newCampaign.scheduleDate ? format(newCampaign.scheduleDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={newCampaign.scheduleDate} onSelect={(d) => setNewCampaign({ ...newCampaign, scheduleDate: d })} disabled={(d) => d < new Date()} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="w-28 space-y-1.5">
                    <Label className="text-xs">Time</Label>
                    <Input type="time" value={newCampaign.scheduleTime} onChange={(e) => setNewCampaign({ ...newCampaign, scheduleTime: e.target.value })} className="h-8" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs">Timezone</Label>
                    <Select
                      value={newCampaign.scheduleTimezone}
                      onValueChange={(tz) => setNewCampaign({ ...newCampaign, scheduleTimezone: tz })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMON_TIMEZONES.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value} className="text-xs">
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </div>

          <SheetFooter className="px-6 py-4 border-t bg-muted/20 shrink-0 flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setComposerOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              onClick={() => createCampaign.mutate()}
              disabled={!newCampaign.name || !newCampaign.subject || createCampaign.isPending || (newCampaign.isScheduled && !newCampaign.scheduleDate)}
              className="gap-1.5"
            >
              {createCampaign.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {newCampaign.isScheduled ? <><CalendarClock className="h-3.5 w-3.5" />Schedule</> : <><Plus className="h-3.5 w-3.5" />Save Draft</>}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default EmailCampaigns;
