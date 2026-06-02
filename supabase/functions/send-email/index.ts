import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { sendEmail, getWorkspaceEmailConfig, generateReplyToken } from "../_shared/email-service.ts";
import { verifyAuth, unauthorizedResponse } from "../_shared/auth.ts";
import { checkUsageGate, usageLimitResponse } from "../_shared/usage-gate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  workspaceId: string;
  to: string;
  subject: string;
  body: string;
  html?: string;
  contactId?: string;
  leadId?: string;
  createConversation?: boolean;
}

/**
 * Generic email sending endpoint
 * Used for one-off emails, inbox messages, etc.
 * 
 * Features:
 * - Uses workspace business settings for From Name
 * - Replies go back to business email (via Reply-To header)
 * - Optionally creates/updates conversation thread
 * - Tracks messages for inbox integration
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await verifyAuth(req);
    if (!auth) return unauthorizedResponse(corsHeaders);
    console.log(`[Send Email] Authenticated: ${auth.userId}`);
    const request: SendEmailRequest = await req.json();
    const { workspaceId, to, subject, body, html, contactId, leadId, createConversation = true } = request;

    // USAGE GATE: Check email limits
    if (workspaceId) {
      const usageCheck = await checkUsageGate(workspaceId, 'emails_sent', auth.userId);
      if (!usageCheck.allowed) return usageLimitResponse(corsHeaders, usageCheck);
    }
    
    console.log(`Sending email to ${to} for workspace ${workspaceId}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get email configuration for this workspace
    const emailConfig = await getWorkspaceEmailConfig(supabase, workspaceId);
    console.log("Using email config:", { 
      fromName: emailConfig.fromName, 
      replyTo: emailConfig.replyToEmail 
    });

    // Generate reply token for tracking
    const replyToken = generateReplyToken();

    // Prepare HTML body
    const htmlBody = html || body.replace(/\n/g, '<br>');

    // Send the email
    const result = await sendEmail({
      to,
      subject,
      html: htmlBody,
      text: body.replace(/<[^>]*>/g, ''),
      config: emailConfig,
      replyToken,
      tags: [
        { name: "type", value: "direct" },
        { name: "workspace_id", value: workspaceId },
      ],
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to send email");
    }

    let conversationId: string | null = null;

    // Create or update conversation if requested
    if (createConversation && (contactId || leadId)) {
      // Check for existing conversation
      const query = supabase
        .from("conversations")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("channel", "email");

      if (contactId) {
        query.eq("contact_id", contactId);
      } else if (leadId) {
        query.eq("lead_id", leadId);
      }

      const { data: existingConv } = await query.single();

      if (existingConv) {
        conversationId = existingConv.id;
      } else {
        // Create new conversation
        const { data: newConv } = await supabase
          .from("conversations")
          .insert({
            workspace_id: workspaceId,
            channel: "email",
            contact_id: contactId || null,
            lead_id: leadId || null,
            status: "open",
            last_message_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        conversationId = newConv?.id || null;
      }

      // Store message in conversation
      if (conversationId) {
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          channel: "email",
          direction: "outbound",
          content: body,
          reply_token: replyToken,
          resend_email_id: result.emailId,
          sent_at: new Date().toISOString(),
          metadata: { subject },
        });

        // Update conversation last_message_at
        await supabase
          .from("conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", conversationId);
      }

      // Log activity
      await supabase.from("activities").insert({
        workspace_id: workspaceId,
        contact_id: contactId || null,
        lead_id: leadId || null,
        type: "email_sent",
        title: `Email sent: ${subject}`,
        description: `Email sent to ${to}`,
      });
    }

    console.log("Email sent successfully:", result.emailId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: result.emailId,
        conversationId 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in send-email:", error);
    const message = error instanceof Error ? error.message : 'Failed to send email';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
