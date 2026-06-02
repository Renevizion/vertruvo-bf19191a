import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    // Auth
    const authClient = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userId = claimsData.claims.sub as string;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Get user's workspace
    const { data: member } = await adminClient
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (!member) {
      return new Response(JSON.stringify({ error: 'No workspace found' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const workspaceId = member.workspace_id;
    const body = await req.json();
    const { mode } = body;

    if (mode === 'generate') {
      return await handleGenerate(adminClient, workspaceId, body, LOVABLE_API_KEY, corsHeaders);
    } else if (mode === 'send') {
      return await handleSend(adminClient, workspaceId, userId, body, corsHeaders);
    } else if (mode === 'campaign_step') {
      return await handleCampaignStep(adminClient, body, LOVABLE_API_KEY, corsHeaders);
    }

    return new Response(JSON.stringify({ error: 'Invalid mode' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error in bulk-ai-outreach:', error);
    return new Response(JSON.stringify({ error: 'An error occurred processing the outreach request' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function handleGenerate(
  adminClient: any,
  workspaceId: string,
  body: { leadIds: string[]; objective: string; stageName?: string },
  apiKey: string,
  corsHeaders: Record<string, string>
) {
  const { leadIds, objective, stageName } = body;

  // Fetch leads with their activities and notes
  const { data: leads } = await adminClient
    .from('leads')
    .select('id, name, email, phone, value, notes, source, company, created_at')
    .in('id', leadIds)
    .eq('workspace_id', workspaceId);

  if (!leads || leads.length === 0) {
    return new Response(JSON.stringify({ error: 'No leads found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Fetch activities for all leads
  const { data: activities } = await adminClient
    .from('activities')
    .select('lead_id, type, title, description, created_at')
    .in('lead_id', leadIds)
    .order('created_at', { ascending: false })
    .limit(10);

  // Fetch business settings for context
  const { data: bizSettings } = await adminClient
    .from('business_settings')
    .select('business_name, business_category')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  // Fetch available items/services for context
  const { data: items } = await adminClient
    .from('items')
    .select('title, description, price, item_type')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .limit(20);

  // Build per-lead context
  const leadContexts = leads.filter((l: any) => l.email).map((lead: any) => {
    const leadActivities = (activities || []).filter((a: any) => a.lead_id === lead.id);
    return {
      id: lead.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      value: lead.value,
      notes: lead.notes,
      source: lead.source,
      company: lead.company,
      created_at: lead.created_at,
      recent_activities: leadActivities.slice(0, 5).map((a: any) => ({
        type: a.type,
        title: a.title,
        description: a.description,
        date: a.created_at,
      })),
    };
  });

  const systemPrompt = `You are an outreach email assistant for ${bizSettings?.business_name || 'a business'}${bizSettings?.business_category ? ` (${bizSettings.business_category})` : ''}.

OBJECTIVE: ${objective}
${stageName ? `PIPELINE STAGE: These leads are currently in the "${stageName}" stage.` : ''}

AVAILABLE SERVICES/PRODUCTS (only reference these — never invent offerings):
${items?.length ? items.map((i: any) => `- ${i.title}: ${i.description || 'No description'} ($${i.price || 'N/A'})`).join('\n') : 'No services configured yet'}

RULES:
- Write a SHORT, personalized email for each lead
- Reference their specific notes, activities, and context — NOT generic templates
- Keep subject lines under 60 characters
- Keep body under 150 words — conversational, not corporate
- If notes mention specific interests, timing preferences, or past interactions, USE them
- ONLY offer services/products from the list above
- Sign off with the business name, not a personal name
- Do NOT include unsubscribe links — the system handles that

Respond with a JSON array:
[{"lead_id": "...", "lead_name": "...", "email": "...", "subject": "...", "body": "..."}]`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate tailored outreach emails for these ${leadContexts.length} leads:\n\n${JSON.stringify(leadContexts, null, 2)}` },
      ],
      temperature: 0.7,
      max_tokens: 3000,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('AI API error:', response.status, errText);
    if (response.status === 429) {
      return new Response(JSON.stringify({ error: 'Rate limited. Try again shortly.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: 'AI credits exhausted.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  let content = data.choices[0].message.content;

  // Extract JSON from markdown code blocks if present
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) content = jsonMatch[1].trim();

  // Also try stripping any leading/trailing non-JSON characters
  content = content.replace(/^[^[{]*/, '').replace(/[^}\]]*$/, '');

  let drafts;
  try {
    drafts = JSON.parse(content);
  } catch {
    console.error('Failed to parse AI response:', content);
    throw new Error('AI returned invalid format. Try again.');
  }

  return new Response(JSON.stringify({ drafts }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleSend(
  adminClient: any,
  workspaceId: string,
  userId: string,
  body: { email: { to: string; subject: string; body: string; leadId: string }; objective: string; stageName?: string },
  corsHeaders: Record<string, string>
) {
  const { email, objective, stageName } = body;
  const batchId = crypto.randomUUID();

  // Send via transactional email system — we'll use a simple workflow email for now
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const serviceClient = createClient(supabaseUrl, serviceKey);

  // Use the workflow email sender which supports arbitrary HTML
  const { error: sendError } = await serviceClient.functions.invoke('send-workflow-email', {
    body: {
      to: email.to,
      subject: email.subject,
      body: email.body,
      workspace_id: workspaceId,
    },
  });

  if (sendError) {
    console.error('Email send error:', sendError);
    throw new Error('Failed to send email');
  }

  // Log activity on the lead
  await adminClient.from('activities').insert({
    lead_id: email.leadId,
    workspace_id: workspaceId,
    type: 'email',
    title: `AI Outreach: ${email.subject}`,
    description: `[AI Bulk Outreach — ${stageName || 'Selected'}]\nObjective: ${objective}\n\n${email.body}`,
    created_by: userId,
  });

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleCampaignStep(
  adminClient: any,
  body: any,
  apiKey: string,
  corsHeaders: Record<string, string>
) {
  const { lead_id, workspace_id, objective } = body;
  try {
    const { data: lead } = await adminClient
      .from('leads')
      .select('id, name, email, notes, source')
      .eq('id', lead_id).single();
    if (!lead?.email) {
      return new Response(JSON.stringify({ success: false, error: 'No email on lead' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: biz } = await adminClient.from('business_settings').select('business_name').eq('workspace_id', workspace_id).maybeSingle();

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: `Write ONE personalized outreach email for ${biz?.business_name || 'a business'}. Objective: ${objective}. Return JSON: {"subject":"...","body":"..."}. Body under 150 words. Sign as ${biz?.business_name || 'Us'}.` },
          { role: 'user', content: `Lead: ${lead.name}\nNotes: ${lead.notes || 'none'}\nSource: ${lead.source || 'unknown'}` },
        ],
        max_tokens: 600, temperature: 0.7,
      }),
    });
    if (!aiResp.ok) return new Response(JSON.stringify({ success: false, error: `AI failed (${aiResp.status})` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const aiData = await aiResp.json();
    let content = aiData.choices[0].message.content;
    const m = content.match(/\{[\s\S]*\}/);
    if (m) content = m[0];
    const parsed = JSON.parse(content);

    const { error: sendErr } = await adminClient.functions.invoke('send-workflow-email', {
      body: { to: lead.email, subject: parsed.subject, body: parsed.body, workspace_id },
    });
    if (sendErr) return new Response(JSON.stringify({ success: false, error: 'Email send failed' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    await adminClient.from('activities').insert({
      lead_id, workspace_id, type: 'email',
      title: `AI Campaign: ${parsed.subject}`,
      description: parsed.body,
    });

    return new Response(JSON.stringify({ success: true, metadata: { subject: parsed.subject } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : 'error' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}
