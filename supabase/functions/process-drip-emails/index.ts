import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Drip email processor — called by pg_cron daily.
 * Checks all users' signup dates and sends the appropriate onboarding email.
 * 
 * Each email is transactional (1:1, triggered by the user's own signup action).
 * Drip schedule: Day 0 (welcome - already sent at signup), Day 2, Day 5, Day 10, Day 13.
 */

interface DripStep {
  day: number;
  templateName: string;
}

const DRIP_SCHEDULE: DripStep[] = [
  { day: 2, templateName: 'drip-day2-first-workflow' },
  { day: 5, templateName: 'drip-day5-progress' },
  { day: 10, templateName: 'drip-day10-power-features' },
  { day: 13, templateName: 'drip-day13-final-warning' },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const results: string[] = [];

  try {
    console.log("[DRIP] Processing drip emails...");

    for (const step of DRIP_SCHEDULE) {
      // Find users who signed up exactly `step.day` days ago
      // Allow a 1-day window to handle timing edge cases
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - step.day);
      const dayStart = new Date(targetDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(targetDate);
      dayEnd.setHours(23, 59, 59, 999);

      // Get users who completed onboarding in this date range
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, email, first_name, onboarding_completed_at')
        .eq('onboarding_completed', true)
        .gte('onboarding_completed_at', dayStart.toISOString())
        .lte('onboarding_completed_at', dayEnd.toISOString());

      if (usersError) {
        console.error(`[DRIP] Error fetching users for day ${step.day}:`, usersError);
        continue;
      }

      if (!users || users.length === 0) {
        console.log(`[DRIP] No users for day ${step.day} drip`);
        continue;
      }

      for (const user of users) {
        if (!user.email) continue;

        const idempotencyKey = `drip-${step.templateName}-${user.id}`;

        // Check if already sent via email_send_log
        const { data: existing } = await supabase
          .from('email_send_log')
          .select('id')
          .eq('template_name', step.templateName)
          .eq('recipient_email', user.email)
          .limit(1);

        if (existing && existing.length > 0) {
          console.log(`[DRIP] Already sent ${step.templateName} to ${user.email}`);
          continue;
        }

        // Build template data
        const templateData: Record<string, any> = {
          name: user.first_name || undefined,
        };

        // For day 5, get lead count
        if (step.day === 5) {
          const { data: ws } = await supabase
            .from('workspace_members')
            .select('workspace_id')
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle();

          if (ws?.workspace_id) {
            const { count } = await supabase
              .from('leads')
              .select('id', { count: 'exact', head: true })
              .eq('workspace_id', ws.workspace_id);
            templateData.leadCount = count || 0;
          }
        }

        // For day 13, calculate trial end date
        if (step.day === 13 && user.onboarding_completed_at) {
          const endDate = new Date(user.onboarding_completed_at);
          endDate.setDate(endDate.getDate() + 14);
          templateData.trialEndDate = endDate.toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric',
          });
        }

        // Send via transactional email system
        try {
          await supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: step.templateName,
              recipientEmail: user.email,
              idempotencyKey,
              templateData,
            },
          });

          results.push(`Sent ${step.templateName} to ${user.email}`);
          console.log(`[DRIP] Sent ${step.templateName} to ${user.email}`);
        } catch (sendError) {
          console.error(`[DRIP] Failed to send ${step.templateName} to ${user.email}:`, sendError);
        }
      }
    }

    console.log(`[DRIP] Complete. ${results.length} emails sent.`);

    return new Response(JSON.stringify({ sent: results.length, details: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[DRIP] Fatal error:", msg);
    try {
      const { logEdgeFunctionError } = await import("../_shared/server-error-logger.ts");
      await logEdgeFunctionError("process-drip-emails", error instanceof Error ? error : new Error(msg));
    } catch (_) { /* never block response */ }
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
