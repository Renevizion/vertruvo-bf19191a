import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify user
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader! } } }
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { workspaceId, businessName, businessCategory } = await req.json();
    if (!workspaceId) throw new Error("workspaceId required");

    // Check if already seeded
    const { data: existing } = await supabase
      .from("workflows")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("name", "New Lead Auto Follow-up")
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ success: true, alreadySeeded: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const biz = businessName || "Your Business";
    const cat = businessCategory || "Professional Services";

    // 1. Create default workflow: "New Lead Auto Follow-up"
    await supabase.from("workflows").insert({
      workspace_id: workspaceId,
      name: "New Lead Auto Follow-up",
      description: "Automatically sends a follow-up when a new lead enters your pipeline. Pre-configured by Kiruvo.",
      status: "active",
      trigger_type: "lead_created",
      trigger_config: {},
      nodes: JSON.stringify([
        {
          id: "trigger-1",
          type: "trigger",
          position: { x: 250, y: 50 },
          data: { label: "New Lead Created", triggerType: "lead_created" },
        },
        {
          id: "action-1",
          type: "action",
          position: { x: 250, y: 200 },
          data: {
            label: "Create Follow-up Task",
            actionType: "create_task",
            config: {
              title: "Follow up with {{lead_name}}",
              description: "New lead entered the pipeline. Reach out within 5 minutes for best conversion.",
              priority: "high",
            },
          },
        },
      ]),
      edges: JSON.stringify([
        { id: "e1", source: "trigger-1", target: "action-1" },
      ]),
    });

    // 2. Create default AI Lead Responder agent
    const agentInstructions = `You are a professional, friendly AI assistant for ${biz} (${cat}). Your role is to:

1. Respond to new lead inquiries instantly and professionally
2. Ask qualifying questions to understand their needs
3. Collect their name, email, phone if not already provided
4. Suggest booking a consultation or appointment
5. Answer common questions about the business

Always be warm, helpful, and guide the conversation toward booking a meeting or call. Never make up information about specific pricing or services you don't know about — instead, offer to connect them with the team.`;

    await supabase.from("ai_agents").insert({
      workspace_id: workspaceId,
      name: "Lead Responder",
      type: "conversation",
      status: "active",
      description: "Responds to new leads instantly, qualifies them, and books meetings — even at 2 AM.",
      instructions: agentInstructions,
      greeting: `Hi there! 👋 Thanks for reaching out to ${biz}. I'm here to help you get started. What can I assist you with today?`,
    });

    console.log(`[seed-workspace] Seeded workspace ${workspaceId} for ${biz}`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[seed-workspace] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
