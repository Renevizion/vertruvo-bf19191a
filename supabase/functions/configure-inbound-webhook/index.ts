/**
 * configure-inbound-webhook
 *
 * Called from the Kiruvo UI when a workspace owner wants to enable inbound
 * calls on one of their Twilio numbers.
 *
 * What it does:
 *  1. Verifies the number belongs to the caller's workspace.
 *  2. Calls the Twilio API to set the Voice webhook URL on that number
 *     to point at our twilio-inbound-call edge function.
 *  3. Marks the number as inbound_webhook_configured = true in our DB.
 *
 * Request body:
 *  { phone_number_id: string }  — the UUID from twilio_phone_numbers
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;

// The public URL of our inbound call handler
const INBOUND_WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/twilio-inbound-call`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Verify caller
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await admin.auth.getUser(token);
    if (userError || !user) throw new Error("Not authenticated");

    // Get workspace
    const { data: memberRow } = await admin
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (!memberRow) throw new Error("Workspace not found");
    if (!["owner", "admin"].includes(memberRow.role)) throw new Error("Insufficient permissions");

    const { phone_number_id } = await req.json();
    if (!phone_number_id) throw new Error("phone_number_id required");

    // Verify the number belongs to this workspace
    const { data: numRow } = await admin
      .from("twilio_phone_numbers")
      .select("id, phone_number, twilio_sid, workspace_id")
      .eq("id", phone_number_id)
      .eq("workspace_id", memberRow.workspace_id)
      .maybeSingle();
    if (!numRow) throw new Error("Phone number not found or not owned by your workspace");

    // Update the Twilio number's Voice webhook via Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers/${numRow.twilio_sid}.json`;
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const body = new URLSearchParams({
      VoiceUrl: INBOUND_WEBHOOK_URL,
      VoiceMethod: "POST",
      VoiceFallbackUrl: INBOUND_WEBHOOK_URL,
      VoiceFallbackMethod: "POST",
    });

    const twilioResp = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!twilioResp.ok) {
      const errText = await twilioResp.text();
      console.error("[configure-inbound-webhook] Twilio error:", errText);
      throw new Error("Failed to configure webhook on Twilio number");
    }

    // Mark as configured in our DB
    await admin
      .from("twilio_phone_numbers")
      .update({ inbound_webhook_configured: true })
      .eq("id", phone_number_id);

    return new Response(
      JSON.stringify({ success: true, webhook_url: INBOUND_WEBHOOK_URL }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[configure-inbound-webhook] Error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
