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

    const { lead_id, amount_cents, description, workspace_id } = await req.json();
    if (!lead_id) throw new Error("lead_id is required");
    if (!amount_cents || amount_cents <= 0) throw new Error("Valid amount_cents is required");
    if (!workspace_id) throw new Error("workspace_id is required");

    const [{ data: isMember }, { data: isOwner }] = await Promise.all([
      supabaseClient.rpc("is_workspace_member", {
        _workspace_id: workspace_id,
        _user_id: userData.user.id,
      }),
      supabaseClient.rpc("is_workspace_owner", {
        _workspace_id: workspace_id,
        _user_id: userData.user.id,
      }),
    ]);

    if (!isMember && !isOwner) throw new Error("Unauthorized for this workspace");

    // Fetch lead with Stripe info
    const { data: lead, error: leadError } = await supabaseClient
      .from("leads")
      .select("id, name, email, workspace_id, stripe_customer_id, stripe_payment_method_id")
      .eq("id", lead_id)
      .eq("workspace_id", workspace_id)
      .single();
    if (leadError || !lead) throw new Error("Lead not found");
    if (!lead.stripe_customer_id) throw new Error("No Stripe customer for this lead. Save a card first.");
    if (!lead.stripe_payment_method_id) throw new Error("No card on file for this lead. Save a card first.");

    // Fetch workspace to get connected account
    const { data: workspace, error: wsError } = await supabaseClient
      .from("workspaces")
      .select("stripe_connect_account_id, stripe_connect_onboarded, platform_fee_percent")
      .eq("id", workspace_id)
      .single();
    if (wsError || !workspace) throw new Error("Workspace not found");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customer = await stripe.customers.retrieve(lead.stripe_customer_id);
    if (customer.deleted) throw new Error("Stored customer record no longer exists. Please re-save card.");

    const customerWorkspaceId = (customer as Stripe.Customer).metadata?.workspace_id;
    if (customerWorkspaceId && customerWorkspaceId !== workspace_id) {
      throw new Error("Card on file is scoped to a different business. Please save a new card for this business.");
    }

    const amountRounded = Math.round(amount_cents);

    // Build payment intent params
    const paymentParams: Stripe.PaymentIntentCreateParams = {
      amount: amountRounded,
      currency: "usd",
      customer: lead.stripe_customer_id,
      payment_method: lead.stripe_payment_method_id,
      off_session: true,
      confirm: true,
      description: description || `Charge for ${lead.name}`,
      metadata: { lead_id: lead.id, workspace_id },
    };

    // If workspace has a connected Stripe account, route payment to them
    if (workspace.stripe_connect_account_id && workspace.stripe_connect_onboarded) {
      const feePercent = Number(workspace.platform_fee_percent) || 2.5;
      const applicationFee = Math.round(amountRounded * (feePercent / 100));

      paymentParams.application_fee_amount = applicationFee;
      paymentParams.transfer_data = {
        destination: workspace.stripe_connect_account_id,
      };
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentParams);

    return new Response(
      JSON.stringify({
        success: true,
        payment_intent_id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        routed_to_connect: !!paymentParams.transfer_data,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[charge-card-on-file] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
