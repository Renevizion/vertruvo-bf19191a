/**
 * twilio-connect-api
 *
 * A secure proxy for Twilio API calls using per-workspace credentials.
 * The frontend never sees the credentials — all API calls go through here.
 *
 * Supported actions:
 *  - get_status          → check if workspace has connected Twilio credentials
 *  - disconnect          → remove stored credentials
 *  - list_numbers        → list phone numbers on the tenant's Twilio account
 *  - search_numbers      → search available numbers by area code / country
 *  - buy_number          → purchase a phone number on the tenant's account
 *  - release_number      → release a phone number
 *  - get_call_logs       → fetch recent call history
 *  - update_forwarding   → set a fallback forward number on a Twilio number
 *  - configure_webhook   → set the voice webhook URL on a number
 *  - get_account_balance → fetch account balance
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INBOUND_WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/twilio-inbound-call`;

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getWorkspaceCredentials(admin: ReturnType<typeof createClient>, workspaceId: string) {
  const configKey = `twilio_connect:${workspaceId}`;
  const { data } = await admin
    .from("platform_config")
    .select("value")
    .eq("key", configKey)
    .maybeSingle();
  return (data?.value as any) ?? null;
}

async function twilioRequest(
  accountSid: string,
  accessToken: string,
  path: string,
  method = "GET",
  body?: Record<string, string>
) {
  const url = path.startsWith("http")
    ? path
    : `https://api.twilio.com/2010-04-01/Accounts/${accountSid}${path}`;

  const init: RequestInit = {
    method,
    headers: {
      Authorization: `Basic ${btoa(`${accountSid}:${accessToken}`)}`,
      Accept: "application/json",
    },
  };

  if (body && method !== "GET") {
    init.headers = {
      ...init.headers as Record<string, string>,
      "Content-Type": "application/x-www-form-urlencoded",
    };
    init.body = new URLSearchParams(body).toString();
  }

  const resp = await fetch(url, init);
  const data = await resp.json();
  return { ok: resp.ok, status: resp.status, data };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResp({ error: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return jsonResp({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Get the user's workspace
    const { data: ws } = await admin
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!ws?.id) return jsonResp({ error: "No workspace found" }, 404);
    const workspaceId = ws.id;

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    // ── get_status ──────────────────────────────────────────────────────────
    if (action === "get_status") {
      const creds = await getWorkspaceCredentials(admin, workspaceId);
      if (!creds?.account_sid) {
        return jsonResp({ connected: false });
      }
      // Verify credentials are still valid
      const { ok, data } = await twilioRequest(creds.account_sid, creds.access_token, ".json");
      if (!ok) {
        return jsonResp({ connected: false, error: "credentials_invalid" });
      }
      return jsonResp({
        connected: true,
        account_sid: creds.account_sid,
        account_name: data?.friendly_name ?? null,
        account_status: data?.status ?? null,
        connected_at: creds.connected_at,
      });
    }

    // ── disconnect ───────────────────────────────────────────────────────────
    if (action === "disconnect") {
      const configKey = `twilio_connect:${workspaceId}`;
      await admin.from("platform_config").delete().eq("key", configKey);
      return jsonResp({ ok: true });
    }

    // All other actions require valid credentials
    const creds = await getWorkspaceCredentials(admin, workspaceId);
    if (!creds?.account_sid) {
      return jsonResp({ error: "Twilio not connected", code: "NOT_CONNECTED" }, 400);
    }
    const { account_sid, access_token } = creds;

    // ── list_numbers ─────────────────────────────────────────────────────────
    if (action === "list_numbers") {
      const { ok, data } = await twilioRequest(account_sid, access_token, "/IncomingPhoneNumbers.json?PageSize=50");
      if (!ok) return jsonResp({ error: data?.message ?? "Failed to list numbers" }, 500);
      return jsonResp({
        numbers: (data.incoming_phone_numbers ?? []).map((n: any) => ({
          sid: n.sid,
          phone_number: n.phone_number,
          friendly_name: n.friendly_name,
          capabilities: n.capabilities,
          voice_url: n.voice_url,
          sms_url: n.sms_url,
          status: n.status,
        })),
      });
    }

    // ── search_numbers ───────────────────────────────────────────────────────
    if (action === "search_numbers") {
      const areaCode = body?.area_code ?? "";
      const country = body?.country ?? "US";
      const path = `/AvailablePhoneNumbers/${country}/Local.json?PageSize=10${areaCode ? `&AreaCode=${areaCode}` : ""}`;
      const { ok, data } = await twilioRequest(account_sid, access_token, path);
      if (!ok) return jsonResp({ error: data?.message ?? "Search failed" }, 500);
      return jsonResp({
        numbers: (data.available_phone_numbers ?? []).map((n: any) => ({
          phone_number: n.phone_number,
          friendly_name: n.friendly_name,
          locality: n.locality,
          region: n.region,
          monthly_cost: "$1.15",
        })),
      });
    }

    // ── buy_number ───────────────────────────────────────────────────────────
    if (action === "buy_number") {
      const phoneNumber = body?.phone_number;
      if (!phoneNumber) return jsonResp({ error: "phone_number required" }, 400);
      const { ok, data } = await twilioRequest(
        account_sid,
        access_token,
        "/IncomingPhoneNumbers.json",
        "POST",
        {
          PhoneNumber: phoneNumber,
          FriendlyName: body?.friendly_name ?? "Kiruvo Business Line",
          VoiceUrl: INBOUND_WEBHOOK_URL,
          VoiceMethod: "POST",
        }
      );
      if (!ok) return jsonResp({ error: data?.message ?? "Purchase failed" }, 500);

      // Also save to our twilio_phone_numbers table
      await admin.from("twilio_phone_numbers").insert({
        workspace_id: workspaceId,
        phone_number: data.phone_number,
        friendly_name: data.friendly_name,
        twilio_sid: data.sid,
        is_active: true,
        inbound_webhook_configured: true,
      });

      return jsonResp({ ok: true, number: data.phone_number, sid: data.sid });
    }

    // ── release_number ───────────────────────────────────────────────────────
    if (action === "release_number") {
      const sid = body?.sid;
      if (!sid) return jsonResp({ error: "sid required" }, 400);
      const { ok } = await twilioRequest(account_sid, access_token, `/IncomingPhoneNumbers/${sid}.json`, "DELETE");
      if (!ok) return jsonResp({ error: "Failed to release number" }, 500);
      // Remove from our DB too
      await admin.from("twilio_phone_numbers").delete().eq("twilio_sid", sid).eq("workspace_id", workspaceId);
      return jsonResp({ ok: true });
    }

    // ── get_call_logs ────────────────────────────────────────────────────────
    if (action === "get_call_logs") {
      const pageSize = body?.page_size ?? 25;
      const { ok, data } = await twilioRequest(
        account_sid,
        access_token,
        `/Calls.json?PageSize=${pageSize}&Status=completed`
      );
      if (!ok) return jsonResp({ error: data?.message ?? "Failed to fetch logs" }, 500);
      return jsonResp({
        calls: (data.calls ?? []).map((c: any) => ({
          sid: c.sid,
          from: c.from,
          to: c.to,
          direction: c.direction,
          status: c.status,
          duration: c.duration,
          start_time: c.start_time,
          end_time: c.end_time,
          price: c.price,
          recording_url: c.subresource_uris?.recordings
            ? `https://api.twilio.com${c.subresource_uris.recordings}`
            : null,
        })),
      });
    }

    // ── update_forwarding ────────────────────────────────────────────────────
    if (action === "update_forwarding") {
      const sid = body?.sid;
      const forwardTo = body?.forward_to; // e.g. "+12035550101"
      if (!sid) return jsonResp({ error: "sid required" }, 400);
      // Set a fallback URL that forwards to the given number if AI doesn't answer
      const fallbackUrl = forwardTo
        ? `https://handler.twilio.com/twiml/EH_kiruvo_forward?to=${encodeURIComponent(forwardTo)}`
        : "";
      const { ok, data } = await twilioRequest(
        account_sid,
        access_token,
        `/IncomingPhoneNumbers/${sid}.json`,
        "POST",
        {
          VoiceFallbackUrl: fallbackUrl,
          VoiceFallbackMethod: "POST",
        }
      );
      if (!ok) return jsonResp({ error: data?.message ?? "Update failed" }, 500);
      return jsonResp({ ok: true });
    }

    // ── configure_webhook ────────────────────────────────────────────────────
    if (action === "configure_webhook") {
      const sid = body?.sid;
      if (!sid) return jsonResp({ error: "sid required" }, 400);
      const { ok, data } = await twilioRequest(
        account_sid,
        access_token,
        `/IncomingPhoneNumbers/${sid}.json`,
        "POST",
        {
          VoiceUrl: INBOUND_WEBHOOK_URL,
          VoiceMethod: "POST",
        }
      );
      if (!ok) return jsonResp({ error: data?.message ?? "Webhook config failed" }, 500);
      // Update our DB record
      await admin
        .from("twilio_phone_numbers")
        .update({ inbound_webhook_configured: true })
        .eq("twilio_sid", sid)
        .eq("workspace_id", workspaceId);
      return jsonResp({ ok: true });
    }

    // ── get_account_balance ──────────────────────────────────────────────────
    if (action === "get_account_balance") {
      const { ok, data } = await twilioRequest(account_sid, access_token, "/Balance.json");
      if (!ok) return jsonResp({ error: "Failed to fetch balance" }, 500);
      return jsonResp({
        balance: data.balance,
        currency: data.currency,
        account_sid: data.account_sid,
        add_funds_url: `https://www.twilio.com/console/billing/add-funds`,
      });
    }

    return jsonResp({ error: "Unknown action" }, 400);
  } catch (err: any) {
    console.error("[twilio-connect-api]", err);
    return jsonResp({ error: err.message ?? "Internal server error" }, 500);
  }
});
