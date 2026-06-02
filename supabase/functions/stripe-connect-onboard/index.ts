import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !userData.user) throw new Error("Not authenticated");

    const { action, workspace_id } = await req.json();
    if (!workspace_id) throw new Error("workspace_id is required");

    // Verify user is workspace member
    const { data: workspace, error: wsError } = await supabaseClient
      .from("workspaces")
      .select("id, stripe_connect_account_id, stripe_connect_onboarded, name")
      .eq("id", workspace_id)
      .single();
    if (wsError || !workspace) throw new Error("Workspace not found");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const origin = req.headers.get("origin") || "https://kiruvo.com";

    if (action === "check_status") {
      // Check current onboarding status
      if (!workspace.stripe_connect_account_id) {
        return new Response(
          JSON.stringify({ onboarded: false, account_id: null }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const account = await stripe.accounts.retrieve(workspace.stripe_connect_account_id);
      const isOnboarded = account.charges_enabled && account.payouts_enabled;

      // Update DB if status changed
      if (isOnboarded !== workspace.stripe_connect_onboarded) {
        await supabaseClient
          .from("workspaces")
          .update({ stripe_connect_onboarded: isOnboarded })
          .eq("id", workspace_id);
      }

      return new Response(
        JSON.stringify({
          onboarded: isOnboarded,
          account_id: workspace.stripe_connect_account_id,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default action: create or continue onboarding
    let accountId = workspace.stripe_connect_account_id;

    if (!accountId) {
      // Create Express connected account
      const account = await stripe.accounts.create({
        type: "express",
        metadata: { workspace_id, platform: "kiruvo" },
        business_profile: {
          name: workspace.name || undefined,
        },
      });
      accountId = account.id;

      // Save to workspace
      await supabaseClient
        .from("workspaces")
        .update({ stripe_connect_account_id: accountId })
        .eq("id", workspace_id);
    }

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/settings?tab=payments&refresh=true`,
      return_url: `${origin}/settings?tab=payments&onboarded=true`,
      type: "account_onboarding",
    });

    return new Response(
      JSON.stringify({ url: accountLink.url, account_id: accountId }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[stripe-connect-onboard] Error:", msg);

    // Detect the most common setup error and surface an actionable message.
    let friendly = msg;
    let code: string | undefined;
    if (msg.includes("signed up for Connect") || msg.includes("Connect, which you can do")) {
      friendly =
        "Payment processing isn't fully activated on the platform yet. " +
        "The platform owner needs to enable Stripe Connect at https://dashboard.stripe.com/connect before workspaces can connect their accounts.";
      code = "platform_connect_disabled";
    } else if (msg.toLowerCase().includes("api key")) {
      friendly = "Payment processing is misconfigured. Please contact support.";
      code = "stripe_misconfigured";
    }

    return new Response(JSON.stringify({ error: friendly, code, raw: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
