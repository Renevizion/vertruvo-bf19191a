import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");

const CONFIG_KEY = "twilio_trial_status";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Verify caller is admin/owner
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResp({ error: "Unauthorized" }, 401);
    }
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return jsonResp({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const isAdmin = roles?.some((r: any) => r.role === "admin" || r.role === "owner");
    if (!isAdmin) return jsonResp({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body?.action || "check";

    // Load existing config row (cache + override flag)
    const { data: existing } = await admin
      .from("platform_config")
      .select("value")
      .eq("key", CONFIG_KEY)
      .maybeSingle();
    const cached = (existing?.value as any) || {};

    if (action === "confirm_upgraded") {
      const next = {
        ...cached,
        confirmed_upgraded: true,
        confirmed_at: new Date().toISOString(),
        confirmed_by: user.id,
      };
      await admin
        .from("platform_config")
        .upsert({ key: CONFIG_KEY, value: next, description: "Twilio account trial/upgrade tracking", updated_by: user.id }, { onConflict: "key" });
      return jsonResp({ ok: true, ...next });
    }

    if (action === "reset_confirmation") {
      const next = { ...cached, confirmed_upgraded: false, confirmed_at: null, confirmed_by: null };
      await admin
        .from("platform_config")
        .upsert({ key: CONFIG_KEY, value: next, description: "Twilio account trial/upgrade tracking", updated_by: user.id }, { onConflict: "key" });
      return jsonResp({ ok: true, ...next });
    }

    // Default: live check against Twilio
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      return jsonResp({
        configured: false,
        type: "Unknown",
        is_trial: false,
        confirmed_upgraded: !!cached.confirmed_upgraded,
        error: "Twilio credentials not configured",
      });
    }

    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}.json`, {
      headers: { Authorization: `Basic ${auth}` },
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("[twilio-account-status] API error", resp.status, text);
      return jsonResp({
        configured: true,
        type: "Unknown",
        is_trial: false,
        confirmed_upgraded: !!cached.confirmed_upgraded,
        error: `Twilio API ${resp.status}`,
      });
    }

    const data = await resp.json();
    const type: string = data.type || "Unknown"; // "Trial" or "Full"
    const isTrial = type === "Trial";

    const next = {
      ...cached,
      type,
      friendly_name: data.friendly_name,
      status: data.status,
      is_trial: isTrial,
      // Auto-clear confirmation if Twilio reports trial again (e.g. account regressed)
      confirmed_upgraded: isTrial ? !!cached.confirmed_upgraded : true,
      checked_at: new Date().toISOString(),
    };

    await admin
      .from("platform_config")
      .upsert({ key: CONFIG_KEY, value: next, description: "Twilio account trial/upgrade tracking", updated_by: user.id }, { onConflict: "key" });

    return jsonResp({ configured: true, ...next });
  } catch (err: any) {
    console.error("[twilio-account-status] error", err?.message);
    return jsonResp({ error: "Internal error" }, 500);
  }
});

function jsonResp(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
