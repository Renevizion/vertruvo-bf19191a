import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { resolveFromNumber } from "../_shared/sandbox-twilio.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { lead_id, workspace_id, campaign_id, objective, booking_mode } = body;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: lead } = await admin
      .from("leads")
      .select("id, name, phone, notes")
      .eq("id", lead_id)
      .single();

    if (!lead?.phone) return jsonResp({ success: false, error: "No phone on lead" });

    const resolved = await resolveFromNumber(workspace_id, "call");
    if (!resolved.ok) {
      return jsonResp({ success: false, error: resolved.error, code: resolved.code, used: resolved.used, cap: resolved.cap });
    }
    const fromNumber = resolved.fromNumber;

    // Use existing twilio-twiml endpoint with a campaign context query so the
    // TwiML responder can serve a dynamic AI greeting + booking prompts.
    const twimlUrl = `${SUPABASE_URL}/functions/v1/twilio-twiml?campaignId=${campaign_id}&leadId=${lead_id}&objective=${encodeURIComponent(objective || "")}&bookingMode=${booking_mode}`;
    const statusCallback = `${SUPABASE_URL}/functions/v1/twilio-status-callback`;

    const normalized = normalizePhone(lead.phone);

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const formData = new URLSearchParams();
    formData.append("From", fromNumber);
    formData.append("To", normalized);
    formData.append("Url", twimlUrl);
    formData.append("StatusCallback", statusCallback);
    formData.append("StatusCallbackEvent", "initiated,answered,completed");
    formData.append("StatusCallbackMethod", "POST");
    formData.append("MachineDetection", "Enable");

    const tResp = await fetch(twilioUrl, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });
    const tData = await tResp.json();
    if (!tResp.ok) return jsonResp({ success: false, error: tData.message || "Twilio call failed" });

    // Log into call_logs
    await admin.from("call_logs").insert({
      workspace_id,
      lead_id,
      phone_number: lead.phone,
      call_sid: tData.sid,
      status: tData.status || "initiated",
    });

    await admin.from("activities").insert({
      lead_id,
      workspace_id,
      type: "call",
      title: "AI Outreach Call",
      description: `Campaign call initiated. Objective: ${objective}`,
    });

    return jsonResp({ success: true, external_id: tData.sid });
  } catch (e) {
    console.error("[bulk-voice-call]", e);
    return jsonResp({ success: false, error: e instanceof Error ? e.message : "error" });
  }
});

const jsonResp = (b: unknown) =>
  new Response(JSON.stringify(b), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11 && cleaned.startsWith("1")) return `+${cleaned}`;
  if (cleaned.length === 10) return `+1${cleaned}`;
  if (phone.startsWith("+")) return `+${cleaned}`;
  return `+${cleaned}`;
}
