import { useState, useMemo, useEffect } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, User, ArrowLeft, Search, Mail, Phone, AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useConversations } from "@/hooks/useConversations";
import { ConversationList } from "@/components/conversations/ConversationList";
import { ConversationThread } from "@/components/conversations/ConversationThread";
import { PageHeader } from "@/components/layout/PageHeader";
import { DuplicateReviewDialog } from "@/components/duplicates/DuplicateReviewDialog";

const normName = (s?: string | null) =>
  (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const normPhone = (s?: string | null) =>
  (s || "").replace(/\D/g, "");
const normEmail = (s?: string | null) =>
  (s || "").trim().toLowerCase();

const Inbox = () => {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<"contact" | "lead">("contact");
  const [lastSelections, setLastSelections] = useState<Record<"contact" | "lead", any | null>>({ contact: null, lead: null });
  const [lastConversationIds, setLastConversationIds] = useState<Record<"contact" | "lead", string | null>>({ contact: null, lead: null });
  const [searchQuery, setSearchQuery] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const { toast } = useToast();
  
  const queryClient = useQueryClient();

  const { data: contacts } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data } = await supabase.from("contacts").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: leads } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: businessName } = useQuery({
    queryKey: ["business-name-for-inbox"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return "";
      const { data: ws } = await supabase.from("workspaces").select("id").eq("owner_id", user.id).limit(1).maybeSingle();
      if (!ws?.id) return "";
      const { data: bs } = await supabase.from("business_settings").select("business_name").eq("workspace_id", ws.id).maybeSingle();
      return bs?.business_name || "";
    },
  });

  const {
    conversations,
    isLoading: conversationsLoading,
    refetch: refetchConversations,
  } = useConversations({
    contactId: selectedType === "contact" ? selectedContact?.id : null,
    leadId: selectedType === "lead" ? selectedContact?.id : null,
    email: selectedContact?.email || null,
    phone: selectedContact?.phone || null,
    enabled: !!selectedContact,
  });

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);
  const currentMessages = selectedConversation?.messages || [];

  useEffect(() => {
    if (!selectedConversationId || conversationsLoading) return;
    const stillExists = conversations.some((c) => c.id === selectedConversationId);
    if (!stillExists) setSelectedConversationId(null);
  }, [conversations, conversationsLoading, selectedConversationId]);

  const availableChannels = (() => {
    const out: ("email" | "sms")[] = [];
    if (selectedContact?.email) out.push("email");
    if (selectedContact?.phone) out.push("sms");
    return out;
  })();

  const disabledReason = !availableChannels.length
    ? "This contact has no email or phone — add one to send messages."
    : null;

  const recipientHint = (() => {
    if (!selectedContact) return undefined;
    const bits: string[] = [];
    if (selectedContact.email) bits.push(selectedContact.email);
    if (selectedContact.phone) bits.push(selectedContact.phone);
    return bits.length ? `→ ${bits.join(" · ")}` : undefined;
  })();

  const handleSendMessage = async (content: string, channel?: "email" | "sms", subject?: string) => {
    const ch = channel || availableChannels[0];
    if (!selectedContact || !ch) {
      toast({ title: "No channel available", variant: "destructive" });
      return;
    }
    try {
      // Resolve workspace
      const { data: { user } } = await supabase.auth.getUser();
      const { data: ws } = await supabase
        .from("workspaces")
        .select("id")
        .eq("owner_id", user?.id)
        .limit(1)
        .maybeSingle();
      const workspaceId = ws?.id;
      if (!workspaceId) throw new Error("No workspace");

      const payload: Record<string, unknown> = {
        workspaceId,
        body: content,
        contactId: selectedType === "contact" ? selectedContact.id : null,
        leadId: selectedType === "lead" ? selectedContact.id : null,
        conversationId: selectedConversationId,
        createConversation: true,
      };

      if (ch === "email") {
        if (!selectedContact.email) throw new Error("No email on file");
        const fallbackSubject = `Message from ${businessName || "us"}`;
        const { data, error } = await supabase.functions.invoke("send-email", {
          body: {
            ...payload,
            to: selectedContact.email,
            subject: subject?.trim() || fallbackSubject,
          },
        });
        if (error) throw error;
        if (data?.conversationId && !selectedConversationId) {
          setSelectedConversationId(data.conversationId);
        }
      } else {
        if (!selectedContact.phone) throw new Error("No phone on file");
        const { data, error } = await supabase.functions.invoke("send-sms", {
          body: { ...payload, to: selectedContact.phone },
        });
        if (error) throw error;
        if (data?.conversationId && !selectedConversationId) {
          setSelectedConversationId(data.conversationId);
        }
      }
      // refresh thread
      await new Promise((r) => setTimeout(r, 250));
      refetchConversations();
      toast({ title: ch === "email" ? "Email sent" : "SMS sent" });
    } catch (e: any) {
      toast({
        title: "Failed to send",
        description: e?.message || "Check your connected channels in Settings.",
        variant: "destructive",
      });
    }
  };

  const filteredItems =
    (selectedType === "contact" ? contacts : leads)?.filter(
      (item) =>
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.company?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  // Stricter duplicate index — mirrors cleanup-duplicates edge fn rules so
  // what we flag here matches what the Review & merge dialog will show.
  const dupIndex = useMemo(() => {
    const all: Array<{ id: string; type: "contact" | "lead"; name?: string; email?: string; phone?: string }> = [
      ...((contacts || []).map((c: any) => ({ ...c, type: "contact" as const }))),
      ...((leads || []).map((l: any) => ({ ...l, type: "lead" as const }))),
    ];
    const dupKeyOf = (r: any) => `${r.type}:${r.id}`;
    const nameTokens = (s?: string) =>
      (s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim().split(/\s+/).filter(Boolean);
    const emailLocal = (s?: string) => {
      const e = normEmail(s);
      const i = e.indexOf("@");
      return i > 0 ? e.slice(0, i) : "";
    };
    const namesSimilar = (a: string[], b: string[]) => {
      if (!a.length || !b.length) return false;
      for (const t of a) if (b.includes(t) && t.length >= 3) return true;
      for (const ta of a) for (const tb of b) {
        if (ta.length >= 3 && tb.length >= 3 && (ta.startsWith(tb) || tb.startsWith(ta))) return true;
      }
      return false;
    };
    // Auto-mirror (lead↔contact) is intentional, never a duplicate.
    const sameIdentity = (a: any, b: any) => {
      if (a.type === b.type) return false;
      const ae = normEmail(a.email), be = normEmail(b.email);
      const ap = normPhone(a.phone), bp = normPhone(b.phone);
      if (ae && be && ae === be) return true;
      if (ap && bp && ap === bp) return true;
      return false;
    };
    const isDup = (a: any, b: any) => {
      if (sameIdentity(a, b)) return false;
      const ae = normEmail(a.email), be = normEmail(b.email);
      const ap = normPhone(a.phone), bp = normPhone(b.phone);
      if (ae && be && ae === be && a.type === b.type) return true;
      const phoneMatch = !!ap && ap.length >= 7 && ap === bp;
      if (!phoneMatch) return false;
      const localA = emailLocal(a.email), localB = emailLocal(b.email);
      if (localA && localA === localB) return true;
      if (namesSimilar(nameTokens(a.name), nameTokens(b.name))) return true;
      return false;
    };
    const byEmail = new Map<string, typeof all>();
    const byPhone = new Map<string, typeof all>();
    for (const r of all) {
      const e = normEmail(r.email);
      const p = normPhone(r.phone);
      if (e) (byEmail.get(e) || byEmail.set(e, []).get(e)!).push(r);
      if (p && p.length >= 7) (byPhone.get(p) || byPhone.set(p, []).get(p)!).push(r);
    }
    const dupesFor = (item: any) => {
      const matches = new Map<string, any>();
      const candidates = new Map<string, any>();
      const e = normEmail(item.email);
      const p = normPhone(item.phone);
      if (e) for (const r of byEmail.get(e) || []) candidates.set(dupKeyOf(r), r);
      if (p && p.length >= 7) for (const r of byPhone.get(p) || []) candidates.set(dupKeyOf(r), r);
      candidates.delete(dupKeyOf(item));
      for (const r of candidates.values()) if (isDup(item, r)) matches.set(dupKeyOf(r), r);
      return Array.from(matches.values());
    };
    return { dupesFor };
  }, [contacts, leads]);

  const dupCountFor = (item: any) => dupIndex.dupesFor(item).length;
  const selectedDupes = selectedContact ? dupIndex.dupesFor(selectedContact) : [];

  const totalUnread = conversations.filter((c: any) => c.unread_count > 0).length;
  const showLeftPane = !selectedContact;
  const showMidPane = selectedContact && !selectedConversationId;
  const showThreadPane = selectedContact && (selectedConversationId || true);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Relationships"
        title="Unified Inbox"
        description="Every SMS, email, and voice conversation in one place."
        actions={
          totalUnread > 0 ? (
            <Badge variant="default" className="text-xs">
              {totalUnread} unread thread{totalUnread === 1 ? "" : "s"}
            </Badge>
          ) : undefined
        }
      />

      {/* Operational shell — three pane on desktop, stack on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-[calc(100vh-12rem)]">
        {/* Pane 1 — People */}
        <Card
          className={`lg:col-span-3 flex flex-col overflow-hidden ${
            showLeftPane ? "" : "hidden lg:flex"
          }`}
        >
          <div className="border-b p-3 space-y-2 flex-shrink-0">
            <Tabs
              value={selectedType}
              onValueChange={(v) => {
                const nextType = v as "contact" | "lead";
                if (selectedContact) {
                  setLastSelections((prev) => ({ ...prev, [selectedType]: selectedContact }));
                  setLastConversationIds((prev) => ({ ...prev, [selectedType]: selectedConversationId }));
                }
                setSelectedType(nextType);
                setSelectedContact(lastSelections[nextType]);
                setSelectedConversationId(lastConversationIds[nextType]);
              }}
            >
              <TabsList className="w-full h-8">
                <TabsTrigger value="contact" className="flex-1 text-xs">
                  Contacts
                </TabsTrigger>
                <TabsTrigger value="lead" className="flex-1 text-xs">
                  Leads
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {filteredItems.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No {selectedType}s found
                </div>
              ) : (
                filteredItems.map((item) => {
                  const isActive = selectedContact?.id === item.id;
                  const dupCount = dupCountFor(item);
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setLastSelections((prev) => ({ ...prev, [selectedType]: item }));
                        setLastConversationIds((prev) => ({ ...prev, [selectedType]: null }));
                        setSelectedContact(item);
                        setSelectedConversationId(null);
                      }}
                      className={`w-full text-left p-2.5 rounded-md transition-colors ${
                        isActive
                          ? "bg-primary/10 border border-primary/30"
                          : "hover:bg-muted/60 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <User className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-sm truncate">{item.name}</p>
                            {dupCount > 0 && (
                              <span
                                title={`${dupCount} possible duplicate${dupCount === 1 ? "" : "s"}`}
                                className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 font-medium flex-shrink-0"
                              >
                                <AlertTriangle className="h-2.5 w-2.5" />
                                {dupCount}
                              </span>
                            )}
                          </div>
                          {item.email && (
                            <p className="text-[11px] text-muted-foreground truncate">
                              {item.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Pane 2 — Conversations */}
        <Card
          className={`lg:col-span-3 flex flex-col overflow-hidden ${
            showMidPane ? "" : "hidden lg:flex"
          }`}
        >
          <div className="border-b p-3 flex items-center gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 lg:hidden"
              onClick={() => setSelectedContact(null)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">Conversations</p>
              {selectedContact && (
                <p className="text-[11px] text-muted-foreground truncate">
                  with {selectedContact.name}
                </p>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            {!selectedContact ? (
              <div className="h-full flex items-center justify-center text-center p-6">
                <div>
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs text-muted-foreground">Select a contact</p>
                </div>
              </div>
            ) : (
              <ConversationList
                conversations={conversations}
                selectedId={selectedConversationId}
                onSelect={(conv) => {
                  setSelectedConversationId(conv.id);
                  setLastConversationIds((prev) => ({ ...prev, [selectedType]: conv.id }));
                }}
                isLoading={conversationsLoading}
                emptyMessage="No conversations yet — send the first message →"
              />
            )}
          </div>
        </Card>

        {/* Pane 3 — Thread */}
        <Card
          className={`lg:col-span-6 flex flex-col overflow-hidden ${
            showThreadPane && (selectedConversationId || selectedContact)
              ? ""
              : "hidden lg:flex"
          }`}
        >
          {selectedContact ? (
            <>
              <div className="border-b p-3 flex items-center justify-between gap-2 flex-shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 lg:hidden"
                    onClick={() => setSelectedConversationId(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{selectedContact.name}</p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground truncate">
                      {selectedContact.email && (
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3" />
                          {selectedContact.email}
                        </span>
                      )}
                      {selectedContact.phone && (
                        <span className="flex items-center gap-1 truncate">
                          <Phone className="h-3 w-3" />
                          {selectedContact.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] capitalize flex-shrink-0">
                  {selectedType}
                </Badge>
              </div>
              {selectedDupes.length > 0 && (
                <div className="border-b bg-amber-50 dark:bg-amber-950/30 px-3 py-2 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="font-medium text-amber-900 dark:text-amber-200">
                      {selectedDupes.length} possible duplicate{selectedDupes.length === 1 ? "" : "s"} for {selectedContact.name}
                    </p>
                    <p className="text-amber-800/80 dark:text-amber-300/80 truncate">
                      Messages may be split across these records:{" "}
                      {selectedDupes.slice(0, 3).map((d: any, i: number) => (
                        <span key={i}>
                          {i > 0 && ", "}
                          <span className="underline decoration-dotted">
                            {d.email || d.phone || d.name}
                          </span>
                          <span className="opacity-60"> ({d.type})</span>
                        </span>
                      ))}
                      {selectedDupes.length > 3 && ` +${selectedDupes.length - 3} more`}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs flex-shrink-0"
                    onClick={() => setReviewOpen(true)}
                  >
                    Review &amp; merge
                  </Button>
                </div>
              )}
              <div className="flex-1 overflow-hidden flex flex-col">
                <ConversationThread
                  messages={currentMessages}
                  isLoading={conversationsLoading}
                  onSendMessage={handleSendMessage}
                  emptyMessage={
                    selectedConversationId
                      ? "No messages in this conversation"
                      : "Start a new conversation below"
                  }
                  emptySubMessage={
                    selectedConversationId
                      ? "Send a message below"
                      : "Type to begin a thread with this contact"
                  }
                  showAISuggest
                  maxHeight="100%"
                  availableChannels={availableChannels}
                  defaultChannel={availableChannels[0]}
                  recipientHint={recipientHint}
                  disabledReason={disabledReason}
                  defaultEmailSubject={businessName ? `Message from ${businessName}` : undefined}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-6">
              <div>
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">Select a contact</p>
                <p className="text-xs text-muted-foreground mt-1">
                  to view or start conversations
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>

      <DuplicateReviewDialog open={reviewOpen} onOpenChange={setReviewOpen} />
    </div>
  );
};

export default Inbox;
