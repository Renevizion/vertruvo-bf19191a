import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

import { publicCorsHeaders } from "../_shared/cors-public.ts";
;

/**
 * Creates a Stripe Checkout session in "setup" mode for public booking.
 * This vaults the client's card without charging — the business charges later
 * when they close the appointment via the existing charge-card-on-file flow.
 */
serve(async (req) => {
  const corsHeaders = publicCorsHeaders(req);
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

    if (!workspace_id || !item_id || !client_name || !client_email) {
      throw new Error("Missing required fields (workspace_id, item_id, client_name, client_email)");
    }

    const { data: workspace } = await supabaseClient
      .from("workspaces")
      .select("slug")
      .eq("id", workspace_id)
      .single();

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Reuse only workspace-scoped customer IDs from this workspace's own leads
    let customerId: string | null = null;
    const normalizedEmail = (client_email || "").trim().toLowerCase();

    if (normalizedEmail) {
      const { data: existingLead } = await supabaseClient
        .from("leads")
        .select("stripe_customer_id")
        .eq("workspace_id", workspace_id)
        .ilike("email", normalizedEmail)
        .not("stripe_customer_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      customerId = existingLead?.stripe_customer_id ?? null;
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: normalizedEmail || undefined,
        name: client_name,
        phone: client_phone || undefined,
        metadata: {
          workspace_id,
          scope: "workspace",
        },
      });
      customerId = customer.id;
    }

    const appBaseUrl = (
      Deno.env.get("APP_URL") ||
      req.headers.get("origin") ||
      "https://lovably-reach-hub.lovable.app"
    ).replace(/\/+$/, "");
    const slug = workspace?.slug || workspace_id;

    const metadata: Record<string, string> = {
      workspace_id,
      item_id,
      client_name,
      client_phone: client_phone || "",
      client_email,
      client_notes: client_notes || "",
      start_time,
      end_time,
      resource_id: resource_id || "",
      item_title: item_title || "Appointment",
      amount_cents: String(amount_cents || 0),
      flow: "public_booking_setup",
    };

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "setup",
      payment_method_types: ["card"],
      metadata,
      success_url: `${appBaseUrl}/book/${slug}?card_saved=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appBaseUrl}/book/${slug}?cancelled=true`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[public-booking-setup-card] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
