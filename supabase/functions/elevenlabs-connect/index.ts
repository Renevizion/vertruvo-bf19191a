import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResp = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return jsonResp({ error: "Unauthorized" }, 401);

    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .single();
    if (!workspace) return jsonResp({ error: "No workspace" }, 404);

    const CONFIG_KEY = `elevenlabs_config:${workspace.id}`;
    const body = await req.json().catch(() => ({}));
    const action = body?.action || "get";

    // ── SAVE API KEY ──────────────────────────────────────────────────────────
    if (action === "save_key") {
      const apiKey = body?.api_key?.trim();
      if (!apiKey) return jsonResp({ error: "api_key required" }, 400);

      // Validate the key by calling ElevenLabs /user endpoint
      const check = await fetch("https://api.elevenlabs.io/v1/user", {
        headers: { "xi-api-key": apiKey },
      });
      if (!check.ok) return jsonResp({ error: "Invalid ElevenLabs API key" }, 400);
      const userData = await check.json();

      await admin
        .from("platform_config")
        .upsert(
          {
            key: CONFIG_KEY,
            value: {
              api_key: apiKey,
              connected: true,
              connected_at: new Date().toISOString(),
              subscription: userData?.subscription?.tier || "unknown",
            },
            description: `ElevenLabs API key for workspace ${workspace.id}`,
            updated_by: user.id,
          },
          { onConflict: "key" }
        );

      return jsonResp({ ok: true, subscription: userData?.subscription?.tier });
    }

    // ── DISCONNECT ────────────────────────────────────────────────────────────
    if (action === "disconnect") {
      await admin
        .from("platform_config")
        .delete()
        .eq("key", CONFIG_KEY);
      return jsonResp({ ok: true });
    }

    // ── GET STATUS ────────────────────────────────────────────────────────────
    if (action === "get") {
      const { data: config } = await admin
        .from("platform_config")
        .select("value")
        .eq("key", CONFIG_KEY)
        .maybeSingle();

      const cfg = config?.value as any;
      if (!cfg?.connected) return jsonResp({ connected: false });
      return jsonResp({ connected: true, subscription: cfg.subscription, connected_at: cfg.connected_at });
    }

    // ── LIST AGENTS ───────────────────────────────────────────────────────────
    if (action === "list_agents") {
      const { data: config } = await admin
        .from("platform_config")
        .select("value")
        .eq("key", CONFIG_KEY)
        .maybeSingle();

      const apiKey = (config?.value as any)?.api_key;
      if (!apiKey) return jsonResp({ error: "ElevenLabs not connected" }, 400);

      const resp = await fetch("https://api.elevenlabs.io/v1/convai/agents?page_size=50", {
        headers: { "xi-api-key": apiKey },
      });
      if (!resp.ok) return jsonResp({ error: "Failed to fetch agents from ElevenLabs" }, 502);
      const data = await resp.json();
      const agents = (data?.agents || []).map((a: any) => ({
        id: a.agent_id,
        name: a.name,
        created_at: a.created_at_unix_secs,
      }));
      return jsonResp({ agents });
    }

    return jsonResp({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error(e);
    return jsonResp({ error: String(e) }, 500);
  }
});
