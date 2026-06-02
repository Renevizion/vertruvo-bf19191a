import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { sendEmail, getWorkspaceEmailConfig, generateReplyToken } from "../_shared/email-service.ts";
import { verifyAuth, unauthorizedResponse } from "../_shared/auth.ts";
import { checkUsageGate, usageLimitResponse } from "../_shared/usage-gate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CampaignEmailRequest {
  campaignId: string;
  workspaceId: string;
  testEmail?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await verifyAuth(req);
  if (!auth) return unauthorizedResponse(corsHeaders);
  console.log(`[Campaign Email] Authenticated: ${auth.userId}`);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { campaignId, workspaceId, testEmail }: CampaignEmailRequest = await req.json();

    // USAGE GATE: Check email limits (skip for test emails)
    if (!testEmail && workspaceId) {
      const usageCheck = await checkUsageGate(workspaceId, 'emails_sent', auth.userId);
      if (!usageCheck.allowed) return usageLimitResponse(corsHeaders, usageCheck);
    }
    
    console.log(`Processing campaign ${campaignId} for workspace ${workspaceId}`);

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error("Campaign not found:", campaignError);
      throw new Error("Campaign not found");
    }

    // Get email configuration for this workspace
    const emailConfig = await getWorkspaceEmailConfig(supabase, workspaceId);
    console.log("Email config:", { fromName: emailConfig.fromName, replyTo: emailConfig.replyToEmail });

    let recipients: string[] = [];
    let recipientCount = 0;

    // If test email, only send to that email
    if (testEmail) {
      recipients = [testEmail];
      recipientCount = 1;
      console.log(`Sending test email to: ${testEmail}`);
    } else {
      // Get target list subscribers
      if (!campaign.target_list_ids || campaign.target_list_ids.length === 0) {
        throw new Error("No target lists selected for this campaign");
      }

      const { data: subscribers, error: subError } = await supabase
        .from("email_list_subscribers")
        .select("email, name")
        .in("list_id", campaign.target_list_ids)
        .eq("status", "active");

      if (subError) {
        console.error("Error fetching subscribers:", subError);
        throw new Error("Failed to fetch subscribers");
      }

      // Deduplicate by email
      const uniqueEmails = new Map<string, string>();
      subscribers?.forEach(sub => {
        if (sub.email && !uniqueEmails.has(sub.email)) {
          uniqueEmails.set(sub.email, sub.name || "");
        }
      });

      recipients = Array.from(uniqueEmails.keys());
      recipientCount = recipients.length;
      console.log(`Sending to ${recipientCount} unique subscribers`);
    }

    if (recipients.length === 0) {
      throw new Error("No valid recipients found");
    }

    // Send emails in batches
    const batchSize = 10;
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      const promises = batch.map(async (email) => {
        const replyToken = generateReplyToken();
        
        const result = await sendEmail({
          to: email,
          subject: campaign.subject || "No Subject",
          html: campaign.content || "",
          config: emailConfig,
          replyToken,
          tags: [
            { name: "campaign_id", value: campaignId },
            { name: "workspace_id", value: workspaceId },
          ],
        });
        
        return { email, ...result };
      });

      const results = await Promise.all(promises);
      
      for (const result of results) {
        if (result.success) {
          successCount++;
        } else {
          failCount++;
          errors.push(`${result.email}: ${result.error}`);
        }
      }
    }

    // Update campaign status and metrics (only for real sends, not tests)
    if (!testEmail) {
      await supabase
        .from("email_campaigns")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .eq("id", campaignId);

      // Update or create metrics
      const { data: existingMetrics } = await supabase
        .from("email_campaign_metrics")
        .select("id")
        .eq("campaign_id", campaignId)
        .single();

      if (existingMetrics) {
        await supabase
          .from("email_campaign_metrics")
          .update({
            total_sent: recipientCount,
            total_delivered: successCount,
            total_bounced: failCount,
            updated_at: new Date().toISOString(),
          })
          .eq("campaign_id", campaignId);
      } else {
        await supabase
          .from("email_campaign_metrics")
          .insert({
            campaign_id: campaignId,
            total_sent: recipientCount,
            total_delivered: successCount,
            total_bounced: failCount,
          });
      }
    }

    console.log(`Campaign ${campaignId} completed: ${successCount} sent, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          total: recipientCount,
          sent: successCount,
          failed: failCount,
          errors: errors.slice(0, 10),
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in send-campaign-email:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred sending the campaign email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
