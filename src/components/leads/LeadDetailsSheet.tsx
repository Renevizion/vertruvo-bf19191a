import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';

import { parseActivityDescription } from "@/lib/activity-format";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Mail, Phone, Building2, DollarSign, Calendar, StickyNote, CheckSquare, MessageSquare,
  Video, Trash2, ArrowRightLeft, ShoppingCart, PhoneCall, Megaphone, Instagram, Send,
  FileText, UserPlus, Loader2, Pencil, Save, X, ExternalLink, ChevronDown, ChevronUp,
  Sparkles, Flame, MoreHorizontal, Copy, Check
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeadIntelligenceStrip } from "@/components/leads/LeadIntelligenceStrip";
import { AIOutreachDrawer } from "@/components/leads/AIOutreachDrawer";
import type { SuggestedMove } from "@/lib/lead-signals";
import { useAgentSettings } from "@/hooks/useAgentSettings";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { PointOfSaleDialog } from "@/components/pos/PointOfSaleDialog";
import { cn } from "@/lib/utils";

interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  value: number;
  notes?: string;
  company?: string;
  stage_id: string | null;
  pipeline_id: string | null;
  created_at: string;
}

interface Activity {
  id: string;
  type: string;
  title: string | null;
  description: string | null;
  created_at: string;
}

interface UnifiedTimelineItem {
  id: string;
  type: 'activity' | 'call' | 'sale' | 'email';
  title: string;
  description: string | null;
  created_at: string;
  icon_type: string;
  meta?: Record<string, unknown>;
}

const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";

const TimelineDescription = ({ description }: { description: string }) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const parsed = parseActivityDescription(description);
  if (!parsed) return null;

  const hasDetails = parsed.details && Object.keys(parsed.details).length > 0;
  const hasEmailBody = !!parsed.emailBody;

  return (
    <div className="mt-1 space-y-1">
      <p className="text-sm text-muted-foreground">{parsed.summary}</p>
      {hasEmailBody && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setShowEmail(!showEmail); }}
            className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
          >
            <Mail className="h-3 w-3" />
            {showEmail ? 'Hide message' : 'View sent message'}
          </button>
          {showEmail && (
            <div className="border rounded-lg p-3 mt-1 bg-muted/30 text-sm whitespace-pre-wrap">
              {parsed.emailBody}
            </div>
          )}
        </>
      )}
      {hasDetails && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:underline"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? 'Hide details' : 'View details'}
          </button>
          {expanded && parsed.details && (
            <div className="border rounded-lg divide-y mt-1 text-sm">
              {Object.entries(parsed.details).map(([key, value]) => (
                <div key={key} className="flex gap-4 p-2">
                  <span className="text-muted-foreground min-w-[100px] capitalize text-xs">{key}</span>
                  <span className="text-xs font-medium flex-1 break-all">{value}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

interface LeadDetailsSheetProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadDeleted?: () => void;
  onLeadUpdated?: () => void;
}

export const LeadDetailsSheet = ({ lead, open, onOpenChange, onLeadDeleted, onLeadUpdated }: LeadDetailsSheetProps) => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [unifiedTimeline, setUnifiedTimeline] = useState<UnifiedTimelineItem[]>([]);
  const [pipelines, setPipelines] = useState<Array<{id: string, name: string}>>([]);
  const [posOpen, setPosOpen] = useState(false);
  const [submissionDetail, setSubmissionDetail] = useState<Record<string, any> | null>(null);
  const [hasCustomerAccount, setHasCustomerAccount] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [sendEmailOnCreate, setSendEmailOnCreate] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sendingOutreach, setSendingOutreach] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', company: '', value: 0, notes: '', source: '' });
  const [originalForm, setOriginalForm] = useState(editForm);
  const [outreachOpen, setOutreachOpen] = useState(false);
  const [quickTaskOpen, setQuickTaskOpen] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const { enabled: agentEnabled } = useAgentSettings();
  const { toast } = useToast();

  useEffect(() => { fetchPipelines(); }, []);

  useEffect(() => {
    if (lead) {
      const next = {
        name: lead.name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        company: lead.company || '',
        value: lead.value || 0,
        notes: lead.notes || '',
        source: lead.source || '',
      };
      // Restore in-progress draft if present (sessionStorage, scoped to this lead)
      try {
        const stash = sessionStorage.getItem(`lead-edit-draft:${lead.id}`);
        if (stash) {
          const draft = JSON.parse(stash);
          setEditForm({ ...next, ...draft });
          setOriginalForm(next);
          setIsEditing(true);
        } else {
          setEditForm(next);
          setOriginalForm(next);
          setIsEditing(false);
        }
      } catch {
        setEditForm(next);
        setOriginalForm(next);
        setIsEditing(false);
      }
      supabase
        .from("leads")
        .select("customer_user_id")
        .eq("id", lead.id)
        .maybeSingle()
        .then(({ data }) => setHasCustomerAccount(!!data?.customer_user_id));
    }
  }, [lead?.id, open]);

  // Compute dirty + persist draft on every keystroke while editing.
  const isDirty = isEditing && JSON.stringify(editForm) !== JSON.stringify(originalForm);
  useEffect(() => {
    if (!lead?.id || !isEditing) return;
    if (isDirty) {
      try { sessionStorage.setItem(`lead-edit-draft:${lead.id}`, JSON.stringify(editForm)); } catch {}
    }
  }, [editForm, isEditing, isDirty, lead?.id]);

  const fetchPipelines = async () => {
    const { data } = await supabase.from("pipelines").select("id, name").order("created_at");
    setPipelines(data || []);
  };

  const handleSaveEdit = async () => {
    if (!lead) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('leads')
        .update({
          name: editForm.name,
          email: editForm.email || null,
          phone: editForm.phone || null,
          company: editForm.company || null,
          value: editForm.value,
          notes: editForm.notes || null,
          source: editForm.source || null,
        })
        .eq('id', lead.id);
      if (error) throw error;
      toast({ title: "Lead updated", description: "Changes saved successfully" });
      setIsEditing(false);
      setOriginalForm(editForm);
      try { sessionStorage.removeItem(`lead-edit-draft:${lead.id}`); } catch {}
      onLeadUpdated?.();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save changes", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendAIOutreach = async () => {
    if (!lead?.email) {
      toast({ title: "No email", description: "This lead has no email address", variant: "destructive" });
      return;
    }
    setSendingOutreach(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-lead-outreach', { body: { leadId: lead.id } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Outreach sent", description: `AI-crafted email sent to ${lead.email}` });
      fetchActivities();
      fetchUnifiedTimeline();
    } catch (err: any) {
      toast({ title: "Failed to send", description: err.message || "Could not send AI outreach", variant: "destructive" });
    } finally {
      setSendingOutreach(false);
    }
  };

  const handlePipelineChange = async (newPipelineId: string) => {
    if (!lead) return;
    const { error } = await supabase.from("leads").update({ pipeline_id: newPipelineId, stage_id: null }).eq("id", lead.id);
    if (error) {
      toast({ title: "Error", description: "Failed to move lead to pipeline", variant: "destructive" });
    } else {
      toast({ title: "Moved", description: "Lead moved to new pipeline" });
      onLeadUpdated?.();
    }
  };

  useEffect(() => {
    if (lead?.id) {
      fetchActivities();
      fetchUnifiedTimeline();
    }
  }, [lead?.id]);

  const fetchActivities = async () => {
    if (!lead?.id) return;
    const { data, error } = await supabase
      .from("activities")
      .select("*")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false });
    if (!error && data) setActivities(data);
  };

  const fetchUnifiedTimeline = async () => {
    if (!lead?.id) return;
    const timeline: UnifiedTimelineItem[] = [];

    const { data: acts } = await supabase
      .from("activities").select("*").eq("lead_id", lead.id)
      .order("created_at", { ascending: false }).limit(50);
    acts?.forEach(a => timeline.push({
      id: a.id, type: 'activity', title: a.title || a.type,
      description: a.description, created_at: a.created_at, icon_type: a.type,
    }));

    const { data: calls } = await supabase
      .from("call_logs").select("id, phone_number, status, duration, summary, created_at")
      .eq("lead_id", lead.id).order("created_at", { ascending: false }).limit(20);
    calls?.forEach(c => timeline.push({
      id: c.id, type: 'call',
      title: `${c.status === 'completed' ? 'Call completed' : `Call (${c.status})`} — ${c.phone_number}`,
      description: c.summary || (c.duration ? `Duration: ${Math.floor(c.duration / 60)}m ${c.duration % 60}s` : null),
      created_at: c.created_at, icon_type: 'call',
    }));

    const { data: sales } = await supabase
      .from("sales").select("id, total, payment_method, status, created_at")
      .eq("lead_id", lead.id).order("created_at", { ascending: false }).limit(20);
    sales?.forEach(s => timeline.push({
      id: s.id, type: 'sale', title: `Sale — $${Number(s.total).toFixed(2)}`,
      description: `Payment: ${s.payment_method} • Status: ${s.status}`,
      created_at: s.created_at, icon_type: 'sale',
    }));

    timeline.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setUnifiedTimeline(timeline);
  };

  const getTimelineIcon = (iconType: string) => {
    const cls = "h-4 w-4";
    switch (iconType) {
      case "note": return <StickyNote className={cls} />;
      case "email": return <Mail className={cls} />;
      case "call": return <PhoneCall className={cn(cls, "text-success")} />;
      case "meeting": return <Video className={cls} />;
      case "task": return <CheckSquare className={cls} />;
      case "sale": return <ShoppingCart className={cn(cls, "text-primary")} />;
      case "social": return <Instagram className={cls} />;
      case "voicemail": return <Phone className={cn(cls, "text-warning")} />;
      case "campaign": return <Megaphone className={cn(cls, "text-primary")} />;
      case "form_submitted": return <FileText className={cn(cls, "text-primary")} />;
      default: return <MessageSquare className={cls} />;
    }
  };

  const getActivityIcon = (type: string) => getTimelineIcon(type);

  const handleCreateCustomerAccount = async () => {
    if (!lead?.email) {
      toast({ title: "Email required", description: "This lead needs an email address.", variant: "destructive" });
      return;
    }
    setCreatingCustomer(true);
    try {
      const nameParts = lead.name.split(" ");
      const { data, error } = await supabase.functions.invoke("create-customer-account", {
        body: {
          lead_id: lead.id, email: lead.email,
          first_name: nameParts[0] || lead.name,
          last_name: nameParts.slice(1).join(" ") || "",
          send_email: sendEmailOnCreate,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setHasCustomerAccount(true);
      toast({
        title: "Customer account created",
        description: sendEmailOnCreate ? "Account created and setup link emailed" : "Account created (no email sent)",
      });
      onLeadUpdated?.();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create customer account", variant: "destructive" });
    } finally {
      setCreatingCustomer(false);
    }
  };

  const handleDelete = async () => {
    if (!lead) return;
    setIsDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: logError } = await supabase.from('deleted_leads').insert({
        original_lead_id: lead.id, name: lead.name, email: lead.email, phone: lead.phone,
        company: lead.company, source: lead.source, value: lead.value, notes: lead.notes,
        stage_id: lead.stage_id, created_at: lead.created_at, deleted_by: user?.id
      });
      if (logError) throw logError;
      const { error: deleteError } = await supabase.from('leads').delete().eq('id', lead.id);
      if (deleteError) throw deleteError;
      toast({ title: "Lead deleted", description: "Moved to deleted items (45-day retention)" });
      onOpenChange(false);
      onLeadDeleted?.();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete lead", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const copy = (label: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  if (!lead) return null;

  const score = (lead as any).score ?? 0;
  const isHot = score >= 20;
  const ageLabel = formatDistanceToNow(new Date(lead.created_at), { addSuffix: true });

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        className="w-full sm:max-w-2xl p-0 flex flex-col shadow-2xl"
        onInteractOutside={(e) => {
          // Keep board fully interactive — never auto-close on outside clicks
          e.preventDefault();
        }}
      >
        {/* HERO HEADER — gradient surface, avatar, identity, quick actions */}
        <div className="relative px-6 pt-6 pb-5 border-b border-border/60 bg-gradient-to-br from-primary/[0.06] via-background to-background">
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.4] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.06) 1px, transparent 0)',
              backgroundSize: '14px 14px',
            }}
          />
          <div className="relative flex items-start gap-4">
            {/* Avatar */}
            <div className="flex-shrink-0 h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20 flex items-center justify-center text-base font-semibold text-primary shadow-sm">
              {initialsOf(lead.name)}
            </div>

            {/* Identity */}
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <Input
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="text-xl font-semibold h-9 max-w-[320px]"
                />
              ) : (
                <h2 className="text-xl font-semibold text-foreground tracking-tight truncate">{lead.name}</h2>
              )}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {lead.company && !isEditing && (
                  <span className="text-sm text-muted-foreground inline-flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" /> {lead.company}
                  </span>
                )}
                {lead.source && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{lead.source}</Badge>
                )}
                <span className="text-[11px] text-muted-foreground">· Added {ageLabel}</span>
                {isHot && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-warning/15 text-warning ring-1 ring-warning/30">
                    <Flame className="h-2.5 w-2.5" /> Hot · {score}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5">
              {isEditing ? (
                <>
                  <Button size="sm" onClick={handleSaveEdit} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" onClick={() => setPosOpen(true)} className="shadow-sm">
                    <ShoppingCart className="h-4 w-4 mr-1.5" /> Sell
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setIsEditing(true)}>
                        <Pencil className="h-4 w-4 mr-2" /> Edit lead
                      </DropdownMenuItem>
                      {lead.email && (
                        <DropdownMenuItem onClick={() => setOutreachOpen(true)}>
                          <Sparkles className="h-4 w-4 mr-2" /> Send AI outreach
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => navigate(`/booking-sheet?leadId=${lead.id}`)}>
                        <Calendar className="h-4 w-4 mr-2" /> Book appointment
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" /> Delete lead
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
                            <AlertDialogDescription>
                              The lead will be moved to deleted items and stored for 45 days before permanent deletion.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDelete}
                              disabled={isDeleting}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {isDeleting ? "Deleting..." : "Delete"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          </div>

          {/* Stat strip */}
          <div className="relative grid grid-cols-3 gap-3 mt-5">
            <div className="rounded-xl border border-border/60 bg-card/70 backdrop-blur-sm p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Value</p>
              {isEditing ? (
                <Input
                  type="number"
                  value={editForm.value}
                  onChange={e => setEditForm(f => ({ ...f, value: Number(e.target.value) }))}
                  className="h-7 mt-1 text-base font-semibold p-1"
                />
              ) : (
                <p className="text-lg font-semibold text-foreground tabular-nums mt-0.5">
                  ${lead.value.toLocaleString()}
                </p>
              )}
            </div>
            <div className="rounded-xl border border-border/60 bg-card/70 backdrop-blur-sm p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Pipeline</p>
              <Select value={lead.pipeline_id || ""} onValueChange={handlePipelineChange}>
                <SelectTrigger className="h-7 mt-0.5 border-0 bg-transparent p-0 text-sm font-medium text-foreground hover:text-primary focus:ring-0 shadow-none">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-xl border border-border/60 bg-card/70 backdrop-blur-sm p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Activity</p>
              <p className="text-lg font-semibold text-foreground tabular-nums mt-0.5">
                {unifiedTimeline.length}
                <span className="text-xs font-normal text-muted-foreground ml-1">touches</span>
              </p>
            </div>
          </div>
        </div>

        {/* BODY */}
        <ScrollArea className="flex-1">
          <div className="px-6 py-5 space-y-5">
            {/* CONTACT QUICK STRIP */}
            <TooltipProvider>
              <div className="flex flex-wrap gap-2">
                {isEditing ? (
                  <div className="w-full grid gap-2">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" className="h-8" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone" className="h-8" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Input value={editForm.company} onChange={e => setEditForm(f => ({ ...f, company: e.target.value }))} placeholder="Company" className="h-8" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Input value={editForm.source} onChange={e => setEditForm(f => ({ ...f, source: e.target.value }))} placeholder="Source" className="h-8" />
                    </div>
                  </div>
                ) : (
                  <>
                    {lead.email && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => copy('email', lead.email!)}
                            className="group inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border/70 bg-muted/30 hover:bg-muted/60 hover:border-primary/40 transition-colors text-sm text-foreground"
                          >
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="truncate max-w-[200px]">{lead.email}</span>
                            {copied === 'email' ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Click to copy</TooltipContent>
                      </Tooltip>
                    )}
                    {lead.phone && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => copy('phone', lead.phone!)}
                            className="group inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border/70 bg-muted/30 hover:bg-muted/60 hover:border-primary/40 transition-colors text-sm text-foreground"
                          >
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{lead.phone}</span>
                            {copied === 'phone' ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Click to copy</TooltipContent>
                      </Tooltip>
                    )}
                    {!lead.email && !lead.phone && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1.5"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Add contact info
                      </button>
                    )}
                  </>
                )}
              </div>
            </TooltipProvider>

            {/* SMART CONVERSION CARDS — only when relevant */}
            {lead.email && !hasCustomerAccount && (
              <div className="rounded-xl border border-primary/15 bg-gradient-to-br from-primary/[0.04] to-transparent p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center flex-shrink-0">
                    <UserPlus className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">Promote to customer</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Create a portal login so this client can manage bookings and view their history.
                    </p>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer pl-11">
                  <input
                    type="checkbox"
                    checked={sendEmailOnCreate}
                    onChange={e => setSendEmailOnCreate(e.target.checked)}
                    className="rounded border-border"
                  />
                  Email setup link to {lead.email}
                </label>
                <Button size="sm" className="w-full" onClick={handleCreateCustomerAccount} disabled={creatingCustomer}>
                  {creatingCustomer ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Creating…</> : <><UserPlus className="h-3.5 w-3.5 mr-1.5" /> Create customer account</>}
                </Button>
              </div>
            )}

            {hasCustomerAccount && (
              <div className="rounded-xl border border-success/20 bg-success/5 p-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-success/15 flex items-center justify-center">
                  <Check className="h-4 w-4 text-success" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Customer account active</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate('/customers')}>
                  View <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </div>
            )}

            {lead.source === "booking_page" && lead.value === 0 && (
              <div className="rounded-xl border border-warning/25 bg-warning/5 p-3 flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-warning/15 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-4 w-4 text-warning" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">Convert this trial</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    They booked a trial — offer a package or membership to lock in recurring revenue.
                  </p>
                  <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={() => setPosOpen(true)}>
                    <ShoppingCart className="h-3 w-3 mr-1" /> Sell a package
                  </Button>
                </div>
              </div>
            )}

            {/* NOTES (inline, collapsed if empty) */}
            {(lead.notes || isEditing) && (
              <div className="rounded-xl border border-border/60 bg-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</p>
                  {!isEditing && (
                    <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setIsEditing(true)}>
                      <Pencil className="h-3 w-3 mr-1" /> Edit
                    </Button>
                  )}
                </div>
                {isEditing ? (
                  <Textarea
                    value={editForm.notes}
                    onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Add notes about this lead..."
                    rows={3}
                  />
                ) : (
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{lead.notes}</p>
                )}
              </div>
            )}

            {/* INTELLIGENCE STRIP */}
            <LeadIntelligenceStrip
              lead={lead}
              activities={activities}
              stageName={null}
              agentEnabled={agentEnabled}
              onAction={(move: SuggestedMove) => {
                switch (move.action) {
                  case 'send_email':
                    if (lead.email) setOutreachOpen(true);
                    else setIsEditing(true);
                    break;
                  case 'call':
                    if (lead.phone) window.location.href = `tel:${lead.phone}`;
                    break;
                  case 'book':
                    navigate(`/booking-sheet?leadId=${lead.id}`);
                    break;
                  case 'sell':
                    setPosOpen(true);
                    break;
                  case 'add_contact':
                    setIsEditing(true);
                    break;
                  case 'task':
                    setQuickTaskTitle(`Follow up with ${lead.name}`);
                    setQuickTaskOpen(true);
                    break;
                  case 'advance_stage':
                  default:
                    setIsEditing(true);
                    break;
                }
              }}
            />

            {/* TIMELINE TABS */}
            <Tabs defaultValue="outreach" className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-9 p-1 bg-muted/60">
                <TabsTrigger value="outreach" className="text-xs">Timeline</TabsTrigger>
                <TabsTrigger value="tasks" className="text-xs">Tasks</TabsTrigger>
                <TabsTrigger value="appointments" className="text-xs">Appointments</TabsTrigger>
              </TabsList>

              <TabsContent value="outreach" className="mt-4">
                {unifiedTimeline.length === 0 ? (
                  <div className="text-center py-10 px-4 rounded-xl border border-dashed border-border/60 bg-muted/20">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-sm font-medium text-foreground">No activity yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Calls, emails, sales, and form submissions will appear here.</p>
                    {lead.email && (
                      <Button size="sm" variant="outline" className="mt-3 h-8 text-xs" onClick={handleSendAIOutreach} disabled={sendingOutreach}>
                        <Sparkles className="h-3 w-3 mr-1" /> Send first outreach
                      </Button>
                    )}
                  </div>
                ) : (
                  <ol className="relative space-y-3 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-border/60">
                    {unifiedTimeline.map((item) => (
                      <li
                        key={`${item.type}-${item.id}`}
                        className={cn(
                          "relative pl-10 pr-3 py-2.5 rounded-lg hover:bg-muted/40 transition-colors",
                          item.icon_type === 'form_submitted' && 'cursor-pointer'
                        )}
                        onClick={() => {
                          if (item.icon_type === 'form_submitted' && item.description) {
                            try { setSubmissionDetail(JSON.parse(item.description)); } catch { /* noop */ }
                          }
                        }}
                      >
                        <div className="absolute left-0 top-2.5 h-8 w-8 rounded-full bg-background ring-1 ring-border flex items-center justify-center">
                          {getTimelineIcon(item.icon_type)}
                        </div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground leading-tight">{item.title}</p>
                            {item.icon_type === 'form_submitted' ? (
                              <p className="text-xs text-primary mt-1">Click to view submission details</p>
                            ) : item.description ? (
                              <TimelineDescription description={item.description} />
                            ) : null}
                          </div>
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap tabular-nums">
                            {format(new Date(item.created_at), "MMM dd")}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </TabsContent>

              <TabsContent value="tasks" className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Tasks attached to this lead</p>
                  <CreateTaskDialog
                    leadId={lead.id}
                    onSuccess={fetchActivities}
                    trigger={
                      <Button size="sm" variant="outline" className="h-8 text-xs">
                        <CheckSquare className="h-3.5 w-3.5 mr-1.5" /> New task
                      </Button>
                    }
                  />
                </div>
                <div className="text-center py-10 px-4 rounded-xl border border-dashed border-border/60 bg-muted/20">
                  <CheckSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-sm font-medium text-foreground">No tasks yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Create a follow-up to keep this lead moving.</p>
                </div>
              </TabsContent>

              <TabsContent value="appointments" className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Bookings linked to this lead</p>
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => navigate(`/booking-sheet?leadId=${lead.id}`)}>
                    <Calendar className="h-3.5 w-3.5 mr-1.5" /> Book now
                  </Button>
                </div>
                <div className="text-center py-10 px-4 rounded-xl border border-dashed border-border/60 bg-muted/20">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-sm font-medium text-foreground">No appointments scheduled</p>
                  <p className="text-xs text-muted-foreground mt-1">Use Book Now to schedule on the Booking Sheet.</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>

    <PointOfSaleDialog
      open={posOpen}
      onOpenChange={setPosOpen}
      lead={lead ? { id: lead.id, name: lead.name, email: lead.email, phone: lead.phone, value: lead.value } : null}
    />

    {lead && (
      <AIOutreachDrawer
        open={outreachOpen}
        onOpenChange={setOutreachOpen}
        leadId={lead.id}
        leadName={lead.name}
        leadEmail={lead.email}
        onSent={() => { fetchActivities(); fetchUnifiedTimeline(); }}
      />
    )}

    {lead && quickTaskOpen && (
      <CreateTaskDialog
        leadId={lead.id}
        onSuccess={() => { setQuickTaskOpen(false); fetchActivities(); }}
        trigger={
          <button
            ref={(el) => { if (el && quickTaskOpen) { el.click(); setQuickTaskOpen(false); } }}
            className="hidden"
            aria-hidden
          />
        }
      />
    )}

    <Dialog open={!!submissionDetail} onOpenChange={(o) => !o && setSubmissionDetail(null)}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Form Submission Details</DialogTitle>
        </DialogHeader>
        {submissionDetail && (
          <div className="space-y-4">
            {submissionDetail.form_name && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Form</p>
                <p className="font-medium">{submissionDetail.form_name}</p>
              </div>
            )}
            {submissionDetail.submission_data && (
              <div className="space-y-1">
                <h4 className="text-sm font-semibold mb-2">Captured Fields</h4>
                <div className="border rounded-lg divide-y">
                  {Object.entries(submissionDetail.submission_data).map(([key, value]) => (
                    <div key={key} className="flex items-start gap-4 p-3">
                      <span className="text-sm text-muted-foreground min-w-[120px] capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="text-sm font-medium flex-1">
                        {Array.isArray(value) ? (value as string[]).join(', ') : String(value || '—')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-1">
              <h4 className="text-sm font-semibold mb-2">Submission Info</h4>
              <div className="border rounded-lg divide-y text-sm">
                {submissionDetail.submitted_at && (
                  <div className="flex gap-4 p-3"><span className="text-muted-foreground min-w-[120px]">Submitted</span><span>{format(new Date(submissionDetail.submitted_at), "MMM dd, yyyy 'at' h:mm a")}</span></div>
                )}
                {submissionDetail.device_type && (
                  <div className="flex gap-4 p-3"><span className="text-muted-foreground min-w-[120px]">Device</span><span className="capitalize">{submissionDetail.device_type}</span></div>
                )}
                {submissionDetail.browser && (
                  <div className="flex gap-4 p-3"><span className="text-muted-foreground min-w-[120px]">Browser</span><span className="capitalize">{submissionDetail.browser}</span></div>
                )}
                {submissionDetail.referrer && (
                  <div className="flex gap-4 p-3"><span className="text-muted-foreground min-w-[120px]">Referrer</span><span className="break-all">{submissionDetail.referrer}</span></div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
};
