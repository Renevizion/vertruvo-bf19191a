import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

/**
 * Resend Webhook Handler
 * Processes inbound email replies and delivery events
 * 
 * Webhook events:
 * - email.delivered: Track successful delivery
 * - email.opened: Track opens
 * - email.clicked: Track clicks
 * - email.bounced: Track bounces
 * - email.complained: Track spam complaints
 * - inbound_email: Process incoming reply emails
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const webhookSecret = Deno.env.get("RESEND_WEBHOOK_SECRET");
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get raw payload for signature verification
    const rawPayload = await req.text();
    
    // Verify webhook signature if secret is configured
    if (webhookSecret) {
      const svixId = req.headers.get("svix-id");
      const svixTimestamp = req.headers.get("svix-timestamp");
      const svixSignature = req.headers.get("svix-signature");
      
      if (!svixId || !svixTimestamp || !svixSignature) {
        console.error("Missing SVIX headers for signature verification");
        return new Response(
          JSON.stringify({ error: "Missing webhook signature headers" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const wh = new Webhook(webhookSecret);
      try {
        wh.verify(rawPayload, {
          "svix-id": svixId,
          "svix-timestamp": svixTimestamp,
          "svix-signature": svixSignature,
        });
        console.log("Webhook signature verified successfully");
      } catch (verifyError) {
        console.error("Webhook signature verification failed:", verifyError);
        return new Response(
          JSON.stringify({ error: "Invalid webhook signature" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      console.warn("RESEND_WEBHOOK_SECRET not configured - skipping signature verification");
    }
    
    // Parse the verified payload
    const payload = JSON.parse(rawPayload);
    console.log("Resend webhook received:", payload.type);

    const eventType = payload.type;
    const data = payload.data;

    switch (eventType) {
      case "email.delivered":
        await handleDelivered(supabase, data);
        break;
        
      case "email.opened":
        await handleOpened(supabase, data);
        break;
        
      case "email.clicked":
        await handleClicked(supabase, data);
        break;
        
      case "email.bounced":
        await handleBounced(supabase, data);
        break;
        
      case "email.complained":
        await handleComplaint(supabase, data);
        break;

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleDelivered(supabase: any, data: any) {
  console.log("Email delivered:", data.email_id);
  
  // Update message status if we have the email ID
  if (data.email_id) {
    await supabase
      .from("messages")
      .update({ 
        sent_at: new Date().toISOString(),
        metadata: { delivered: true, delivered_at: new Date().toISOString() }
      })
      .eq("resend_email_id", data.email_id);
  }
}

async function handleOpened(supabase: any, data: any) {
  console.log("Email opened:", data.email_id);
  
  // Track open in campaign metrics if it's a campaign email
  if (data.tags?.campaign_id) {
    await supabase
      .from("email_campaign_metrics")
      .update({ 
        total_opened: supabase.sql`total_opened + 1`
      })
      .eq("campaign_id", data.tags.campaign_id);
  }
}

async function handleClicked(supabase: any, data: any) {
  console.log("Email link clicked:", data.email_id, data.click?.link);
  
  if (data.tags?.campaign_id) {
    await supabase
      .from("email_campaign_metrics")
      .update({ 
        total_clicked: supabase.sql`total_clicked + 1`
      })
      .eq("campaign_id", data.tags.campaign_id);
  }
}

async function handleBounced(supabase: any, data: any) {
  console.log("Email bounced:", data.email_id, data.bounce?.type);
  
  // Mark subscriber as bounced if from a list
  if (data.to?.[0]) {
    await supabase
      .from("email_list_subscribers")
      .update({ 
        status: "bounced",
        metadata: { bounce_type: data.bounce?.type, bounced_at: new Date().toISOString() }
      })
      .eq("email", data.to[0]);
  }
  
  if (data.tags?.campaign_id) {
    await supabase
      .from("email_campaign_metrics")
      .update({ 
        total_bounced: supabase.sql`total_bounced + 1`
      })
      .eq("campaign_id", data.tags.campaign_id);
  }
}

async function handleComplaint(supabase: any, data: any) {
  console.log("Spam complaint received:", data.email_id);
  
  // Unsubscribe the complainant
  if (data.to?.[0]) {
    await supabase
      .from("email_list_subscribers")
      .update({ 
        status: "unsubscribed",
        unsubscribed_at: new Date().toISOString(),
        metadata: { unsubscribe_reason: "spam_complaint" }
      })
      .eq("email", data.to[0]);
  }
}
