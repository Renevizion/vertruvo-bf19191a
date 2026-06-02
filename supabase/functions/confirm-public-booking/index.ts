import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Confirms a public booking after card-save (setup mode) or payment.
 * Uses transaction-safe pattern: if booking insert fails, lead is cleaned up.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { session_id } = await req.json();
    if (!session_id) throw new Error("session_id required");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id);
    const m = session.metadata || {};
    const flow = m.flow || "public_booking";

    // Verify the session is complete
    if (flow === "public_booking" && session.payment_status !== "paid") {
      return new Response(JSON.stringify({ success: false, reason: "not_paid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (flow === "public_booking_setup" && session.status !== "complete") {
      return new Response(JSON.stringify({ success: false, reason: "not_complete" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // For setup mode, get the payment method from the SetupIntent
    let stripeCustomerId = session.customer as string | null;
    let stripePaymentMethodId: string | null = null;

    if (flow === "public_booking_setup" && session.setup_intent) {
      const setupIntent = await stripe.setupIntents.retrieve(session.setup_intent as string);
      stripePaymentMethodId = setupIntent.payment_method as string | null;
      stripeCustomerId = setupIntent.customer as string | null;
    }

    // Reuse existing lead in same workspace (per-business enrollment), otherwise create one
    const normalizedEmail = (m.client_email || "").trim().toLowerCase();
    let leadId: string;
    let createdLead = false;

    const existingLead = normalizedEmail
      ? await supabaseClient
          .from("leads")
          .select("id")
          .eq("workspace_id", m.workspace_id)
          .ilike("email", normalizedEmail)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null, error: null };

    if (existingLead.data?.id) {
      leadId = existingLead.data.id;

      const leadUpdate: Record<string, any> = {
        name: m.client_name,
        email: normalizedEmail || null,
        phone: m.client_phone || null,
        notes: m.client_notes || null,
        lifecycle_stage: "Customer",
      };

      if (stripeCustomerId) leadUpdate.stripe_customer_id = stripeCustomerId;
      if (stripePaymentMethodId) leadUpdate.stripe_payment_method_id = stripePaymentMethodId;

      await supabaseClient
        .from("leads")
        .update(leadUpdate)
        .eq("id", leadId)
        .eq("workspace_id", m.workspace_id);
    } else {
      const leadInsert: Record<string, any> = {
        name: m.client_name,
        email: normalizedEmail || null,
        phone: m.client_phone || null,
        source: "booking_page",
        workspace_id: m.workspace_id,
        notes: m.client_notes || null,
        lifecycle_stage: "Customer",
      };

      if (stripeCustomerId) leadInsert.stripe_customer_id = stripeCustomerId;
      if (stripePaymentMethodId) leadInsert.stripe_payment_method_id = stripePaymentMethodId;

      const { data: lead, error: leadError } = await supabaseClient
        .from("leads")
        .insert(leadInsert)
        .select("id")
        .single();

      if (leadError || !lead) throw leadError ?? new Error("Failed to create lead");
      leadId = lead.id;
      createdLead = true;
    }

    // Create booking — if this fails, clean up the orphan lead
    const bookingInsert: Record<string, any> = {
      title: `${m.client_name} — ${m.item_title}`,
      start_time: m.start_time,
      end_time: m.end_time,
      workspace_id: m.workspace_id,
      lead_id: leadId,
      item_id: m.item_id,
      resource_id: m.resource_id || null,
      status: "confirmed",
      notes: m.client_notes || null,
    };

    const { error: bookingError } = await supabaseClient
      .from("bookings")
      .insert(bookingInsert);

    if (bookingError) {
      // Rollback: delete the orphan lead so we don't have paid-but-not-booked
      console.error("[confirm-public-booking] Booking insert failed, rolling back lead:", bookingError.message);
      if (createdLead) {
        await supabaseClient.from("leads").delete().eq("id", leadId);
      }
      throw new Error(`Booking creation failed: ${bookingError.message}. Lead rolled back.`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        lead_id: leadId,
        card_saved: flow === "public_booking_setup",
        paid: flow === "public_booking",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[confirm-public-booking] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
