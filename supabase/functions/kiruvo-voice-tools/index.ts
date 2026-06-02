import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function executeTool(toolName: string, args: any, client: any, workspaceId: string) {
  switch (toolName) {
    case "get_new_leads": {
      const hours = args.since_hours || 24;
      const limit = args.limit || 10;
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      const { data, error } = await client
        .from("leads")
        .select("id, name, email, phone, company, source, value, created_at, stage_id")
        .eq("workspace_id", workspaceId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) return { error: error.message };
      return { leads: data, count: data?.length || 0, period: `last ${hours} hours` };
    }

    case "get_today_schedule": {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      const { data, error } = await client
        .from("bookings")
        .select("id, title, start_time, end_time, status, notes, lead_id")
        .eq("workspace_id", workspaceId)
        .gte("start_time", todayStart.toISOString())
        .lte("start_time", todayEnd.toISOString())
        .order("start_time", { ascending: true });
      if (error) return { error: error.message };
      return { bookings: data, count: data?.length || 0 };
    }

    case "get_tasks": {
      let query = client
        .from("tasks")
        .select("id, title, description, status, priority, due_date, created_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(args.limit || 10);
      if (args.status) query = query.eq("status", args.status);
      const { data, error } = await query;
      if (error) return { error: error.message };
      return { tasks: data, count: data?.length || 0 };
    }

    case "send_offer_to_leads": {
      if (!args.promotion_id) {
        return { error: "promotion_id is required. Use get_active_promotions first to find available offers." };
      }
      
      const { data: promo } = await client
        .from("promotions")
        .select("*")
        .eq("id", args.promotion_id)
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .single();
      
      if (!promo) return { error: "Promotion not found or inactive" };
      
      if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
        return { error: "This promotion has expired" };
      }
      
      if (promo.max_uses && promo.current_uses >= promo.max_uses) {
        return { error: "This promotion has reached its max uses" };
      }

      let itemNames = "all services";
      if (!promo.applies_to_all_items && promo.item_ids?.length) {
        const { data: promoItems } = await client
          .from("items")
          .select("title, price")
          .in("id", promo.item_ids);
        itemNames = promoItems?.map((i: any) => `${i.title} ($${i.price})`).join(", ") || "selected services";
      }

      let discountText = "";
      switch (promo.discount_type) {
        case "percentage": discountText = `${promo.discount_value}% off`; break;
        case "fixed_amount": discountText = `$${promo.discount_value} off`; break;
        case "bogo": discountText = "Buy One Get One Free"; break;
        default: discountText = promo.description || "a special offer";
      }

      const { data: bizSettings } = await client
        .from("business_settings")
        .select("business_name")
        .eq("workspace_id", workspaceId)
        .single();
      const bizName = bizSettings?.business_name || "us";

      const results = [];
      for (const leadId of args.lead_ids) {
        const { data: lead } = await client
          .from("leads")
          .select("name, email")
          .eq("id", leadId)
          .single();
        if (!lead?.email) {
          results.push({ leadId, status: "skipped", reason: "no email" });
          continue;
        }
        const expiryLine = promo.expires_at
          ? `<p><em>Offer valid until ${new Date(promo.expires_at).toLocaleDateString()}.</em></p>`
          : "";
        const termsLine = promo.terms ? `<p style="font-size:12px;color:#666;">${promo.terms}</p>` : "";
        const promoCodeLine = promo.promo_code ? `<p>Use code: <strong>${promo.promo_code}</strong></p>` : "";
        
        const html = `
          <p>Hi ${lead.name || "there"},</p>
          <p>We have a special offer for you from ${bizName}!</p>
          <p><strong>${promo.name}: ${discountText}</strong> on ${itemNames}.</p>
          ${promoCodeLine}
          ${promo.description ? `<p>${promo.description}</p>` : ""}
          ${expiryLine}
          ${termsLine}
          <p>Reply to this email or call us to take advantage of this offer!</p>
        `;

        try {
          const emailResp = await fetch(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                to: lead.email,
                subject: args.subject || `Special Offer: ${promo.name}`,
                html,
              }),
            }
          );
          if (emailResp.ok) {
            await client
              .from("promotions")
              .update({ current_uses: (promo.current_uses || 0) + 1 })
              .eq("id", promo.id);
          }
          results.push({ leadId, name: lead.name, email: lead.email, status: emailResp.ok ? "sent" : "failed" });
        } catch (e) {
          results.push({ leadId, name: lead.name, status: "error", error: (e as Error).message });
        }
      }
      return { results, total_sent: results.filter((r) => r.status === "sent").length, promotion_used: promo.name };
    }

    case "get_lead_details": {
      const { data, error } = await client
        .from("leads")
        .select("id, name, email, phone, company, source, value, created_at, notes, score")
        .eq("workspace_id", workspaceId)
        .or(`name.ilike.%${args.search}%,email.ilike.%${args.search}%`)
        .limit(5);
      if (error) return { error: error.message };
      return { leads: data };
    }

    case "get_open_slots": {
      const daysAhead = args.days_ahead || 3;
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + daysAhead);
      const { data: bookings } = await client
        .from("bookings")
        .select("start_time, end_time, title")
        .eq("workspace_id", workspaceId)
        .gte("start_time", start.toISOString())
        .lte("start_time", end.toISOString())
        .order("start_time", { ascending: true });
      return {
        booked_slots: bookings || [],
        period: `next ${daysAhead} days`,
        note: "These are booked times. Open slots are times not listed here during business hours.",
      };
    }

    case "get_active_promotions": {
      const { data, error } = await client
        .from("promotions")
        .select("id, name, description, discount_type, discount_value, promo_code, item_ids, applies_to_all_items, expires_at, max_uses, current_uses, terms")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) return { error: error.message };
      
      const active = (data || []).filter((p: any) => {
        if (p.expires_at && new Date(p.expires_at) < new Date()) return false;
        if (p.max_uses && p.current_uses >= p.max_uses) return false;
        return true;
      });

      const allItemIds = active.flatMap((p: any) => p.item_ids || []);
      let itemMap: Record<string, string> = {};
      if (allItemIds.length) {
        const { data: items } = await client
          .from("items")
          .select("id, title, price")
          .in("id", allItemIds);
        itemMap = Object.fromEntries((items || []).map((i: any) => [i.id, `${i.title} ($${i.price})`]));
      }

      const enriched = active.map((p: any) => ({
        ...p,
        applicable_items: p.applies_to_all_items 
          ? "All products/services" 
          : (p.item_ids || []).map((id: string) => itemMap[id] || id).join(", "),
        discount_display: p.discount_type === "percentage" ? `${p.discount_value}% off` 
          : p.discount_type === "fixed_amount" ? `$${p.discount_value} off`
          : p.discount_type === "bogo" ? "Buy One Get One Free"
          : p.description || "Custom offer",
      }));

      return { promotions: enriched, count: enriched.length };
    }

    case "create_task": {
      const { data, error } = await client
        .from("tasks")
        .insert({
          workspace_id: workspaceId,
          title: args.title,
          description: args.description || null,
          priority: args.priority || "medium",
          status: "pending",
        })
        .select()
        .single();
      if (error) return { error: error.message };
      return { created: true, task: data };
    }

    case "get_products_services": {
      const { data, error } = await client
        .from("items")
        .select("id, title, description, price, item_type")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("title");
      if (error) return { error: error.message };
      return { items: data, count: data?.length || 0 };
    }

    // === NEW TOOLS ===

    case "add_note_to_lead": {
      if (!args.search && !args.lead_id) {
        return { error: "Provide either search (name/email) or lead_id" };
      }
      
      let leadId = args.lead_id;
      let leadName = "";
      
      if (!leadId && args.search) {
        const { data: leads } = await client
          .from("leads")
          .select("id, name")
          .eq("workspace_id", workspaceId)
          .or(`name.ilike.%${args.search}%,email.ilike.%${args.search}%`)
          .limit(1);
        if (!leads?.length) return { error: `No lead found matching "${args.search}"` };
        leadId = leads[0].id;
        leadName = leads[0].name;
      }

      // Get existing notes
      const { data: lead } = await client
        .from("leads")
        .select("notes, name")
        .eq("id", leadId)
        .single();
      
      if (!lead) return { error: "Lead not found" };
      leadName = lead.name;
      
      const timestamp = new Date().toLocaleString();
      const existingNotes = lead.notes || "";
      const newNotes = existingNotes 
        ? `${existingNotes}\n\n[Voice Note - ${timestamp}]\n${args.note}`
        : `[Voice Note - ${timestamp}]\n${args.note}`;
      
      const { error } = await client
        .from("leads")
        .update({ notes: newNotes })
        .eq("id", leadId);
      
      if (error) return { error: error.message };
      return { success: true, lead_name: leadName, note_added: args.note };
    }

    case "trigger_workflow": {
      if (!args.workflow_name && !args.workflow_id) {
        return { error: "Provide either workflow_name or workflow_id" };
      }
      
      let workflowId = args.workflow_id;
      let workflowName = "";
      
      if (!workflowId && args.workflow_name) {
        const { data: workflows } = await client
          .from("workflows")
          .select("id, name")
          .eq("workspace_id", workspaceId)
          .ilike("name", `%${args.workflow_name}%`)
          .eq("is_active", true)
          .limit(1);
        if (!workflows?.length) return { error: `No active workflow found matching "${args.workflow_name}"` };
        workflowId = workflows[0].id;
        workflowName = workflows[0].name;
      }

      // Trigger the workflow via the workflow-trigger edge function
      try {
        const triggerResp = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/workflow-trigger`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              workflow_id: workflowId,
              trigger_type: "voice_command",
              trigger_data: { source: "kiruvo_voice", command: args.workflow_name || "" },
            }),
          }
        );
        const result = await triggerResp.json();
        return { triggered: true, workflow_name: workflowName || workflowId, result };
      } catch (e) {
        return { error: `Failed to trigger workflow: ${(e as Error).message}` };
      }
    }

    case "list_workflows": {
      const { data, error } = await client
        .from("workflows")
        .select("id, name, description, is_active, trigger_type")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("name");
      if (error) return { error: error.message };
      return { workflows: data, count: data?.length || 0 };
    }

    case "drop_voicemail": {
      if (!args.lead_id && !args.search) {
        return { error: "Provide either lead_id or search (name/email)" };
      }
      
      let leadId = args.lead_id;
      let leadPhone = "";
      let leadName = "";
      
      if (!leadId && args.search) {
        const { data: leads } = await client
          .from("leads")
          .select("id, name, phone")
          .eq("workspace_id", workspaceId)
          .or(`name.ilike.%${args.search}%,email.ilike.%${args.search}%`)
          .limit(1);
        if (!leads?.length) return { error: `No lead found matching "${args.search}"` };
        leadId = leads[0].id;
        leadPhone = leads[0].phone;
        leadName = leads[0].name;
      } else {
        const { data: lead } = await client
          .from("leads")
          .select("name, phone")
          .eq("id", leadId)
          .single();
        if (!lead) return { error: "Lead not found" };
        leadPhone = lead.phone;
        leadName = lead.name;
      }

      if (!leadPhone) return { error: `${leadName} doesn't have a phone number on file` };

      // Get the voicemail drop to use
      let voicemailId = args.voicemail_id;
      if (!voicemailId) {
        // Get first active voicemail drop
        const { data: vms } = await client
          .from("voicemail_drops")
          .select("id, name")
          .eq("workspace_id", workspaceId)
          .eq("is_active", true)
          .limit(1);
        if (!vms?.length) return { error: "No voicemail drops configured. Create one in Settings first." };
        voicemailId = vms[0].id;
      }

      const { data: vm } = await client
        .from("voicemail_drops")
        .select("*")
        .eq("id", voicemailId)
        .single();
      
      if (!vm) return { error: "Voicemail drop not found" };

      // Make call via Twilio with voicemail TwiML
      try {
        const callResp = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/twilio-make-call`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              phoneNumber: leadPhone,
              workspaceId,
              leadId,
              voicemailDropId: voicemailId,
              voicemailText: vm.tts_text || vm.name,
              objectiveId: vm.objective_id || null,
              objectiveText: vm.objective_text || `Confirm whether ${leadName || 'the recipient'} responded to the voicemail drop.`,
              gatherKeypresses: true,
              gatherSpeech: true,
            }),
          }
        );
        const result = await callResp.json();
        return { success: result.success, lead_name: leadName, voicemail: vm.name, result };
      } catch (e) {
        return { error: `Failed to drop voicemail: ${(e as Error).message}` };
      }
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    let userId: string;
    if (claimsError || !claimsData?.claims) {
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Invalid auth" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = user.id;
    } else {
      userId = claimsData.claims.sub;
    }

    const { data: workspace } = await supabaseClient
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .limit(1)
      .single();

    if (!workspace) {
      return new Response(JSON.stringify({ error: "No workspace" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { tool_name, tool_args } = await req.json();
    const result = await executeTool(tool_name, tool_args || {}, serviceClient, workspace.workspace_id);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[VOICE-TOOLS] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
