import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const VOICE_TOOLS = [
  {
    type: "client",
    name: "get_new_leads",
    description: "Get recent leads that came in. Returns lead name, email, phone, company, source, value.",
    parameters: {
      type: "object",
      properties: {
        since_hours: { type: "number", description: "How many hours back to look. Default 24." },
        limit: { type: "number", description: "Max leads to return. Default 10." }
      }
    },
    expects_response: true
  },
  {
    type: "client",
    name: "get_today_schedule",
    description: "Get today's bookings, appointments and schedule.",
    parameters: { type: "object", properties: {} },
    expects_response: true
  },
  {
    type: "client",
    name: "get_tasks",
    description: "Get pending tasks, optionally filtered by status.",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string", description: "Filter: pending, in_progress, completed" },
        limit: { type: "number", description: "Max tasks. Default 10." }
      }
    },
    expects_response: true
  },
  {
    type: "client",
    name: "send_offer_to_leads",
    description: "Send a promotional offer email to specific leads using an active promotion. ALWAYS call get_active_promotions first.",
    parameters: {
      type: "object",
      properties: {
        lead_ids: { type: "array", items: { type: "string", description: "A lead ID" }, description: "Lead IDs to send offer to." },
        promotion_id: { type: "string", description: "The ID of the active promotion to send." },
        subject: { type: "string", description: "Optional custom email subject." }
      },
      required: ["lead_ids", "promotion_id"]
    },
    expects_response: true
  },
  {
    type: "client",
    name: "get_lead_details",
    description: "Search leads by name or email.",
    parameters: {
      type: "object",
      properties: {
        search: { type: "string", description: "Name or email to search." }
      },
      required: ["search"]
    },
    expects_response: true
  },
  {
    type: "client",
    name: "get_open_slots",
    description: "Get available open time slots in the schedule.",
    parameters: {
      type: "object",
      properties: {
        days_ahead: { type: "number", description: "Days ahead to check. Default 3." }
      }
    },
    expects_response: true
  },
  {
    type: "client",
    name: "get_active_promotions",
    description: "Get the business's currently active promotions and offers. ALWAYS call this before sending offers to leads.",
    parameters: { type: "object", properties: {} },
    expects_response: true
  },
  {
    type: "client",
    name: "create_task",
    description: "Create a new task or reminder.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Task title." },
        description: { type: "string", description: "Task description." },
        priority: { type: "string", enum: ["low", "medium", "high"], description: "Priority." }
      },
      required: ["title"]
    },
    expects_response: true
  },
  {
    type: "client",
    name: "get_products_services",
    description: "Get the business's products and services with prices.",
    parameters: { type: "object", properties: {} },
    expects_response: true
  },
  // === NEW TOOLS ===
  {
    type: "client",
    name: "add_note_to_lead",
    description: "Add a voice note to a lead's file. Search by name/email or use lead_id directly.",
    parameters: {
      type: "object",
      properties: {
        search: { type: "string", description: "Lead name or email to search for." },
        lead_id: { type: "string", description: "Direct lead ID if known." },
        note: { type: "string", description: "The note content to add." }
      },
      required: ["note"]
    },
    expects_response: true
  },
  {
    type: "client",
    name: "trigger_workflow",
    description: "Trigger/kick off an automation workflow by name. Use list_workflows first to see available workflows.",
    parameters: {
      type: "object",
      properties: {
        workflow_name: { type: "string", description: "Name or partial name of the workflow to trigger." },
        workflow_id: { type: "string", description: "Direct workflow ID if known." }
      }
    },
    expects_response: true
  },
  {
    type: "client",
    name: "list_workflows",
    description: "List all active automation workflows available to trigger.",
    parameters: { type: "object", properties: {} },
    expects_response: true
  },
  {
    type: "client",
    name: "drop_voicemail",
    description: "Drop a pre-recorded voicemail message to a lead who didn't answer. Requires voicemail drops to be configured.",
    parameters: {
      type: "object",
      properties: {
        search: { type: "string", description: "Lead name or email to search." },
        lead_id: { type: "string", description: "Direct lead ID." },
        voicemail_id: { type: "string", description: "Specific voicemail drop to use. If omitted, uses the first active one." }
      }
    },
    expects_response: true
  },
];

function buildSystemPrompt(businessName: string, language: string): string {
  const langInstruction = language !== "en" 
    ? `\n\nIMPORTANT: The user prefers to communicate in language code "${language}". Respond in that language naturally. Understand commands in that language as well.`
    : "";

  return `You are Kiruvo, the AI voice assistant for ${businessName}. You help the business owner manage their day completely hands-free.

You have tools to query real workspace data (leads, schedule, tasks, bookings) and take actions (send promotional offers, create tasks, add notes to leads, trigger automations, drop voicemails).

CRITICAL RULE FOR OFFERS:
- You can ONLY offer promotions that the business owner has created. NEVER make up discounts or offers.
- When the user asks to send offers, ALWAYS call get_active_promotions first to see what's available.
- If there are no active promotions, tell the user "You don't have any active promotions set up. You can create them in Settings > Promotions."
- Present the available promotions to the user and let them choose which one to send.
- Use the promotion_id when calling send_offer_to_leads.
- ALWAYS look up actual products/services first. Include actual service/product names and real prices with discounts calculated from the real price.

VOICE NOTES:
- When the user says "add a note to [name]'s file" or similar, use add_note_to_lead.
- Confirm the note was added and read it back briefly.

WORKFLOW AUTOMATION:
- When the user says "run/trigger/kick off [workflow name]" or "follow up with new leads", use trigger_workflow.
- First call list_workflows to find matching workflows if unsure.
- Confirm the workflow was triggered.

VOICEMAIL DROPS:
- When the user asks to "drop a voicemail" or "leave a message" for a lead, use drop_voicemail.
- If no voicemail drops are configured, tell them to set one up in Settings.

Key behaviors:
- Be conversational and concise — keep responses short (2-3 sentences max unless listing data)
- When listing leads or appointments, summarize briefly
- Use the business name "${businessName}" naturally
- Be proactive: suggest actions based on data
- For schedule queries, mention times naturally ("You have a meeting at 2 PM with John")
- When the user says "bye", "goodbye", "see you", "that's all", "I'm done", or similar farewell phrases, respond with a brief goodbye and then END the conversation immediately.

Remember: Your responses will be spoken aloud. Keep them concise, natural, and action-oriented.${langInstruction}`;
}

async function createElevenLabsAgent(apiKey: string, businessName: string, language: string): Promise<string> {
  const systemPrompt = buildSystemPrompt(businessName, language);

  const resp = await fetch("https://api.elevenlabs.io/v1/convai/agents/create", {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `Kiruvo - ${businessName}`,
      conversation_config: {
        agent: {
          prompt: {
            prompt: systemPrompt,
            tools: VOICE_TOOLS,
          },
          first_message: `Hey! I'm Kiruvo, your voice assistant for ${businessName}. What can I help you with?`,
          language: language || "en",
        },
        tts: {
          voice_id: "SAz9YHcvj6GT2YYXdXww",
        },
      },
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error("ElevenLabs agent creation failed:", resp.status, errText);
    throw new Error(`Failed to create ElevenLabs agent: ${resp.status}`);
  }

  const data = await resp.json();
  return data.agent_id;
}

async function getConversationToken(apiKey: string, agentId: string): Promise<string> {
  const resp = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
    {
      headers: { "xi-api-key": apiKey },
    }
  );

  if (!resp.ok) {
    const errText = await resp.text();
    console.error("Failed to get signed URL:", resp.status, errText);
    throw new Error(`Failed to get conversation token: ${resp.status}`);
  }

  const data = await resp.json();
  return data.signed_url;
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

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: "ElevenLabs not configured" }), {
        status: 500,
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
    if (claimsError || !claimsData?.claims) {
      // Fallback to getUser
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Invalid auth" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      var userId = user.id;
    } else {
      var userId = claimsData.claims.sub;
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

    // Check if user is platform admin (bypass usage limits)
    const { data: adminRole } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    const isAdmin = !!adminRole;

    // Check subscription tier (Enterprise required for non-admins)
    if (!isAdmin) {
      const { data: subscription } = await serviceClient
        .from("subscriptions")
        .select("status, plans!inner(name)")
        .eq("workspace_id", workspace.workspace_id)
        .maybeSingle();

      const planName = (subscription?.plans as any)?.name?.toLowerCase() || "";
      const isActive = subscription?.status === "active" || subscription?.status === "trialing";

      if (!isActive || !planName.includes("enterprise")) {
        return new Response(JSON.stringify({ error: "Voice Assistant requires an Enterprise subscription" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check monthly usage limit (50 sessions/month for Enterprise)
      const periodStart = new Date();
      periodStart.setDate(1);
      periodStart.setHours(0, 0, 0, 0);

      const { data: usage } = await serviceClient
        .from("workspace_feature_usage")
        .select("usage_count")
        .eq("workspace_id", workspace.workspace_id)
        .eq("feature_key", "voice_assistant_sessions")
        .gte("period_start", periodStart.toISOString())
        .maybeSingle();

      if (usage && usage.usage_count >= 50) {
        return new Response(JSON.stringify({ error: "Monthly voice session limit reached (50/month). Resets next month." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Increment usage
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await serviceClient.rpc("can_use_feature", {
        p_workspace_id: workspace.workspace_id,
        p_feature_key: "voice_assistant_sessions",
        p_increment_usage: true,
      });
    }

    const { data: bizSettings } = await serviceClient
      .from("business_settings")
      .select("id, business_name, elevenlabs_agent_id, voice_language")
      .eq("workspace_id", workspace.workspace_id)
      .single();

    const businessName = bizSettings?.business_name || "your business";
    const language = bizSettings?.voice_language || "en";
    let agentId = bizSettings?.elevenlabs_agent_id;

    if (!agentId) {
      console.log("[VOICE] Creating ElevenLabs agent for workspace:", workspace.workspace_id);
      agentId = await createElevenLabsAgent(ELEVENLABS_API_KEY, businessName, language);

      if (bizSettings?.id) {
        await serviceClient
          .from("business_settings")
          .update({ elevenlabs_agent_id: agentId })
          .eq("id", bizSettings.id);
      }
    }

    const signedUrl = await getConversationToken(ELEVENLABS_API_KEY, agentId);

    return new Response(
      JSON.stringify({
        signed_url: signedUrl,
        agent_id: agentId,
        workspace_id: workspace.workspace_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[VOICE] Session error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred creating the voice session" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
