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
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { lead_id, workspace_id, objective, step } = body;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: lead } = await admin
      .from("leads")
      .select("id, name, phone, email, notes, source")
      .eq("id", lead_id)
      .single();

    if (!lead?.phone) {
      return jsonResp({ success: false, error: "No phone number on lead" });
    }

    // Resolve From number — workspace BYO else platform sandbox (capped)
    const resolved = await resolveFromNumber(workspace_id, "sms");
    if (!resolved.ok) {
      return jsonResp({ success: false, error: resolved.error, code: resolved.code, used: resolved.used, cap: resolved.cap });
    }
    const fromNumber = resolved.fromNumber;

    const { data: biz } = await admin
      .from("business_settings")
      .select("business_name")
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    // Generate SMS via Lovable AI
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You write short, friendly SMS messages for ${biz?.business_name || "a business"}. Under 160 chars. No emojis. Sign as "${biz?.business_name || "Us"}". Objective: ${objective}. Use the lead's notes if relevant. Return ONLY the SMS body, no quotes, no preamble.`,
          },
          {
            role: "user",
            content: `Lead: ${lead.name}\nNotes: ${lead.notes || "none"}\nSource: ${lead.source || "unknown"}`,
          },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!aiResp.ok) {
      return jsonResp({ success: false, error: `AI gen failed (${aiResp.status})` });
    }
    const aiData = await aiResp.json();
    const message = (aiData.choices?.[0]?.message?.content || "").trim().slice(0, 320);
    if (!message) return jsonResp({ success: false, error: "AI returned empty SMS" });

    // Normalize phone
    const normalized = normalizePhone(lead.phone);

    // Send via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const formData = new URLSearchParams({
      From: fromNumber,
      To: normalized,
      Body: message,
    });
    const tResp = await fetch(twilioUrl, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });
    const tData = await tResp.json();
    if (!tResp.ok) {
      return jsonResp({ success: false, error: tData.message || "Twilio SMS failed" });
    }

    // Log activity
    await admin.from("activities").insert({
      lead_id,
      workspace_id,
      type: "sms",
      title: "AI Outreach SMS",
      description: message,
    });

    return jsonResp({ success: true, external_id: tData.sid, metadata: { message } });
  } catch (e) {
    console.error("[bulk-sms-send]", e);
    return jsonResp({ success: false, error: e instanceof Error ? e.message : "error" });
  }
});

function jsonResp(b: unknown) {
  return new Response(JSON.stringify(b), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11 && cleaned.startsWith("1")) return `+${cleaned}`;
  if (cleaned.length === 10) return `+1${cleaned}`;
  if (phone.startsWith("+")) return `+${cleaned}`;
  return `+${cleaned}`;
}
