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
    const { lead_id, workspace_id, step } = body;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Block voicemail drops while platform Twilio is in trial mode and not confirmed upgraded.
    // Trial accounts intercept calls with a "press any key" prompt that breaks automated drops.
    const { data: trialCfg } = await admin
      .from("platform_config")
      .select("value")
      .eq("key", "twilio_trial_status")
      .maybeSingle();
    const trialVal: any = trialCfg?.value || {};
    if (trialVal.is_trial === true && trialVal.confirmed_upgraded !== true) {
      return jsonResp({
        success: false,
        error: "Voicemail drops are disabled while the platform Twilio account is in trial mode. An admin must upgrade Twilio and confirm in Admin → Monitor.",
        code: "TWILIO_TRIAL_BLOCKED",
      });
    }

    const { data: lead } = await admin.from("leads").select("id, name, phone").eq("id", lead_id).single();
    if (!lead?.phone) return jsonResp({ success: false, error: "No phone on lead" });

    // Pick voicemail drop — either step.voicemail_id or first active for workspace
    let vmId = step?.voicemail_id;
    if (!vmId) {
      const { data: vms } = await admin
        .from("voicemail_drops" as any)
        .select("id")
        .eq("workspace_id", workspace_id)
        .eq("is_active", true)
        .limit(1);
      if (!vms?.length) return jsonResp({ success: false, error: "No active voicemail drop configured" });
      vmId = vms[0].id;
    }

    const { data: vm } = await admin.from("voicemail_drops" as any).select("*").eq("id", vmId).single();
    if (!vm) return jsonResp({ success: false, error: "Voicemail drop not found" });

    const resolved = await resolveFromNumber(workspace_id, "voicemail");
    if (!resolved.ok) {
      return jsonResp({ success: false, error: resolved.error, code: resolved.code, used: resolved.used, cap: resolved.cap });
    }
    const fromNumber = resolved.fromNumber;

    const vmText: string = (vm as any).tts_text || (vm as any).name || "Hi, please give us a call back when you have a moment.";
    // TwiML that detects machine then plays the voicemail message
    const twimlInline = `<Response><Pause length="1"/><Say voice="alice">${escapeXml(vmText)}</Say></Response>`;
    const twimlUrl = `${SUPABASE_URL}/functions/v1/twilio-twiml?inlineTwiml=${encodeURIComponent(twimlInline)}`;

    const normalized = normalizePhone(lead.phone);
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const formData = new URLSearchParams();
    formData.append("From", fromNumber);
    formData.append("To", normalized);
    formData.append("Url", twimlUrl);
    formData.append("MachineDetection", "DetectMessageEnd");
    formData.append("AsyncAmd", "false");

    const tResp = await fetch(twilioUrl, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });
    const tData = await tResp.json();
    if (!tResp.ok) return jsonResp({ success: false, error: tData.message || "Twilio voicemail failed" });

    await admin.from("activities").insert({
      lead_id,
      workspace_id,
      type: "voicemail",
      title: "Voicemail dropped",
      description: vmText,
    });

    return jsonResp({ success: true, external_id: tData.sid });
  } catch (e) {
    console.error("[bulk-voicemail-drop]", e);
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

function escapeXml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
