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
    const {
      workspace_id,
      item_id,
      item_title,
      amount_cents,
      client_name,
      client_email,
      client_phone,
      client_notes,
      start_time,
      end_time,
      resource_id,
    } = await req.json();

    if (!workspace_id || !item_id || !amount_cents || !client_name) {
      throw new Error("Missing required fields");
    }

    // Get workspace Stripe Connect info
    const { data: workspace } = await supabaseClient
      .from("workspaces")
      .select("stripe_connect_account_id, stripe_connect_onboarded, platform_fee_percent, slug")
      .eq("id", workspace_id)
      .single();

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const appBaseUrl = (
      Deno.env.get("APP_URL") ||
      req.headers.get("origin") ||
      "https://lovably-reach-hub.lovable.app"
    ).replace(/\/+$/, "");
    const slug = workspace?.slug || workspace_id;

    // Store booking details in metadata so we can create them after payment
    const metadata: Record<string, string> = {
      workspace_id,
      item_id,
      client_name,
      client_phone: client_phone || "",
      client_email: client_email || "",
      client_notes: client_notes || "",
      start_time,
      end_time,
      resource_id: resource_id || "",
      item_title: item_title || "Appointment",
      flow: "public_booking",
    };

    const sessionParams: any = {
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: item_title || "Booking" },
            unit_amount: Math.round(amount_cents),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      customer_email: client_email || undefined,
      metadata,
      success_url: `${appBaseUrl}/book/${slug}?paid=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appBaseUrl}/book/${slug}?cancelled=true`,
    };

    // Route payment to connected account if available
    if (workspace?.stripe_connect_account_id && workspace?.stripe_connect_onboarded) {
      const feePercent = Number(workspace.platform_fee_percent) || 2.5;
      const applicationFee = Math.round(amount_cents * (feePercent / 100));
      sessionParams.payment_intent_data = {
        application_fee_amount: applicationFee,
        transfer_data: { destination: workspace.stripe_connect_account_id },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[public-booking-checkout] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
