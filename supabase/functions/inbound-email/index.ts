import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

/**
 * Inbound Email Handler
 * Receives email replies via Resend inbound parsing
 * and routes them to the appropriate conversation/contact
 * 
 * How it works:
 * 1. Outbound emails use reply-{token}@mail.kiruvo.com as Reply-To
 * 2. When recipient replies, Resend catches it and posts to this webhook
 * 3. We parse the token to find the original message/conversation
 * 4. We add the reply to the conversation thread
 */
serve(async (req) => {
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
        console.log("Inbound email webhook signature verified successfully");
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
    console.log("Inbound email received:", {
      from: payload.from,
      to: payload.to,
      subject: payload.subject,
    });

    const toAddress = payload.to?.[0] || payload.to;
    const fromEmail = payload.from?.email || payload.from;
    const fromName = payload.from?.name || fromEmail?.split("@")[0];
    
    // Extract reply token from the to address
    // Format: reply-{token}@mail.kiruvo.com
    let replyToken: string | null = null;
    const tokenMatch = toAddress?.match(/reply-([a-z0-9]+)@/i);
    if (tokenMatch) {
      replyToken = tokenMatch[1];
    }

    console.log("Parsed reply token:", replyToken);

    // Find the original message and conversation
    let conversationId: string | null = null;
    let workspaceId: string | null = null;
    let contactId: string | null = null;
    let leadId: string | null = null;

    if (replyToken) {
      // Look up the original message by reply token
      const { data: originalMessage } = await supabase
        .from("messages")
        .select("conversation_id, channel")
        .eq("reply_token", replyToken)
        .single();

      if (originalMessage) {
        conversationId = originalMessage.conversation_id;
        
        // Get conversation details
        const { data: conversation } = await supabase
          .from("conversations")
          .select("workspace_id, contact_id, lead_id")
          .eq("id", conversationId)
          .single();

        if (conversation) {
          workspaceId = conversation.workspace_id;
          contactId = conversation.contact_id;
          leadId = conversation.lead_id;
        }
      }
    }

    // If no token match, try to find by sender email
    if (!conversationId && fromEmail) {
      // Check if we have a contact with this email
      const { data: contact } = await supabase
        .from("contacts")
        .select("id, workspace_id")
        .eq("email", fromEmail)
        .single();

      if (contact) {
        contactId = contact.id;
        workspaceId = contact.workspace_id;
        
        // Find or create conversation
        const { data: existingConv } = await supabase
          .from("conversations")
          .select("id")
          .eq("contact_id", contactId)
          .eq("channel", "email")
          .single();

        if (existingConv) {
          conversationId = existingConv.id;
        }
      }

      // Also check leads
      if (!contactId) {
        const { data: lead } = await supabase
          .from("leads")
          .select("id, workspace_id")
          .eq("email", fromEmail)
          .single();

        if (lead) {
          leadId = lead.id;
          workspaceId = lead.workspace_id;
          
          const { data: existingConv } = await supabase
            .from("conversations")
            .select("id")
            .eq("lead_id", leadId)
            .eq("channel", "email")
            .single();

          if (existingConv) {
            conversationId = existingConv.id;
          }
        }
      }
    }

    // Store the inbound email
    const { data: inboundEmail, error: insertError } = await supabase
      .from("inbound_emails")
      .insert({
        workspace_id: workspaceId,
        conversation_id: conversationId,
        contact_id: contactId,
        lead_id: leadId,
        from_email: fromEmail,
        from_name: fromName,
        to_email: toAddress,
        subject: payload.subject,
        body_text: payload.text || payload.plain || '',
        body_html: payload.html || '',
        reply_token: replyToken,
        original_message_id: payload.headers?.["In-Reply-To"] || null,
        resend_email_id: payload.email_id,
        status: conversationId ? "matched" : "unmatched",
        processed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to store inbound email:", insertError);
    }

    // If we found a conversation, add the reply as a message
    if (conversationId && workspaceId) {
      // Create message in conversation
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        channel: "email",
        direction: "inbound",
        content: payload.text || payload.plain || payload.html || "",
        metadata: {
          subject: payload.subject,
          from_email: fromEmail,
          from_name: fromName,
          inbound_email_id: inboundEmail?.id,
        },
      });

      // Update conversation last_message_at
      await supabase
        .from("conversations")
        .update({
          last_message_at: new Date().toISOString(),
          status: "open",
        })
        .eq("id", conversationId);

      // Log activity
      await supabase.from("activities").insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        lead_id: leadId,
        type: "email_received",
        title: `Email reply received: ${payload.subject || "(no subject)"}`,
        description: `Reply from ${fromEmail}`,
      });

      console.log("Reply added to conversation:", conversationId);
    } else {
      console.log("No matching conversation found, stored as unmatched inbound email");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        matched: !!conversationId,
        inbound_email_id: inboundEmail?.id 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Inbound email error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing the inbound email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
