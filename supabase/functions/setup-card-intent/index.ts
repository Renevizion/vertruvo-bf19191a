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

    const { lead_id } = await req.json();
    if (!lead_id) throw new Error("lead_id is required");

    // Fetch lead
    const { data: lead, error: leadError } = await supabaseClient
      .from("leads")
      .select("id, name, email, workspace_id, stripe_customer_id")
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

    if (!isMember && !isOwner) {
      throw new Error("Unauthorized for this workspace");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get or create Stripe customer scoped to this workspace
    let customerId = lead.stripe_customer_id;

    if (customerId) {
      try {
        const existingCustomer = await stripe.customers.retrieve(customerId);
        if (existingCustomer.deleted) {
          customerId = undefined;
        } else {
          const customerWorkspaceId = (existingCustomer as Stripe.Customer).metadata?.workspace_id;
          if (customerWorkspaceId && customerWorkspaceId !== lead.workspace_id) {
            customerId = undefined;
          }
        }
      } catch {
        customerId = undefined;
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        name: lead.name,
        email: lead.email || undefined,
        metadata: {
          lead_id: lead.id,
          workspace_id: lead.workspace_id,
          scope: "workspace",
        },
      });
      customerId = customer.id;

      // Save stripe_customer_id to lead
      await supabaseClient
        .from("leads")
        .update({ stripe_customer_id: customerId })
        .eq("id", lead.id);
    }

    // Create SetupIntent for saving card
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      usage: "off_session",
      metadata: {
        lead_id: lead.id,
        workspace_id: lead.workspace_id,
        scope: "workspace",
      },
    });

    return new Response(
      JSON.stringify({
        client_secret: setupIntent.client_secret,
        customer_id: customerId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[setup-card-intent] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
