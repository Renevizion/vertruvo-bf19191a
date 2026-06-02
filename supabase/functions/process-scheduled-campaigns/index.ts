import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, getWorkspaceEmailConfig, generateReplyToken } from "../_shared/email-service.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Find campaigns that are scheduled and due
    const { data: dueCampaigns, error: fetchError } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_at", new Date().toISOString());

    if (fetchError) throw fetchError;
    if (!dueCampaigns || dueCampaigns.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Scheduled Campaigns] Found ${dueCampaigns.length} due campaigns`);
    let totalProcessed = 0;

    for (const campaign of dueCampaigns) {
      try {
        // Mark as sending
        await supabase.from("email_campaigns").update({ status: "sending" }).eq("id", campaign.id);

        // Get email config
        const emailConfig = await getWorkspaceEmailConfig(supabase, campaign.workspace_id);

        // Get subscribers
        if (!campaign.target_list_ids || campaign.target_list_ids.length === 0) {
          await supabase.from("email_campaigns").update({ status: "failed" }).eq("id", campaign.id);
          continue;
        }

        const { data: subscribers } = await supabase
          .from("email_list_subscribers")
          .select("email, name")
          .in("list_id", campaign.target_list_ids)
          .eq("status", "active");

        const uniqueEmails = new Map<string, string>();
        subscribers?.forEach((sub) => {
          if (sub.email && !uniqueEmails.has(sub.email)) {
            uniqueEmails.set(sub.email, sub.name || "");
          }
        });

        const recipients = Array.from(uniqueEmails.keys());
        if (recipients.length === 0) {
          await supabase.from("email_campaigns").update({ status: "failed" }).eq("id", campaign.id);
          continue;
        }

        // Send in batches
        let successCount = 0;
        let failCount = 0;
        const batchSize = 10;

        for (let i = 0; i < recipients.length; i += batchSize) {
          const batch = recipients.slice(i, i + batchSize);
          const results = await Promise.all(
            batch.map(async (email) => {
              const result = await sendEmail({
                to: email,
                subject: campaign.subject || "No Subject",
                html: campaign.content || "",
                config: emailConfig,
                replyToken: generateReplyToken(),
                tags: [
                  { name: "campaign_id", value: campaign.id },
                  { name: "workspace_id", value: campaign.workspace_id },
                ],
              });
              return result;
            })
          );

          for (const r of results) {
            if (r.success) successCount++;
            else failCount++;
          }
        }

        // Update campaign
        await supabase.from("email_campaigns").update({
          status: "sent",
          sent_at: new Date().toISOString(),
        }).eq("id", campaign.id);

        // Upsert metrics
        const { data: existing } = await supabase
          .from("email_campaign_metrics")
          .select("id")
          .eq("campaign_id", campaign.id)
          .single();

        if (existing) {
          await supabase.from("email_campaign_metrics").update({
            total_sent: recipients.length,
            total_delivered: successCount,
            total_bounced: failCount,
            updated_at: new Date().toISOString(),
          }).eq("campaign_id", campaign.id);
        } else {
          await supabase.from("email_campaign_metrics").insert({
            campaign_id: campaign.id,
            total_sent: recipients.length,
            total_delivered: successCount,
            total_bounced: failCount,
          });
        }

        totalProcessed++;
        console.log(`[Scheduled Campaigns] Campaign ${campaign.id}: ${successCount} sent, ${failCount} failed`);
      } catch (campError) {
        console.error(`[Scheduled Campaigns] Error processing campaign ${campaign.id}:`, campError);
        await supabase.from("email_campaigns").update({ status: "failed" }).eq("id", campaign.id);
      }
    }

    return new Response(JSON.stringify({ processed: totalProcessed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Scheduled Campaigns] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
