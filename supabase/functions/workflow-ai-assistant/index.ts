import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { checkUsageGate, usageLimitResponse, getWorkspaceForUser } from "../_shared/usage-gate.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_CONTEXT = `You are a concise workflow automation assistant for a CRM system. Be direct, specific, and token-efficient.

RESPONSE STYLE:
- Be concise and sophisticated - eliminate filler words and repetitive explanations
- Get straight to actionable recommendations based on workspace data
- Skip lengthy preambles and "Why this is useful" sections
- Provide specific details (actual form names, pipeline stages) from workspace context
- When suggesting workflows, present them directly with brief context

CRM CAPABILITIES:
TRIGGERS: Lead Created, Form Submitted, Contact Created, Task Created, Time Schedule
ACTIONS: Send Email/SMS, Update Lead, Create Task/Lead/Contact, Add to Google Sheets, Assign to Pipeline, Send Notification
CONDITIONS: Lead Value/Stage checks, Form Field matching, Has Email/Phone, Time of Day

INTEGRATION REQUIREMENTS:
- Google Sheets: requires active integration
- Email: requires email service config
- SMS: requires Twilio setup
- Lead/Contact/Task actions: work out of the box

YOUR APPROACH:
1. Analyze workspace data (forms, pipelines, integrations, lead patterns)
2. Suggest specific workflows using ACTUAL workspace data (real form names, pipeline stages)
3. Provide workflow JSON structure directly when requested
4. For validation: focus on missing configs and critical issues only
5. Skip generic explanations - users understand basic workflow concepts

Be direct, specific, and actionable. Use real workspace data to ground recommendations.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // AUTH: Verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const authClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    console.log(`[Workflow AI] Authenticated user: ${claimsData.claims.sub}`);

    // USAGE GATE: Check AI query limits
    const userId = claimsData.claims.sub as string;
    const wsId = await getWorkspaceForUser(userId);
    if (wsId) {
      const usageCheck = await checkUsageGate(wsId, 'ai_queries', userId);
      if (!usageCheck.allowed) {
        return usageLimitResponse(corsHeaders, usageCheck);
      }
    }

    const { message, conversationHistory, currentWorkflow, contextualHelp, validateMode, workspaceContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build workspace context string
    let workspaceContextStr = "";
    if (workspaceContext) {
      workspaceContextStr = `
WORKSPACE CONTEXT (Use this real data to provide specific, actionable suggestions):

Business Type: ${workspaceContext.businessType}
Business Name: ${workspaceContext.businessName}

Active Forms: ${workspaceContext.forms?.length || 0}
${workspaceContext.forms?.length > 0 ? workspaceContext.forms.map((f: any) => `  - ${f.name} (ID: ${f.id})`).join('\n') : '  - No active forms configured'}

Pipelines: ${workspaceContext.pipelines?.length || 0}
${workspaceContext.pipelines?.length > 0 ? workspaceContext.pipelines.map((p: any) => 
  `  - ${p.name}: ${p.pipeline_stages?.map((s: any) => s.name).join(' → ') || 'No stages'}`
).join('\n') : '  - No pipelines configured'}

Lead Statistics:
  - Total Leads: ${workspaceContext.leadCount || 0}
  - Lead Sources: ${workspaceContext.leadSources?.join(', ') || 'None'}
  - Average Lead Score: ${workspaceContext.avgLeadScore || 0}

Contact Count: ${workspaceContext.contactCount || 0}

Configured Integrations:
  - Google Sheets: ${workspaceContext.integrations?.googleSheets ? 'Active' : 'Not configured'}
  - Email: ${workspaceContext.integrations?.email ? 'Active' : 'Not configured'}
  - SMS: ${workspaceContext.integrations?.sms ? 'Active' : 'Not configured'}

CRITICAL: When suggesting workflows, use ACTUAL form names, pipeline names, and stage names from above. Do NOT suggest hypothetical "Website Contact Form" if it doesn't exist - use the real form names shown above. Be specific and actionable based on THIS workspace's actual data.
`;
    }

    // Add current workflow context if available
    let contextMessage = message;
    if (contextualHelp) {
      contextMessage = `CONTEXTUAL HELP REQUEST:
The user clicked on a ${contextualHelp.nodeType} node labeled "${contextualHelp.nodeLabel}".

Please explain:
1. What this ${contextualHelp.nodeType} does
2. How to configure it properly
3. Common use cases
4. Best practices

USER QUESTION: ${message}`;
    } else if (validateMode && currentWorkflow) {
      contextMessage = `WORKFLOW VALIDATION REQUEST:
Analyze this workflow for issues and improvements:

Name: ${currentWorkflow.name}
Nodes: ${currentWorkflow.nodes?.length || 0} nodes
Active: ${currentWorkflow.is_active ? 'Yes' : 'No'}

Workflow structure:
${JSON.stringify(currentWorkflow.nodes, null, 2)}

Connections:
${JSON.stringify(currentWorkflow.edges, null, 2)}

Please check for:
1. Missing required configurations
2. Logic errors or invalid connections
3. Best practice violations
4. Potential runtime issues
5. Optimization suggestions

Provide specific, actionable feedback.

USER REQUEST: ${message}`;
    } else if (currentWorkflow) {
      contextMessage = `CURRENT WORKFLOW CONTEXT:
Name: ${currentWorkflow.name}
Nodes: ${currentWorkflow.nodes?.length || 0} nodes
Active: ${currentWorkflow.is_active ? 'Yes' : 'No'}

USER REQUEST: ${message}`;
    }

    // Build conversation messages
    const messages = [
      { role: "system", content: SYSTEM_CONTEXT + workspaceContextStr + `

WORKFLOW SUGGESTION FORMAT:
When creating workflows, respond with:
1. One brief sentence about the workflow
2. The JSON structure immediately

Format:
WORKFLOW_SUGGESTION_START
{
  "name": "Workflow Name",
  "description": "Brief description",
  "trigger_type": "form_submitted|lead_created|contact_created|task_created|time_schedule",
  "nodes": [...],
  "edges": [...]
}
WORKFLOW_SUGGESTION_END

Skip lengthy explanations before/after the JSON. Be direct.` },
      ...(conversationHistory || []).map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: "user", content: contextMessage }
    ];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: messages,
        temperature: 0.7,
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.', response: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted.', response: 'AI credits depleted. Please add credits to continue.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Parse workflow suggestion if present
    let workflowSuggestion = null;
    const workflowMatch = aiResponse.match(/WORKFLOW_SUGGESTION_START\s*([\s\S]*?)\s*WORKFLOW_SUGGESTION_END/);
    if (workflowMatch) {
      try {
        workflowSuggestion = JSON.parse(workflowMatch[1].trim());
        // Remove the structured data from the visible response
        const cleanResponse = aiResponse
          .replace(/WORKFLOW_SUGGESTION_START[\s\S]*?WORKFLOW_SUGGESTION_END/g, '')
          .trim();
        
        return new Response(
          JSON.stringify({ 
            response: cleanResponse || "I've created a workflow for you. Click 'Apply to Canvas' below to add it!",
            workflowSuggestion
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      } catch (parseError) {
        console.error('Failed to parse workflow suggestion:', parseError);
      }
    }

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        workflowSuggestion: null
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in workflow-ai-assistant:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        response: "I'm having trouble processing that request. Please try again."
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
