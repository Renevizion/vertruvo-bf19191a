import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Cost estimates (rough, conservative)
const COST_PER_CALL = 0.10;
const COST_PER_VOICEMAIL = 0.05;
const COST_PER_SMS = 0.0079;
const COST_PER_EMAIL = 0.0001;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // Cron tick — no auth required, validates source via service key on internal call
    if (action === "tick") {
      return await processTick();
    }

    // All other actions require auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const authClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims } = await authClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);

    const userId = claims.claims.sub as string;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: member } = await admin
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .limit(1)
      .single();
    if (!member) return json({ error: "No workspace" }, 403);
    const workspaceId = member.workspace_id;

    if (action === "preview_leads") {
      return await previewLeads(admin, workspaceId, body.filter);
    }
    if (action === "estimate_cost") {
      return await estimateCost(admin, workspaceId, body.filter, body.sequence);
    }
    if (action === "launch") {
      return await launchCampaign(admin, workspaceId, userId, body);
    }
    if (action === "pause") {
      await admin.from("outreach_campaigns").update({ status: "paused" }).eq("id", body.campaign_id).eq("workspace_id", workspaceId);
      return json({ success: true });
    }
    if (action === "resume") {
      await admin.from("outreach_campaigns").update({ status: "running" }).eq("id", body.campaign_id).eq("workspace_id", workspaceId);
      return json({ success: true });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (e) {
    console.error("[orchestrator]", e);
    return json({ error: e instanceof Error ? e.message : "Server error" }, 500);
  }
});

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function resolveLeadIds(admin: any, workspaceId: string, filter: any): Promise<string[]> {
  const mode = filter?.mode;
  let q = admin.from("leads").select("id").eq("workspace_id", workspaceId);

  if (mode === "manual" && Array.isArray(filter.lead_ids) && filter.lead_ids.length) {
    return filter.lead_ids;
  }
  if (mode === "stage" && Array.isArray(filter.stage_ids) && filter.stage_ids.length) {
    q = q.in("stage_id", filter.stage_ids);
  } else if (mode === "date_range" && filter.from && filter.to) {
    q = q.gte("created_at", filter.from).lte("created_at", filter.to);
  } else if (mode === "inactivity") {
    const days = Number(filter.days) || 30;
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    q = q.or(`last_contacted_at.is.null,last_contacted_at.lt.${cutoff}`);
  }
  const { data } = await q.limit(5000);
  return (data || []).map((r: any) => r.id);
}

async function previewLeads(admin: any, workspaceId: string, filter: any) {
  const ids = await resolveLeadIds(admin, workspaceId, filter);
  if (!ids.length) return json({ count: 0, leads: [] });
  const { data: leads } = await admin
    .from("leads")
    .select("id, name, email, phone, last_contacted_at, value")
    .in("id", ids)
    .limit(100);
  return json({ count: ids.length, leads: leads || [] });
}

async function estimateCost(admin: any, workspaceId: string, filter: any, sequence: any[]) {
  const ids = await resolveLeadIds(admin, workspaceId, filter);
  let cost = 0;
  for (const step of sequence || []) {
    if (step.channel === "voice") cost += ids.length * COST_PER_CALL;
    if (step.channel === "voicemail") cost += ids.length * COST_PER_VOICEMAIL;
    if (step.channel === "sms") cost += ids.length * COST_PER_SMS;
    if (step.channel === "email") cost += ids.length * COST_PER_EMAIL;
  }
  return json({ lead_count: ids.length, estimated_cost_usd: Number(cost.toFixed(2)) });
}

async function launchCampaign(admin: any, workspaceId: string, userId: string, body: any) {
  const { name, objective, sequence, filter, booking_mode, max_calls } = body;
  if (!name || !objective || !Array.isArray(sequence) || !sequence.length) {
    return json({ error: "Missing name, objective, or sequence" }, 400);
  }

  const leadIds = await resolveLeadIds(admin, workspaceId, filter);
  if (!leadIds.length) return json({ error: "No leads matched the filter" }, 400);

  const hasVoice = sequence.some((s: any) => s.channel === "voice" || s.channel === "voicemail");
  const callCap = Number(max_calls) || 50;
  const eligibleForVoice = hasVoice ? Math.min(leadIds.length, callCap) : leadIds.length;

  let estCost = 0;
  for (const step of sequence) {
    const targetCount = step.channel === "voice" || step.channel === "voicemail" ? eligibleForVoice : leadIds.length;
    if (step.channel === "voice") estCost += targetCount * COST_PER_CALL;
    if (step.channel === "voicemail") estCost += targetCount * COST_PER_VOICEMAIL;
    if (step.channel === "sms") estCost += targetCount * COST_PER_SMS;
    if (step.channel === "email") estCost += targetCount * COST_PER_EMAIL;
  }

  const { data: campaign, error: cErr } = await admin
    .from("outreach_campaigns")
    .insert({
      workspace_id: workspaceId,
      created_by: userId,
      name,
      objective,
      sequence,
      filter_config: filter,
      booking_mode: booking_mode || "hybrid",
      max_calls: callCap,
      total_leads: leadIds.length,
      estimated_cost_usd: estCost,
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (cErr || !campaign) return json({ error: cErr?.message || "Failed to create campaign" }, 500);

  // Enroll all leads
  const enrollments = leadIds.map((lead_id) => ({
    campaign_id: campaign.id,
    workspace_id: workspaceId,
    lead_id,
    next_run_at: new Date().toISOString(),
  }));
  // Chunk inserts to avoid payload limit
  for (let i = 0; i < enrollments.length; i += 500) {
    await admin.from("outreach_campaign_leads").insert(enrollments.slice(i, i + 500));
  }

  // Kick off first tick immediately
  processTick().catch((e) => console.error("first-tick", e));

  return json({ success: true, campaign });
}

async function processTick() {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const now = new Date().toISOString();

  // Pull due active enrollments — limit per cycle to keep things smooth
  const { data: due } = await admin
    .from("outreach_campaign_leads")
    .select("*, outreach_campaigns!inner(*)")
    .eq("status", "active")
    .lte("next_run_at", now)
    .limit(50);

  if (!due?.length) return json({ processed: 0 });

  let processed = 0;
  for (const enrollment of due) {
    const campaign = enrollment.outreach_campaigns;
    if (campaign.status !== "running") continue;

    const sequence = campaign.sequence as any[];
    const stepIdx = enrollment.current_step;

    // No more steps → mark completed
    if (stepIdx >= sequence.length) {
      await admin.from("outreach_campaign_leads").update({
        status: "completed",
      }).eq("id", enrollment.id);
      await admin.rpc("increment", {}).then(() => {}).catch(() => {});
      await admin.from("outreach_campaigns").update({
        completed_count: (campaign.completed_count || 0) + 1,
      }).eq("id", campaign.id);
      continue;
    }

    const step = sequence[stepIdx];
    const channel = step.channel;

    // Voice/voicemail call cap check
    if (channel === "voice" || channel === "voicemail") {
      const { count: usedCalls } = await admin
        .from("outreach_step_logs")
        .select("*", { count: "exact", head: true })
        .eq("campaign_id", campaign.id)
        .in("channel", ["voice", "voicemail"]);
      if ((usedCalls || 0) >= (campaign.max_calls || 50)) {
        // skip this step, advance
        await admin.from("outreach_campaign_leads").update({
          current_step: stepIdx + 1,
          next_run_at: new Date(Date.now() + (step.delay_hours || 1) * 3600000).toISOString(),
        }).eq("id", enrollment.id);
        continue;
      }
    }

    // Dispatch to channel function
    let endpoint = "";
    if (channel === "sms") endpoint = "bulk-sms-send";
    else if (channel === "email") endpoint = "bulk-ai-outreach";
    else if (channel === "voice") endpoint = "bulk-voice-call";
    else if (channel === "voicemail") endpoint = "bulk-voicemail-drop";
    else {
      // unknown channel — skip
      await admin.from("outreach_campaign_leads").update({
        current_step: stepIdx + 1,
      }).eq("id", enrollment.id);
      continue;
    }

    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/${endpoint}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "campaign_step",
          campaign_id: campaign.id,
          campaign_lead_id: enrollment.id,
          lead_id: enrollment.lead_id,
          workspace_id: enrollment.workspace_id,
          step_index: stepIdx,
          step,
          objective: campaign.objective,
          booking_mode: campaign.booking_mode,
        }),
      });
      const result = await resp.json().catch(() => ({}));

      // Log result
      await admin.from("outreach_step_logs").insert({
        campaign_id: campaign.id,
        campaign_lead_id: enrollment.id,
        lead_id: enrollment.lead_id,
        workspace_id: enrollment.workspace_id,
        step_index: stepIdx,
        channel,
        status: result.success ? "success" : "failed",
        external_id: result.external_id || null,
        error: result.error || null,
        metadata: result.metadata || {},
      });

      // Advance enrollment
      const counterField = {
        sms: "sms_sent",
        email: "emails_sent",
        voice: "calls_made",
        voicemail: "voicemails_dropped",
      }[channel as string];

      const nextDelay = (sequence[stepIdx + 1]?.delay_hours ?? 0) * 3600000;
      const updates: any = {
        current_step: stepIdx + 1,
        last_channel: channel,
        last_outcome: result.success ? "success" : "failed",
        next_run_at: new Date(Date.now() + nextDelay).toISOString(),
      };
      if (counterField) updates[counterField] = (enrollment[counterField] || 0) + 1;
      if (stepIdx + 1 >= sequence.length) updates.status = "completed";

      await admin.from("outreach_campaign_leads").update(updates).eq("id", enrollment.id);
      processed++;
    } catch (e) {
      console.error("step dispatch failed", e);
      await admin.from("outreach_step_logs").insert({
        campaign_id: campaign.id,
        campaign_lead_id: enrollment.id,
        lead_id: enrollment.lead_id,
        workspace_id: enrollment.workspace_id,
        step_index: stepIdx,
        channel,
        status: "failed",
        error: e instanceof Error ? e.message : "dispatch error",
      });
      // Don't retry indefinitely — advance
      await admin.from("outreach_campaign_leads").update({
        current_step: stepIdx + 1,
        next_run_at: new Date(Date.now() + 3600000).toISOString(),
      }).eq("id", enrollment.id);
    }
  }

  return json({ processed });
}
