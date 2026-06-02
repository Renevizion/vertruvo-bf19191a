import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Message {
  id: string;
  content: string;
  channel: string;
  direction: string;
  created_at: string;
  ai_generated?: boolean | null;
  conversation_id: string | null;
}

export interface Conversation {
  id: string;
  channel: string;
  status: string | null;
  contact_id: string | null;
  lead_id: string | null;
  workspace_id: string | null;
  last_message_at: string | null;
  created_at: string;
  messages: Message[];
}

interface UseConversationsOptions {
  contactId?: string | null;
  leadId?: string | null;
  /** Optional email — used to also match conversations on duplicate contact/lead rows. */
  email?: string | null;
  /** Optional phone — used to also match conversations on duplicate contact/lead rows. */
  phone?: string | null;
  enabled?: boolean;
}

const normalizePhone = (p?: string | null) =>
  p ? p.replace(/\D/g, "") : "";

export const useConversations = ({ contactId, leadId, email, phone, enabled = true }: UseConversationsOptions) => {
  const queryClient = useQueryClient();

  // Build query key based on what we're fetching for
  const queryKey = contactId
    ? ["conversations", "contact", contactId, email || "", normalizePhone(phone)]
    : leadId
      ? ["conversations", "lead", leadId, email || "", normalizePhone(phone)]
      : ["conversations"];

  const { data: conversations = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get user's workspace
      const { data: workspaces } = await supabase
        .from("workspaces")
        .select("id")
        .eq("owner_id", user.id)
        .limit(1);

      if (!workspaces?.[0]) return [];
      const workspaceId = workspaces[0].id;

      // Collect all matching contact + lead ids — across duplicates by email/phone.
      const contactIds = new Set<string>();
      const leadIds = new Set<string>();
      if (contactId) contactIds.add(contactId);
      if (leadId) leadIds.add(leadId);

      const normEmail = email ? email.trim().toLowerCase() : "";
      const normPhone = normalizePhone(phone);

      if (normEmail || normPhone) {
        const orFilters: string[] = [];
        if (normEmail) orFilters.push(`email.ilike.${normEmail}`);
        // We can't normalize phone in PG filter easily — match on raw too.
        if (phone) orFilters.push(`phone.eq.${phone}`);
        const orStr = orFilters.join(",");

        const [{ data: matchedContacts }, { data: matchedLeads }] = await Promise.all([
          supabase.from("contacts").select("id,phone").eq("workspace_id", workspaceId).or(orStr),
          supabase.from("leads").select("id,phone").eq("workspace_id", workspaceId).or(orStr),
        ]);
        (matchedContacts || []).forEach((c: any) => {
          if (!normPhone || normalizePhone(c.phone) === normPhone || normEmail) contactIds.add(c.id);
        });
        (matchedLeads || []).forEach((l: any) => {
          if (!normPhone || normalizePhone(l.phone) === normPhone || normEmail) leadIds.add(l.id);
        });
      }

      let query = supabase
        .from("conversations")
        .select("*, messages(*)")
        .eq("workspace_id", workspaceId)
        .order("last_message_at", { ascending: false });

      const cIds = Array.from(contactIds);
      const lIds = Array.from(leadIds);
      if (cIds.length && lIds.length) {
        query = query.or(
          `contact_id.in.(${cIds.join(",")}),lead_id.in.(${lIds.join(",")})`
        );
      } else if (cIds.length) {
        query = query.in("contact_id", cIds);
      } else if (lIds.length) {
        query = query.in("lead_id", lIds);
      } else {
        return [];
      }

      const { data, error } = await query;
      if (error) throw error;

      // Sort messages within each conversation
      return (data || []).map(conv => ({
        ...conv,
        messages: ((conv.messages || []) as Message[]).sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      })) as Conversation[];
    },
    enabled: enabled && !!(contactId || leadId),
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async ({
      content,
      channel = "sms",
      conversationId,
      contactId: cId,
      leadId: lId,
    }: {
      content: string;
      channel?: string;
      conversationId?: string | null;
      contactId?: string | null;
      leadId?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: workspaces } = await supabase
        .from("workspaces")
        .select("id")
        .eq("owner_id", user.id)
        .limit(1);

      if (!workspaces?.[0]) throw new Error("No workspace found");

      let targetConversationId = conversationId;

      // Create conversation if needed
      if (!targetConversationId) {
        const { data: newConv, error: convError } = await supabase
          .from("conversations")
          .insert({
            workspace_id: workspaces[0].id,
            channel,
            contact_id: cId || contactId || null,
            lead_id: lId || leadId || null,
            status: "open",
          })
          .select()
          .single();

        if (convError) throw convError;
        targetConversationId = newConv.id;
      }

      // Insert message
      const { data: message, error: msgError } = await supabase
        .from("messages")
        .insert({
          conversation_id: targetConversationId,
          content,
          channel,
          direction: "outbound",
        })
        .select()
        .single();

      if (msgError) throw msgError;

      // Update conversation last_message_at
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", targetConversationId);

      // Log activity
      const activityInsert: {
        type: string;
        title: string;
        description: string;
        workspace_id: string;
        contact_id?: string;
        lead_id?: string;
      } = {
        type: channel === "email" ? "email" : "sms",
        title: `${channel === "email" ? "Email" : "Message"} sent`,
        description: content,
        workspace_id: workspaces[0].id,
      };

      if (cId || contactId) activityInsert.contact_id = cId || contactId || undefined;
      if (lId || leadId) activityInsert.lead_id = lId || leadId || undefined;

      await supabase.from("activities").insert(activityInsert);

      return { conversationId: targetConversationId, message };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Get all messages flattened from all conversations
  const allMessages = conversations.flatMap(conv => 
    (conv.messages || []).map(msg => ({
      ...msg,
      conversationChannel: conv.channel,
    }))
  ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return {
    conversations,
    allMessages,
    isLoading,
    error,
    sendMessage,
    refetch: () => queryClient.invalidateQueries({ queryKey }),
  };
};
