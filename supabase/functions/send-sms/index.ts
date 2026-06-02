import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { resolveFromNumber } from "../_shared/sandbox-twilio.ts";
import { verifyAuth, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;

interface SendSmsRequest {
  workspaceId: string;
  to: string;
  body: string;
  contactId?: string | null;
  leadId?: string | null;
  conversationId?: string | null;
  createConversation?: boolean;
}

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11 && cleaned.startsWith("1")) return `+${cleaned}`;
  if (cleaned.length === 10) return `+1${cleaned}`;
  if (phone.startsWith("+")) return `+${cleaned}`;
  return `+${cleaned}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await verifyAuth(req);
    if (!auth) return unauthorizedResponse(corsHeaders);

    const { workspaceId, to, body, contactId, leadId, conversationId, createConversation = true } =
      (await req.json()) as SendSmsRequest;

    if (!workspaceId || !to || !body?.trim()) {
      return new Response(JSON.stringify({ error: "Missing workspaceId, to, or body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Resolve workspace number (BYO Twilio or sandbox)
    const resolved = await resolveFromNumber(workspaceId, "sms");
    if (!resolved.ok) {
      return new Response(
        JSON.stringify({
          error: resolved.error || "No outbound number available. Connect Twilio in Settings.",
          code: resolved.code,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const fromNumber = resolved.fromNumber;
    const normalized = normalizePhone(to);

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const basic = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const form = new URLSearchParams({ From: fromNumber, To: normalized, Body: body });
    const tResp = await fetch(twilioUrl, {
      method: "POST",
      headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const tData = await tResp.json();
    if (!tResp.ok) {
      console.error("[send-sms] twilio error", tData);
      return new Response(
        JSON.stringify({ error: tData.message || "SMS delivery failed" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Conversation + message logging
    let convId = conversationId ?? null;
    if (createConversation && (contactId || leadId)) {
      if (!convId) {
        const q = admin
          .from("conversations")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("channel", "sms");
        if (contactId) q.eq("contact_id", contactId);
        else if (leadId) q.eq("lead_id", leadId);
        const { data: existing } = await q.maybeSingle();
        if (existing?.id) convId = existing.id;
        else {
          const { data: newConv } = await admin
            .from("conversations")
            .insert({
              workspace_id: workspaceId,
              channel: "sms",
              contact_id: contactId || null,
              lead_id: leadId || null,
              status: "open",
              last_message_at: new Date().toISOString(),
            })
            .select("id")
            .single();
          convId = newConv?.id || null;
        }
      }

      if (convId) {
        await admin.from("messages").insert({
          conversation_id: convId,
          channel: "sms",
          direction: "outbound",
          content: body,
          sent_at: new Date().toISOString(),
          metadata: { twilio_sid: tData.sid, to: normalized, from: fromNumber },
        });
        await admin
          .from("conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", convId);
      }

      await admin.from("activities").insert({
        workspace_id: workspaceId,
        contact_id: contactId || null,
        lead_id: leadId || null,
        type: "sms",
        title: "SMS sent",
        description: body,
      });
    }

    return new Response(
      JSON.stringify({ success: true, sid: tData.sid, conversationId: convId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[send-sms]", e);
    return new Response(
      JSON.stringify({ error: "Failed to send SMS. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
