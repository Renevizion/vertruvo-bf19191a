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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !userData.user) throw new Error("Not authenticated");

    const { lead_id, setup_intent_id } = await req.json();
    if (!lead_id || !setup_intent_id) throw new Error("lead_id and setup_intent_id are required");

    const { data: lead, error: leadError } = await supabaseClient
      .from("leads")
      .select("id, workspace_id, stripe_customer_id")
      .eq("id", lead_id)
      .single();

    if (leadError || !lead) throw new Error("Lead not found");

    const [{ data: isMember }, { data: isOwner }] = await Promise.all([
      supabaseClient.rpc("is_workspace_member", {
        _workspace_id: lead.workspace_id,
        _user_id: userData.user.id,
      }),
      supabaseClient.rpc("is_workspace_owner", {
        _workspace_id: lead.workspace_id,
        _user_id: userData.user.id,
      }),
    ]);

    if (!isMember && !isOwner) throw new Error("Unauthorized for this workspace");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the SetupIntent to get the payment method
    const setupIntent = await stripe.setupIntents.retrieve(setup_intent_id);
    if (setupIntent.status !== "succeeded") {
      throw new Error(`SetupIntent status is ${setupIntent.status}, expected succeeded`);
    }

    const setupCustomerId = setupIntent.customer as string | null;
    if (lead.stripe_customer_id && setupCustomerId && lead.stripe_customer_id !== setupCustomerId) {
      throw new Error("Setup intent customer does not match this lead's business-scoped card vault.");
    }

    if (setupCustomerId) {
      const customer = await stripe.customers.retrieve(setupCustomerId);
      if (customer.deleted) throw new Error("Stripe customer not found");
      const customerWorkspaceId = (customer as Stripe.Customer).metadata?.workspace_id;
      if (customerWorkspaceId && customerWorkspaceId !== lead.workspace_id) {
        throw new Error("This card setup belongs to a different business workspace.");
      }
    }

    const paymentMethodId = setupIntent.payment_method as string;
    if (!paymentMethodId) throw new Error("No payment method found on SetupIntent");

    // Get card details
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    const card = paymentMethod.card;

    // Set as default payment method on customer
    if (setupIntent.customer) {
      await stripe.customers.update(setupIntent.customer as string, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });
    }

    // Save to lead record
    const { error: updateError } = await supabaseClient
      .from("leads")
      .update({
        stripe_customer_id: setupCustomerId || lead.stripe_customer_id,
        stripe_payment_method_id: paymentMethodId,
        card_last_four: card?.last4 || null,
        card_brand: card?.brand || null,
      })
      .eq("id", lead_id)
      .eq("workspace_id", lead.workspace_id);

    if (updateError) throw new Error(`Failed to save card info: ${updateError.message}`);

    return new Response(
      JSON.stringify({
        success: true,
        card_last_four: card?.last4,
        card_brand: card?.brand,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[confirm-card-setup] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
