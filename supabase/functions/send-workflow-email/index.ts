import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { sendEmail, getWorkspaceEmailConfig, generateReplyToken } from "../_shared/email-service.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WorkflowEmailRequest {
  workspaceId: string;
  to: string;
  subject: string;
  body: string;
  contactId?: string;
  leadId?: string;
  workflowId?: string;
  workflowRunId?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: WorkflowEmailRequest = await req.json();
    const { workspaceId, to, subject, body, contactId, leadId, workflowId, workflowRunId } = request;
    
    console.log(`Sending workflow email to ${to} for workspace ${workspaceId}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get email configuration for this workspace
    const emailConfig = await getWorkspaceEmailConfig(supabase, workspaceId);

    // Generate reply token for tracking
    const replyToken = generateReplyToken();

    // Convert plain text to HTML if needed
    const htmlBody = body.includes('<') ? body : body.replace(/\n/g, '<br>');

    // Send the email
    const result = await sendEmail({
      to,
      subject,
      html: htmlBody,
      text: body.replace(/<[^>]*>/g, ''),
      config: emailConfig,
      replyToken,
      tags: [
        { name: "type", value: "workflow" },
        { name: "workspace_id", value: workspaceId },
        ...(workflowId ? [{ name: "workflow_id", value: workflowId }] : []),
      ],
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to send email");
    }

    // Find or create conversation for this email
    let conversationId: string | null = null;

    if (contactId || leadId) {
      // Check for existing conversation
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("channel", "email")
        .eq(contactId ? "contact_id" : "lead_id", contactId || leadId)
        .single();

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
          metadata: {
            subject,
            workflow_id: workflowId,
            workflow_run_id: workflowRunId,
          },
        });

        // Update conversation last_message_at
        await supabase
          .from("conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", conversationId);
      }
    }

    // Log activity
    await supabase.from("activities").insert({
      workspace_id: workspaceId,
      contact_id: contactId || null,
      lead_id: leadId || null,
      type: "email_sent",
      title: `Workflow email sent: ${subject}`,
      description: `Email sent to ${to}`,
    });

    console.log("Workflow email sent successfully:", result.emailId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: result.emailId,
        conversationId 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in send-workflow-email:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
