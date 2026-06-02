import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { parseActivityDescription } from "@/lib/activity-format";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";

import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  ArrowLeft, Mail, Phone, Building2, Calendar, 
  StickyNote, CheckSquare, MessageSquare, Video,
  Plus, Loader2, MoreHorizontal, 
  Pencil, Trash2, FileText, ExternalLink, Clock, ClipboardList, Sparkles
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { toast } from "sonner";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { CreateCalendarEventDialog } from "@/components/calendar/CreateCalendarEventDialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useConversations } from "@/hooks/useConversations";
import { ConversationThread } from "@/components/conversations/ConversationThread";
import { ContactTimeline } from "@/components/contacts/ContactTimeline";
import { ContactGraph } from "@/components/contacts/ContactGraph";

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  created_at: string;
  workspace_id?: string;
}

interface Activity {
  id: string;
  type: string;
  title: string | null;
  description: string | null;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  created_at: string;
}

interface FormSubmission {
  id: string;
  form_id: string;
  data: Record<string, any>;
  created_at: string;
  form_name?: string;
}

const ContactDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast: toastHook } = useToast();
  const [isBelowLg, setIsBelowLg] = useState(window.innerWidth < 1024);
  const [mobileTab, setMobileTab] = useState<"info" | "messages" | "activity">("messages");
  const queryClient = useQueryClient();
  const [contact, setContact] = useState<Contact | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [sendingNote, setSendingNote] = useState(false);
  const { data: isAdmin } = useIsAdmin();
  // Only platform admin (you) gets full access - NOT workspace owners
  
  // Dialog states
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [addActivityDialogOpen, setAddActivityDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [activityType, setActivityType] = useState<string>("note");
  const [activityTitle, setActivityTitle] = useState("");
  const [activityDescription, setActivityDescription] = useState("");
  
  // Edit note states
  const [editNoteId, setEditNoteId] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState("");
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
  const [activityDetailOpen, setActivityDetailOpen] = useState(false);
  const [callConfirmOpen, setCallConfirmOpen] = useState(false);
  const [placingCall, setPlacingCall] = useState(false);


  // Fetch subscription tier
  const { data: subscription } = useQuery({
    queryKey: ['user-subscription'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;
      return data as { subscribed: boolean; tier: string | null };
    }
  });

  // Check if Twilio is configured
  const { data: twilioNumbers } = useQuery({
    queryKey: ['twilio-numbers-check'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('twilio_phone_numbers')
        .select('id')
        .eq('is_active', true)
        .limit(1);
      if (error) throw error;
      return data;
    }
  });

  // Only platform admin (you) can always call if Twilio is set up, or enterprise tier customers
  const hasTwilioSetup = twilioNumbers && twilioNumbers.length > 0;
  const canMakeCalls = hasTwilioSetup && (isAdmin || subscription?.tier === 'enterprise');

  // Fetch tasks for this contact
  const { data: tasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ['contact-tasks', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('contact_id', id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!id
  });

  // Use unified conversations hook
  const {
    allMessages: conversationMessages,
    isLoading: conversationsLoading,
  } = useConversations({
    contactId: id,
    enabled: !!id,
  });

  // Fetch form submissions linked to this contact via leads
  const { data: formSubmissions = [] } = useQuery({
    queryKey: ['contact-form-submissions', id, contact?.email],
    queryFn: async () => {
      if (!contact) return [];
      
      // First get leads linked to this contact by email or direct link
      const { data: leads } = await supabase
        .from('leads')
        .select('id')
        .or(`email.eq.${contact.email}`);
      
      if (!leads || leads.length === 0) return [];
      
      const leadIds = leads.map(l => l.id);
      
      // Then get form submissions for those leads
      const { data: submissions, error } = await supabase
        .from('form_submissions')
        .select(`
          id,
          form_id,
          data,
          created_at,
          forms:form_id (name)
        `)
        .in('lead_id', leadIds)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (submissions || []).map(s => ({
        ...s,
        form_name: (s.forms as any)?.name
      })) as FormSubmission[];
    },
    enabled: !!id && !!contact?.email
  });

  useEffect(() => {
    if (id) {
      fetchContact();
      fetchActivities();
    }
  }, [id]);

  useEffect(() => {
    const onResize = () => setIsBelowLg(window.innerWidth < 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const fetchContact = async () => {
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching contact:", error);
      toastHook({
        title: "Error",
        description: "Failed to load contact",
        variant: "destructive",
      });
    } else {
      setContact(data as Contact);
    }
    setLoading(false);
  };

  const fetchActivities = async () => {
    const { data, error } = await supabase
      .from("activities")
      .select("*")
      .eq("contact_id", id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setActivities(data);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !contact) return;

    setSendingNote(true);
    const { error } = await supabase.from("activities").insert({
      contact_id: contact.id,
      workspace_id: contact.workspace_id,
      type: "note",
      title: "Note added",
      description: newNote,
    });

    if (error) {
      toastHook({
        title: "Error",
        description: "Failed to add note",
        variant: "destructive",
      });
    } else {
      toast.success("Note added");
      setNewNote("");
      fetchActivities();
    }
    setSendingNote(false);
  };

  const handleEditNote = async (noteId: string) => {
    if (!editNoteContent.trim()) return;
    
    const { error } = await supabase
      .from("activities")
      .update({ description: editNoteContent })
      .eq("id", noteId);

    if (error) {
      toast.error("Failed to update note");
    } else {
      toast.success("Note updated");
      setEditNoteId(null);
      setEditNoteContent("");
      fetchActivities();
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    const { error } = await supabase
      .from("activities")
      .delete()
      .eq("id", noteId);

    if (error) {
      toast.error("Failed to delete note");
    } else {
      toast.success("Note deleted");
      fetchActivities();
    }
  };

  const handleSendEmail = async () => {
    if (!contact?.email || !emailSubject.trim() || !emailBody.trim()) {
      toast.error("Please fill in subject and message");
      return;
    }

    if (!contact.workspace_id) {
      toast.error("Could not determine workspace for this contact");
      return;
    }

    setSendingEmail(true);
    try {
      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          workspaceId: contact.workspace_id,
          to: contact.email,
          subject: emailSubject,
          body: emailBody,
          contactId: contact.id,
          createConversation: true,
        },
      });

      if (error) throw error;

      toast.success("Email sent and added to the thread");
      setEmailDialogOpen(false);
      setEmailSubject("");
      setEmailBody("");
      fetchActivities();
      queryClient.invalidateQueries({ queryKey: ["conversations", "contact", id] });
    } catch (error) {
      toast.error("Failed to send email");
    } finally {
      setSendingEmail(false);
    }
  };

  const requestCall = () => {
    if (!contact?.phone) {
      toast.error("No phone number available");
      return;
    }
    if (!hasTwilioSetup) {
      toast.error("Please configure a Twilio phone number in Settings first");
      return;
    }
    if (!canMakeCalls) {
      toast.error("AI Voice Calling is available on Enterprise plan only");
      return;
    }
    // Open confirmation sheet — no auto-dial. User must explicitly place the call.
    setCallConfirmOpen(true);
  };

  const handleMakeCall = async () => {
    if (!contact?.phone) return;
    setPlacingCall(true);
    try {
      const { data: workspace } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .limit(1)
        .single();

      if (!workspace?.workspace_id) {
        toast.error("Could not determine workspace");
        return;
      }

      const { error } = await supabase.functions.invoke('twilio-make-call', {
        body: {
          phoneNumber: contact.phone,
          contactId: contact.id,
          workspaceId: workspace.workspace_id,
        },
      });

      if (error) throw error;
      toast.success(`Autonomous call queued for ${contact.phone}`);
      setCallConfirmOpen(false);
      fetchActivities();
    } catch (error) {
      console.error("Call error:", error);
      toast.error(error instanceof Error ? error.message : "Could not initiate call");
    } finally {
      setPlacingCall(false);
    }
  };


  const handleAddActivity = async () => {
    if (!activityTitle.trim() || !contact) {
      toast.error("Please enter a title");
      return;
    }

    const { error } = await supabase.from("activities").insert({
      contact_id: contact.id,
      workspace_id: contact.workspace_id,
      type: activityType,
      title: activityTitle,
      description: activityDescription || null,
    });

    if (error) {
      toast.error("Failed to add activity");
    } else {
      toast.success("Activity added");
      setAddActivityDialogOpen(false);
      setActivityTitle("");
      setActivityDescription("");
      setActivityType("note");
      fetchActivities();
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "note": return <StickyNote className="h-4 w-4" />;
      case "email": return <Mail className="h-4 w-4" />;
      case "call": return <Phone className="h-4 w-4" />;
      case "meeting": return <Video className="h-4 w-4" />;
      case "task": return <CheckSquare className="h-4 w-4" />;
      case "form_submission": return <FileText className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'border-primary/30 bg-primary/10 text-primary';
      case 'in_progress': return 'border-accent bg-accent text-accent-foreground';
      case 'cancelled': return 'border-destructive/30 bg-destructive/10 text-destructive';
      default: return 'border-secondary bg-secondary text-secondary-foreground';
    }
  };

  // Combine activities with form submissions for the timeline
  const allTimelineEvents = [
    ...activities.filter(a => a.type !== 'note').map(a => ({
      id: a.id,
      type: a.type,
      title: a.title,
      description: a.description,
      created_at: a.created_at,
      isSubmission: false
    })),
    ...formSubmissions.map(fs => ({
      id: fs.id,
      type: 'form_submission',
      title: `Form Submission: ${fs.form_name || 'Unknown Form'}`,
      description: `Submitted on ${format(new Date(fs.created_at), "MMM dd, yyyy")}`,
      created_at: fs.created_at,
      isSubmission: true,
      submissionData: fs
    }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Send via real delivery channels (email or SMS)
  const handleSendMessageFromDetails = async (content: string, channel?: "email" | "sms", subject?: string) => {
    if (!contact) return;
    const ch =
      channel || (contact.email ? "email" : contact.phone ? "sms" : null);
    if (!ch) {
      toast.error("This contact has no email or phone");
      return;
    }
    try {
      const payload: Record<string, unknown> = {
        workspaceId: contact.workspace_id,
        body: content,
        contactId: contact.id,
        createConversation: true,
      };
      if (ch === "email") {
        // Resolve business name for default subject
        const { data: bs } = await supabase
          .from("business_settings")
          .select("business_name")
          .eq("workspace_id", contact.workspace_id)
          .maybeSingle();
        const fallbackSubject = `Message from ${bs?.business_name || "us"}`;
        const { error } = await supabase.functions.invoke("send-email", {
          body: {
            ...payload,
            to: contact.email,
            subject: subject?.trim() || fallbackSubject,
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.functions.invoke("send-sms", {
          body: { ...payload, to: contact.phone },
        });
        if (error) throw error;
      }
      toast.success(ch === "email" ? "Email sent" : "SMS sent");
    } catch (e: any) {
      toast.error(e?.message || "Failed to send message");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Contact not found</p>
      </div>
    );
  }

  const initials = (contact.name || "?")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const notes = activities.filter(a => a.type === 'note');
  const latestMessage = conversationMessages[conversationMessages.length - 1];
  const latestActivity = allTimelineEvents[0];
  const openTasks = tasks.filter(task => task.status !== 'completed');
  const hasAnyHistory = conversationMessages.length > 0 || allTimelineEvents.length > 0 || notes.length > 0;

  const relationshipSignals = [
    {
      label: "Contactability",
      value: contact.email && contact.phone ? "Email + phone" : contact.email ? "Email only" : contact.phone ? "Phone only" : "No channel",
      icon: contact.email ? Mail : Phone,
    },
    {
      label: "Last touch",
      value: latestMessage
        ? format(new Date(latestMessage.created_at), "MMM d, h:mm a")
        : latestActivity
          ? format(new Date(latestActivity.created_at), "MMM d, h:mm a")
          : "No history yet",
      icon: Clock,
    },
    {
      label: "Open work",
      value: `${openTasks.length} task${openTasks.length === 1 ? "" : "s"}`,
      icon: ClipboardList,
    },
    {
      label: "Forms",
      value: `${formSubmissions.length} submission${formSubmissions.length === 1 ? "" : "s"}`,
      icon: FileText,
    },
  ];

  const nextBestStep = !contact.email && !contact.phone
    ? "Add an email or phone number before outreach."
    : openTasks.length > 0
      ? `Work ${openTasks[0].title}`
      : !latestMessage && !latestActivity
        ? "Start the first conversation."
        : latestMessage?.direction === "inbound"
          ? "Reply while the thread is warm."
          : "Review recent context, then follow up.";

  const renderCompactActivity = (event: any) => (
    <button
      key={event.id}
      type="button"
      className={`w-full rounded-md border p-3 text-left transition-colors hover:bg-muted/40 ${
        event.isSubmission ? 'border-primary/25 bg-primary/5' : 'border-border bg-card'
      }`}
      onClick={() => {
        if (event.isSubmission && event.submissionData) {
          setSelectedSubmission(event.submissionData);
          setSubmissionDialogOpen(true);
          return;
        }
        // Every other timeline row also opens a detail sheet — no more dead clicks.
        setSelectedActivity(event);
        setActivityDetailOpen(true);
      }}
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5 text-muted-foreground">{getActivityIcon(event.type)}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{event.title || event.type}</p>
            <ExternalLink className="h-3 w-3 text-muted-foreground/60" />
          </div>
          {event.description && (() => {
            const parsed = parseActivityDescription(event.description);
            if (!parsed) return null;
            return <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{parsed.summary}</p>;
          })()}
          <p className="mt-1 text-[11px] text-muted-foreground">{format(new Date(event.created_at), "MMM d, h:mm a")}</p>
        </div>
      </div>
    </button>
  );


  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden">
      <div className="flex-shrink-0 border-b bg-background/80 px-3 py-3 backdrop-blur md:px-6">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={() => navigate("/contacts")}
            aria-label="Back to contacts"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {initials}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-semibold leading-tight text-foreground md:text-xl">{contact.name}</h1>
              <Badge variant="outline" className="text-[10px]">Contact</Badge>
              {latestMessage && (
                <Badge variant="secondary" className="text-[10px] capitalize">Last {latestMessage.channel}</Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {contact.company && <span className="flex min-w-0 items-center gap-1"><Building2 className="h-3.5 w-3.5" />{contact.company}</span>}
              {contact.email && <span className="flex min-w-0 items-center gap-1 break-all"><Mail className="h-3.5 w-3.5" />{contact.email}</span>}
              {contact.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{contact.phone}</span>}
            </div>
          </div>
          <div className="hidden flex-shrink-0 items-center gap-1.5 md:flex">
            {contact.email && (
              <Button size="sm" variant="outline" className="h-8" onClick={() => setEmailDialogOpen(true)}>
                <Mail className="mr-1.5 h-3.5 w-3.5" />Email
              </Button>
            )}
            {contact.phone && (
              <Button size="sm" variant="outline" className="h-8" onClick={requestCall} disabled={!canMakeCalls}>
                <Phone className="mr-1.5 h-3.5 w-3.5" />Call
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-8" onClick={() => setMeetingDialogOpen(true)}>
              <Calendar className="mr-1.5 h-3.5 w-3.5" />Meeting
            </Button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {relationshipSignals.map((signal) => {
            const Icon = signal.icon;
            return (
              <div key={signal.label} className="rounded-md border bg-card px-3 py-2">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-normal text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" />{signal.label}
                </div>
                <p className="mt-1 truncate text-sm font-medium">{signal.value}</p>
              </div>
            );
          })}
        </div>
      </div>

      {isBelowLg && (
        <div className="flex flex-shrink-0 border-b bg-background">
          {([
            { key: "messages" as const, label: "Talk" },
            { key: "info" as const, label: "Context" },
            { key: "activity" as const, label: "Work" },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setMobileTab(tab.key)}
              className={`flex-1 border-b-2 py-2.5 text-sm font-medium transition-colors ${
                mobileTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <div className={`h-full gap-3 p-3 md:p-4 ${isBelowLg ? '' : 'grid grid-cols-12'}`}>
          <section className={`${isBelowLg ? (mobileTab === 'messages' ? 'flex h-full' : 'hidden') : 'col-span-6 flex'} min-h-0 flex-col overflow-hidden rounded-lg border bg-card`}>
            <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b px-3 py-2.5">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />Conversation
                </h2>
                <p className="truncate text-[11px] text-muted-foreground">Email, SMS, and call context for this person.</p>
              </div>
              {conversationMessages.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {conversationMessages.length} msg{conversationMessages.length === 1 ? "" : "s"}
                </Badge>
              )}
            </div>
            <ConversationThread
              messages={conversationMessages}
              isLoading={conversationsLoading}
              onSendMessage={handleSendMessageFromDetails}
              emptyMessage="No thread yet"
              emptySubMessage="Send the first message or log activity from the side panel."
              maxHeight={isBelowLg ? "calc(100vh - 18rem)" : "calc(100vh - 22rem)"}
              availableChannels={[
                ...(contact.email ? ["email" as const] : []),
                ...(contact.phone ? ["sms" as const] : []),
              ]}
              defaultChannel={contact.email ? "email" : "sms"}
              recipientHint={
                contact.email || contact.phone
                  ? `→ ${[contact.email, contact.phone].filter(Boolean).join(" · ")}`
                  : undefined
              }
              disabledReason={
                !contact.email && !contact.phone
                  ? "Add an email or phone to send messages."
                  : null
              }
            />
          </section>

          <section className={`${isBelowLg ? (mobileTab === 'info' ? 'block h-full' : 'hidden') : 'col-span-3 block'} min-h-0 overflow-hidden rounded-lg border bg-card`}>
            <ScrollArea className="h-full">
              <div className="space-y-4 p-3 lg:p-4">
                <div className="rounded-md border bg-primary/5 p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Sparkles className="h-4 w-4 text-primary" />Next best step
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{nextBestStep}</p>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold">Profile</h3>
                  <div className="space-y-2 text-sm">
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="flex min-w-0 items-center gap-2 rounded-md border px-3 py-2 hover:bg-muted/40">
                        <Mail className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <span className="truncate text-primary">{contact.email}</span>
                      </a>
                    )}
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`} className="flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-muted/40">
                        <Phone className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <span className="text-primary">{contact.phone}</span>
                      </a>
                    )}
                    {contact.company && (
                      <div className="flex min-w-0 items-center gap-2 rounded-md border px-3 py-2">
                        <Building2 className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <span className="truncate">{contact.company}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-muted-foreground">
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                      <span>Added {format(new Date(contact.created_at), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="mb-2 text-sm font-semibold">Actions</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEmailDialogOpen(true)} disabled={!contact.email} className="justify-start">
                      <Mail className="mr-2 h-4 w-4" />Email
                    </Button>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button variant="outline" size="sm" onClick={requestCall} disabled={!contact.phone || !canMakeCalls} className="w-full justify-start">
                              <Phone className="mr-2 h-4 w-4" />Call
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {(!hasTwilioSetup || !canMakeCalls) && (
                          <TooltipContent>
                            <p>{!hasTwilioSetup ? "Configure calling in Settings" : "Voice calling requires Enterprise"}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                    <Button variant="outline" size="sm" onClick={() => setMeetingDialogOpen(true)} className="justify-start">
                      <Calendar className="mr-2 h-4 w-4" />Meet
                    </Button>
                    <CreateTaskDialog
                      contactId={contact.id}
                      onSuccess={() => {
                        fetchActivities();
                        refetchTasks();
                      }}
                      trigger={
                        <Button variant="outline" size="sm" className="justify-start">
                          <CheckSquare className="mr-2 h-4 w-4" />Task
                        </Button>
                      }
                    />
                  </div>
                </div>

                {formSubmissions.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="mb-2 text-sm font-semibold">Form submissions</h3>
                      <div className="space-y-2">
                        {formSubmissions.slice(0, 4).map((submission) => (
                          <button
                            key={submission.id}
                            type="button"
                            className="w-full rounded-md border p-3 text-left hover:bg-muted/40"
                            onClick={() => {
                              setSelectedSubmission(submission);
                              setSubmissionDialogOpen(true);
                            }}
                          >
                            <p className="truncate text-sm font-medium">{submission.form_name || "Form submission"}</p>
                            <p className="text-[11px] text-muted-foreground">{format(new Date(submission.created_at), "MMM d, h:mm a")}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </section>

          <section className={`${isBelowLg ? (mobileTab === 'activity' ? 'block h-full' : 'hidden') : 'col-span-3 block'} min-h-0 overflow-hidden rounded-lg border bg-card`}>
            <Tabs defaultValue="activity" className="flex h-full flex-col">
              <TabsList className="mx-3 mt-3 grid w-[calc(100%-1.5rem)] flex-shrink-0 grid-cols-5">
                <TabsTrigger value="activity" className="text-xs">Unified</TabsTrigger>
                <TabsTrigger value="legacy" className="text-xs">Activity</TabsTrigger>
                <TabsTrigger value="notes" className="text-xs">Notes</TabsTrigger>
                <TabsTrigger value="tasks" className="text-xs">Tasks</TabsTrigger>
                <TabsTrigger value="relationships" className="text-xs">Links</TabsTrigger>
              </TabsList>

              <div className="min-h-0 flex-1 overflow-hidden">
                <TabsContent value="activity" className="mt-0 h-full">
                  <ContactTimeline contactId={id!} />
                </TabsContent>

                <TabsContent value="legacy" className="mt-0 h-full">
                  <ScrollArea className="h-full p-3 lg:p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold">Activity</h3>
                        <p className="text-[11px] text-muted-foreground">Manual entries, calls, emails, submissions.</p>
                      </div>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setAddActivityDialogOpen(true)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {allTimelineEvents.length === 0 ? (
                      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                        {hasAnyHistory ? "No non-note activity yet" : "No history yet"}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {allTimelineEvents.slice(0, 12).map(renderCompactActivity)}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="notes" className="mt-0 h-full">
                  <ScrollArea className="h-full p-3 lg:p-4">
                    <div className="mb-3 space-y-2">
                      <Textarea
                        placeholder="Add a note..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="min-h-[72px] resize-none text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.metaKey) {
                            handleAddNote();
                          }
                        }}
                      />
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] text-muted-foreground">⌘ Enter saves</p>
                        <Button onClick={handleAddNote} size="sm" disabled={sendingNote || !newNote.trim()}>
                          {sendingNote ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Plus className="mr-1 h-3 w-3" />}
                          Add
                        </Button>
                      </div>
                    </div>
                    {notes.length === 0 ? (
                      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">No notes yet</div>
                    ) : (
                      <div className="space-y-2">
                        {notes.map((note) => (
                          <div key={note.id} className="group rounded-md border bg-muted/20 p-3 text-sm">
                            {editNoteId === note.id ? (
                              <div className="space-y-2">
                                <Textarea value={editNoteContent} onChange={(e) => setEditNoteContent(e.target.value)} className="min-h-[70px] resize-none text-sm" autoFocus />
                                <div className="flex justify-end gap-2">
                                  <Button size="sm" variant="ghost" onClick={() => setEditNoteId(null)}>Cancel</Button>
                                  <Button size="sm" onClick={() => handleEditNote(note.id)}>Save</Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-start justify-between gap-2">
                                  <p className="line-clamp-5 flex-1 whitespace-pre-wrap text-sm">{note.description || note.title}</p>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => {
                                        setEditNoteId(note.id);
                                        setEditNoteContent(note.description || note.title || "");
                                      }}>
                                        <Pencil className="mr-2 h-4 w-4" />Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleDeleteNote(note.id)} className="text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                <p className="mt-2 text-[11px] text-muted-foreground">{format(new Date(note.created_at), "MMM d, h:mm a")}</p>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="relationships" className="mt-0 h-full">
                  <ScrollArea className="h-full p-3 lg:p-4">
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-sm font-semibold">Relationships</h3>
                        <p className="text-[11px] text-muted-foreground">A quick map of contact channels and linked activity.</p>
                      </div>
                      <ContactGraph
                        contact={contact}
                        taskCount={tasks.length}
                        submissionCount={formSubmissions.length}
                        conversationCount={conversationMessages.length}
                      />
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="tasks" className="mt-0 h-full">
                  <ScrollArea className="h-full p-3 lg:p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold">Tasks</h3>
                        <p className="text-[11px] text-muted-foreground">{openTasks.length} open · {tasks.length} total</p>
                      </div>
                      <CreateTaskDialog
                        contactId={contact.id}
                        onSuccess={() => {
                          fetchActivities();
                          refetchTasks();
                        }}
                        trigger={<Button size="icon" variant="ghost" className="h-8 w-8"><Plus className="h-4 w-4" /></Button>}
                      />
                    </div>
                    {tasks.length === 0 ? (
                      <div className="rounded-md border border-dashed p-6 text-center">
                        <CheckSquare className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
                        <p className="mb-3 text-sm text-muted-foreground">No tasks assigned</p>
                        <CreateTaskDialog
                          contactId={contact.id}
                          onSuccess={() => {
                            fetchActivities();
                            refetchTasks();
                          }}
                          trigger={<Button size="sm">Add Task</Button>}
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {tasks.map((task) => (
                          <div key={task.id} className="rounded-md border p-3 text-sm">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">{task.title}</p>
                                {task.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>}
                                {task.due_date && <p className="mt-1 text-[11px] text-muted-foreground">Due {format(new Date(task.due_date), "MMM d")}</p>}
                              </div>
                              <Badge className={getStatusColor(task.status)} variant="outline">{task.status.replace('_', ' ')}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </div>
            </Tabs>
          </section>
        </div>
      </div>

      {/* Email — Sheet */}
      <Sheet open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0 gap-0">
          <SheetHeader className="px-6 pt-6 pb-3 border-b">
            <SheetTitle className="text-display text-xl">Send email</SheetTitle>
            <SheetDescription className="text-xs">
              To {contact.name} · {contact.email}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="subject" className="text-xs">Subject</Label>
              <Input id="subject" placeholder="Subject" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="body" className="text-xs">Message</Label>
              <Textarea id="body" placeholder="Write your message…" value={emailBody} onChange={(e) => setEmailBody(e.target.value)} rows={10} />
            </div>
          </div>
          <SheetFooter className="px-6 py-4 border-t flex-row justify-end gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSendEmail} disabled={sendingEmail}>
              {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
              Send
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Schedule Meeting */}
      <CreateCalendarEventDialog
        open={meetingDialogOpen}
        onOpenChange={setMeetingDialogOpen}
        defaultDate={new Date()}
        onSuccess={() => {
          fetchActivities();
          toast.success("Meeting scheduled");
        }}
      />

      {/* Queue Call — confirmation Sheet (no auto-dial) */}
      <Sheet open={callConfirmOpen} onOpenChange={setCallConfirmOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 gap-0">
          <SheetHeader className="px-6 pt-6 pb-3 border-b">
            <SheetTitle className="text-display text-xl">Queue Voice agent call</SheetTitle>
            <SheetDescription className="text-xs">
              Nothing starts until you confirm. The Voice agent will run in the background and post the transcript here.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 text-sm">
            <div className="rounded-md border bg-muted/30 p-3 space-y-1.5">
              <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Contact</span><span className="font-medium">{contact.name}</span></div>
              <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Number</span><span className="font-medium">{contact.phone}</span></div>
              <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Mode</span><span className="font-medium">Background queue</span></div>
            </div>
            <p className="text-xs text-muted-foreground leading-5">
              You can leave this screen after confirmation. Access is checked before the queue request is sent.
            </p>
          </div>
          <SheetFooter className="px-6 py-4 border-t flex-row justify-end gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setCallConfirmOpen(false)} disabled={placingCall}>Cancel</Button>
            <Button onClick={handleMakeCall} disabled={placingCall}>
              {placingCall ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Phone className="h-4 w-4 mr-2" />}
              Queue call
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Add Activity — Sheet */}
      <Sheet open={addActivityDialogOpen} onOpenChange={setAddActivityDialogOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 gap-0">
          <SheetHeader className="px-6 pt-6 pb-3 border-b">
            <SheetTitle className="text-display text-xl">Log activity</SheetTitle>
            <SheetDescription className="text-xs">For {contact.name}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <div className="flex gap-2 flex-wrap">
                {['call', 'email', 'meeting', 'note'].map((type) => (
                  <Button key={type} type="button" variant={activityType === type ? 'default' : 'outline'} size="sm" onClick={() => setActivityType(type)} className="capitalize">
                    {getActivityIcon(type)}<span className="ml-1">{type}</span>
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="activity-title" className="text-xs">Title</Label>
              <Input id="activity-title" placeholder="Activity title" value={activityTitle} onChange={(e) => setActivityTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="activity-desc" className="text-xs">Details (optional)</Label>
              <Textarea id="activity-desc" placeholder="Add details…" value={activityDescription} onChange={(e) => setActivityDescription(e.target.value)} rows={6} />
            </div>
          </div>
          <SheetFooter className="px-6 py-4 border-t flex-row justify-end gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setAddActivityDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddActivity}>Log activity</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Form Submission — Sheet */}
      <Sheet open={submissionDialogOpen} onOpenChange={setSubmissionDialogOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0 gap-0">
          <SheetHeader className="px-6 pt-6 pb-3 border-b">
            <SheetTitle className="text-display text-xl">{selectedSubmission?.form_name || 'Form submission'}</SheetTitle>
            <SheetDescription className="text-xs">
              {selectedSubmission && format(new Date(selectedSubmission.created_at), "MMMM dd, yyyy 'at' h:mm a")}
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1">
            <div className="px-6 py-4 space-y-3">
              {selectedSubmission?.data && Object.entries(selectedSubmission.data).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</Label>
                  <p className="text-sm font-medium p-2 rounded bg-muted/40 break-words">{String(value) || '-'}</p>
                </div>
              ))}
              {(!selectedSubmission?.data || Object.keys(selectedSubmission.data).length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-6">No submission data available</p>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Activity detail — opens when any timeline row is clicked */}
      <Sheet open={activityDetailOpen} onOpenChange={setActivityDetailOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0 gap-0">
          <SheetHeader className="px-6 pt-6 pb-3 border-b">
            <div className="inline-flex items-center gap-2 text-[10px] font-semibold text-primary/70 uppercase tracking-wide mb-1">
              {selectedActivity && getActivityIcon(selectedActivity.type)}
              {selectedActivity?.type?.replace('_', ' ') || 'Activity'}
            </div>
            <SheetTitle className="text-display text-xl leading-tight">
              {selectedActivity?.title || 'Activity detail'}
            </SheetTitle>
            <SheetDescription className="text-xs">
              {selectedActivity && format(new Date(selectedActivity.created_at), "MMMM dd, yyyy 'at' h:mm a")}
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1">
            <div className="px-6 py-4 space-y-3 text-sm">
              {selectedActivity?.description ? (() => {
                const parsed = parseActivityDescription(selectedActivity.description);
                return (
                  <>
                    <div className="rounded-md border bg-muted/30 p-3 whitespace-pre-wrap break-words leading-6">
                      {parsed?.summary || selectedActivity.description}
                    </div>
                  </>
                );
              })() : (
                <p className="text-muted-foreground">No additional detail recorded for this activity.</p>
              )}



            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>

  );
};

export default ContactDetails;
