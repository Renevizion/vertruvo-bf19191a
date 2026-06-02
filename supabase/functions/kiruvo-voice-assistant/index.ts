import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_new_leads",
      description: "Get recent leads that came in. Can filter by time period.",
      parameters: {
        type: "object",
        properties: {
          since_hours: { type: "number", description: "How many hours back to look. Default 24." },
          limit: { type: "number", description: "Max leads to return. Default 10." }
        },
        required: [],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_today_schedule",
      description: "Get today's bookings/appointments/schedule.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_tasks",
      description: "Get pending tasks, optionally filtered by priority or status.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter by status: pending, in_progress, completed" },
          limit: { type: "number", description: "Max tasks to return. Default 10." }
        },
        required: [],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_offer_to_leads",
      description: "Send a promotional offer email to specific leads. Use this when user wants to send deals, discounts, or offers to leads.",
      parameters: {
        type: "object",
        properties: {
          lead_ids: { type: "array", items: { type: "string" }, description: "Array of lead IDs to send the offer to." },
          offer_message: { type: "string", description: "The offer message/content to send." },
          subject: { type: "string", description: "Email subject line." }
        },
        required: ["lead_ids", "offer_message", "subject"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_lead_details",
      description: "Get detailed info about specific leads by name or ID.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Name or email to search for." }
        },
        required: ["search"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_open_slots",
      description: "Get available/open time slots in the schedule for today or upcoming days.",
      parameters: {
        type: "object",
        properties: {
          days_ahead: { type: "number", description: "How many days ahead to check. Default 3." }
        },
        required: [],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a new task or reminder.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Task title." },
          description: { type: "string", description: "Task description." },
          priority: { type: "string", enum: ["low", "medium", "high"], description: "Task priority." },
          due_date: { type: "string", description: "Due date in ISO format." }
        },
        required: ["title"],
        additionalProperties: false
      }
    }
  }
];

async function executeTool(toolName: string, args: any, supabaseClient: any, workspaceId: string) {
  switch (toolName) {
    case "get_new_leads": {
      const hours = args.since_hours || 24;
      const limit = args.limit || 10;
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabaseClient
        .from('leads')
        .select('id, name, email, phone, company, source, value, created_at, stage_id')
        .eq('workspace_id', workspaceId)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) return { error: error.message };
      return { leads: data, count: data?.length || 0, period: `last ${hours} hours` };
    }

    case "get_today_schedule": {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      
      const { data, error } = await supabaseClient
        .from('bookings')
        .select('id, title, start_time, end_time, status, notes, lead_id')
        .eq('workspace_id', workspaceId)
        .gte('start_time', todayStart.toISOString())
        .lte('start_time', todayEnd.toISOString())
        .order('start_time', { ascending: true });
      
      if (error) return { error: error.message };
      return { bookings: data, count: data?.length || 0 };
    }

    case "get_tasks": {
      let query = supabaseClient
        .from('tasks')
        .select('id, title, description, status, priority, due_date, created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(args.limit || 10);
      
      if (args.status) query = query.eq('status', args.status);
      
      const { data, error } = await query;
      if (error) return { error: error.message };
      return { tasks: data, count: data?.length || 0 };
    }

    case "send_offer_to_leads": {
      const results = [];
      for (const leadId of args.lead_ids) {
        const { data: lead } = await supabaseClient
          .from('leads')
          .select('name, email')
          .eq('id', leadId)
          .single();
        
        if (!lead?.email) {
          results.push({ leadId, status: 'skipped', reason: 'no email' });
          continue;
        }

        // Send via the send-email edge function
        try {
          const emailResp = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: lead.email,
                subject: args.subject,
                html: `<p>Hi ${lead.name || 'there'},</p><p>${args.offer_message}</p>`,
              })
            }
          );
          results.push({ leadId, name: lead.name, email: lead.email, status: emailResp.ok ? 'sent' : 'failed' });
        } catch (e) {
          results.push({ leadId, name: lead.name, status: 'error', error: (e as Error).message });
        }
      }
      return { results, total_sent: results.filter(r => r.status === 'sent').length };
    }

    case "get_lead_details": {
      const { data, error } = await supabaseClient
        .from('leads')
        .select('id, name, email, phone, company, source, value, created_at, notes, score')
        .eq('workspace_id', workspaceId)
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
      
      const { data: bookings } = await supabaseClient
        .from('bookings')
        .select('start_time, end_time, title')
        .eq('workspace_id', workspaceId)
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .order('start_time', { ascending: true });
      
      return { 
        booked_slots: bookings || [],
        period: `next ${daysAhead} days`,
        note: "These are the booked times. Open slots are any times not listed here during business hours."
      };
    }

    case "create_task": {
      const { data, error } = await supabaseClient
        .from('tasks')
        .insert({
          workspace_id: workspaceId,
          title: args.title,
          description: args.description || null,
          priority: args.priority || 'medium',
          due_date: args.due_date || null,
          status: 'pending',
        })
        .select()
        .single();
      
      if (error) return { error: error.message };
      return { created: true, task: data };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid auth' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get user's workspace
    const { data: workspace } = await supabaseClient
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!workspace) {
      return new Response(JSON.stringify({ error: 'No workspace found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const workspaceId = workspace.workspace_id;

    // Get business settings for personalization
    const { data: bizSettings } = await supabaseClient
      .from('business_settings')
      .select('business_name, business_category')
      .eq('workspace_id', workspaceId)
      .single();

    const businessName = bizSettings?.business_name || 'your business';

    const { messages, conversationHistory = [] } = await req.json();
    const userMessage = messages || conversationHistory;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const systemPrompt = `You are Kiruvo, the AI voice assistant for ${businessName}. You help the business owner manage their day hands-free.

You have access to tools to query real workspace data (leads, schedule, tasks, bookings) and take actions (send offers, create tasks).

Key behaviors:
- Be conversational and concise — this is VOICE, so keep responses short and natural (2-4 sentences max unless listing data)
- When listing leads or appointments, summarize key details briefly
- When the user asks to send offers, confirm the details before executing
- Use the business name "${businessName}" naturally in conversation
- Be proactive: suggest actions based on data (e.g., "You have 3 open slots today, want me to reach out to those new leads?")
- For schedule queries, mention times in a natural way ("You have a meeting at 2 PM with John")
- Current date/time: ${new Date().toISOString()}

Remember: Your responses will be spoken aloud. Keep them concise, natural, and action-oriented.`;

    let aiMessages = [
      { role: 'system', content: systemPrompt },
      ...userMessage
    ];

    // Use service role client for tool execution
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Loop for tool calling
    let maxIterations = 5;
    let finalResponse = '';

    while (maxIterations > 0) {
      maxIterations--;

      const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: aiMessages,
          tools: TOOLS,
          temperature: 0.7,
          max_tokens: 800,
        }),
      });

      if (!aiResp.ok) {
        const status = aiResp.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limited. Please try again in a moment.' }), {
            status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: 'AI credits exhausted.' }), {
            status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        throw new Error(`AI error: ${status}`);
      }

      const aiData = await aiResp.json();
      const choice = aiData.choices[0];

      if (choice.finish_reason === 'tool_calls' || choice.message.tool_calls) {
        // Execute tool calls
        aiMessages.push(choice.message);

        for (const toolCall of choice.message.tool_calls) {
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments);
          
          console.log(`[VOICE] Executing tool: ${toolName}`, toolArgs);
          const result = await executeTool(toolName, toolArgs, serviceClient, workspaceId);
          
          aiMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        }
        continue; // Let AI process tool results
      }

      // Final text response
      finalResponse = choice.message.content;
      break;
    }

    return new Response(JSON.stringify({ 
      response: finalResponse,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[VOICE] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'An error occurred with the voice assistant. Please try again.' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
