/**
 * twilio-inbound-call
 *
 * Handles inbound calls to any Kiruvo-managed Twilio number.
 *
 * Flow:
 *  1. Twilio POSTs to this endpoint when a call arrives on a workspace number.
 *  2. We look up which workspace owns the called number.
 *  3. We look up the workspace's active inbound voice agent (ai_agents where
 *     type='voice', status='active', inbound_enabled=true).
 *  4. If the agent has an elevenlabs_agent_id we hand the call off to ElevenLabs
 *     Conversational AI via a TwiML <Connect><Stream> response.
 *  5. If no ElevenLabs agent is configured we fall back to a friendly TwiML
 *     message + voicemail prompt.
 *  6. We log the inbound call in call_logs.
 *
 * Twilio Voice webhook URL to set on each number:
 *   https://<project>.supabase.co/functions/v1/twilio-inbound-call
 * Method: POST
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { createHmac } from "node:crypto";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

function validateTwilioSignature(
  authToken: string,
  signature: string | null,
  url: string,
  params: Record<string, string>
): boolean {
  if (!signature || !authToken) return false;
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const key of sortedKeys) data += key + params[key];
  const computed = createHmac("sha1", authToken)
    .update(data, "utf-8")
    .digest("base64");
  return computed === signature;
}

function twiml(xml: string) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${xml}</Response>`, {
    headers: { "Content-Type": "text/xml" },
  });
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type" },
    });
  }

  try {
    // Parse Twilio POST body
    const formData = await req.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => { params[key] = value as string; });

    const calledNumber = params["Called"] || params["To"] || "";
    const callerNumber = params["From"] || params["Caller"] || "";
    const callSid = params["CallSid"] || "";

    // Validate Twilio signature (skip in dev if no auth token set)
    if (TWILIO_AUTH_TOKEN) {
      const sig = req.headers.get("X-Twilio-Signature");
      const isValid = validateTwilioSignature(TWILIO_AUTH_TOKEN, sig, req.url, params);
      if (!isValid) {
        console.error("[twilio-inbound-call] Invalid Twilio signature");
        return new Response("Forbidden", { status: 403 });
      }
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // 1. Find the workspace that owns this Twilio number
    const { data: numberRow } = await admin
      .from("twilio_phone_numbers")
      .select("workspace_id, friendly_name")
      .eq("phone_number", calledNumber)
      .maybeSingle();

    if (!numberRow?.workspace_id) {
      console.warn("[twilio-inbound-call] No workspace found for number:", calledNumber);
      return twiml(
        `<Say voice="Polly.Joanna">Thank you for calling. We are unable to take your call right now. Please try again later.</Say><Hangup/>`
      );
    }

    const workspaceId = numberRow.workspace_id;

    // 2. Find the active inbound voice agent for this workspace
    const { data: agent } = await admin
      .from("ai_agents")
      .select("id, name, greeting, instructions, voice, elevenlabs_agent_id")
      .eq("workspace_id", workspaceId)
      .eq("type", "voice")
      .eq("status", "active")
      .eq("inbound_enabled", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 3. Log the inbound call
    await admin.from("call_logs").insert({
      workspace_id: workspaceId,
      phone_number: callerNumber,
      call_sid: callSid,
      status: "ringing",
      direction: "inbound",
      agent_id: agent?.id || null,
    }).catch((e) => console.warn("[twilio-inbound-call] call_log insert failed:", e));

    // 4a. If agent has ElevenLabs agent ID → stream to ElevenLabs Conversational AI
    if (agent?.elevenlabs_agent_id) {
      const elevenLabsAgentId = agent.elevenlabs_agent_id;
      // ElevenLabs Conversational AI via Twilio Media Streams
      // Docs: https://elevenlabs.io/docs/conversational-ai/phone-calls/twilio
      return twiml(
        `<Connect>
          <Stream url="wss://api.elevenlabs.io/v1/convai/twilio?agent_id=${escapeXml(elevenLabsAgentId)}" />
        </Connect>`
      );
    }

    // 4b. Agent exists but no ElevenLabs ID → use TwiML AI with greeting + voicemail fallback
    if (agent) {
      const greeting = agent.greeting || "Thank you for calling. How can I help you today?";
      const statusCallbackUrl = `${SUPABASE_URL}/functions/v1/twilio-status-callback`;
      return twiml(
        `<Say voice="Polly.Joanna">${escapeXml(greeting)}</Say>
         <Gather input="speech" timeout="5" action="${escapeXml(statusCallbackUrl)}?callSid=${escapeXml(callSid)}&amp;workspaceId=${escapeXml(workspaceId)}&amp;agentId=${escapeXml(agent.id)}" method="POST">
           <Say voice="Polly.Joanna">Please leave a message after the tone and we will call you back shortly.</Say>
         </Gather>
         <Record maxLength="120" transcribe="true" transcribeCallback="${escapeXml(SUPABASE_URL)}/functions/v1/twilio-status-callback?type=voicemail&amp;workspaceId=${escapeXml(workspaceId)}&amp;callSid=${escapeXml(callSid)}" />
         <Say voice="Polly.Joanna">Thank you. Goodbye.</Say>
         <Hangup/>`
      );
    }

    // 4c. No agent configured at all → friendly fallback
    return twiml(
      `<Say voice="Polly.Joanna">Thank you for calling. We are not available right now. Please call back during business hours or visit our website to book an appointment.</Say>
       <Hangup/>`
    );
  } catch (err) {
    console.error("[twilio-inbound-call] Error:", err);
    return twiml(
      `<Say voice="Polly.Joanna">We encountered a technical issue. Please try again shortly.</Say><Hangup/>`
    );
  }
});
