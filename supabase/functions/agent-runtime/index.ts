import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkUsageGate, usageLimitResponse } from "../_shared/usage-gate.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= EXTERNAL INTEGRATION EXECUTORS =============

async function executeTwilio(config: any, action: string, params: any): Promise<any> {
  const { account_sid, auth_token } = config;
  if (!account_sid || !auth_token) throw new Error('Twilio credentials not configured');

  const auth = btoa(`${account_sid}:${auth_token}`);
  
  if (action === 'send_sms') {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${account_sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: params.to, From: params.from, Body: params.message })
      }
    );
    if (!response.ok) throw new Error(`Twilio error: ${await response.text()}`);
    return await response.json();
  }
  
  if (action === 'make_call') {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${account_sid}/Calls.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ 
          To: params.to, 
          From: params.from, 
          Url: params.twiml_url || 'http://demo.twilio.com/docs/voice.xml'
        })
      }
    );
    if (!response.ok) throw new Error(`Twilio error: ${await response.text()}`);
    return await response.json();
  }
  
  throw new Error(`Unknown Twilio action: ${action}`);
}

async function executeSerpSearch(config: any, query: string): Promise<any> {
  const { api_key } = config;
  if (!api_key) throw new Error('Serp API key not configured');

  const url = new URL('https://serpapi.com/search');
  url.searchParams.set('q', query);
  url.searchParams.set('api_key', api_key);
  url.searchParams.set('engine', 'google');
  
  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`Serp API error: ${await response.text()}`);
  
  const data = await response.json();
  return {
    results: data.organic_results?.slice(0, 5) || [],
    knowledge_graph: data.knowledge_graph,
    answer_box: data.answer_box
  };
}

async function executeGoogleMaps(config: any, action: string, params: any): Promise<any> {
  const { api_key } = config;
  if (!api_key) throw new Error('Google Maps API key not configured');

  if (action === 'geocode') {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('address', params.address);
    url.searchParams.set('key', api_key);
    
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error('Google Maps API error');
    
    const data = await response.json();
    return data.results;
  }
  
  if (action === 'places_search') {
    const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
    url.searchParams.set('query', params.query);
    url.searchParams.set('key', api_key);
    
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error('Google Maps API error');
    
    const data = await response.json();
    return data.results?.slice(0, 5);
  }
  
  throw new Error(`Unknown Google Maps action: ${action}`);
}

async function executeCustomEndpoint(config: any, method: string, body?: any): Promise<any> {
  const { endpoint_url, auth_method, auth_value } = config;
  if (!endpoint_url) throw new Error('Custom endpoint URL not configured');

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  
  if (auth_method === 'api_key' && auth_value) headers['X-API-Key'] = auth_value;
  else if (auth_method === 'bearer_token' && auth_value) headers['Authorization'] = `Bearer ${auth_value}`;
  else if (auth_method === 'basic_auth' && auth_value) headers['Authorization'] = `Basic ${btoa(auth_value)}`;
  
  const response = await fetch(endpoint_url, {
    method: method || 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  
  if (!response.ok) throw new Error(`Custom endpoint error: ${await response.text()}`);
  return await response.json();
}

async function executeMCPServer(config: any, tool: string, params: any): Promise<any> {
  const { server_url, auth_token } = config;
  if (!server_url) throw new Error('MCP server URL not configured');

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth_token) headers['Authorization'] = `Bearer ${auth_token}`;
  
  const response = await fetch(`${server_url}/tools/${tool}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params)
  });
  
  if (!response.ok) throw new Error(`MCP server error: ${await response.text()}`);
  return await response.json();
}

// ============= INTERNAL TOOL EXECUTORS (CRM Operations) =============

async function executeSearchWeb(supabase: SupabaseClient, integrations: any, query: string): Promise<any> {
  // Try Serp API first if configured
  if (integrations['serp']?.api_key) {
    return await executeSerpSearch(integrations['serp'], query);
  }
  
  // Fallback: Use Lovable AI to generate a response about the topic
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  if (lovableApiKey) {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Provide a brief, factual summary based on your knowledge. Be concise.' },
          { role: 'user', content: `What do you know about: ${query}` }
        ],
        max_tokens: 300,
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      return { 
        source: 'ai_knowledge',
        summary: data.choices[0]?.message?.content || 'No information available'
      };
    }
  }
  
  return { error: 'No search integration configured. Add Serp API for web search.' };
}

async function executeSendMessage(
  supabase: SupabaseClient, 
  workspaceId: string, 
  params: { contact_id?: string; lead_id?: string; content: string; channel?: string }
): Promise<any> {
  // Create or find conversation
  let conversationId = null;
  
  if (params.contact_id || params.lead_id) {
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('workspace_id', workspaceId)
      .or(`contact_id.eq.${params.contact_id || 'null'},lead_id.eq.${params.lead_id || 'null'}`)
      .eq('status', 'open')
      .limit(1)
      .single();
    
    if (existingConv) {
      conversationId = existingConv.id;
    } else {
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          workspace_id: workspaceId,
          contact_id: params.contact_id,
          lead_id: params.lead_id,
          channel: params.channel || 'internal',
          status: 'open'
        })
        .select('id')
        .single();
      
      if (error) throw new Error(`Failed to create conversation: ${error.message}`);
      conversationId = newConv.id;
    }
  }
  
  // Insert message
  const { data: message, error: msgError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      content: params.content,
      channel: params.channel || 'internal',
      direction: 'outbound',
      ai_generated: true,
      sent_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (msgError) throw new Error(`Failed to send message: ${msgError.message}`);
  
  return { success: true, message_id: message.id, conversation_id: conversationId };
}

async function executeCreateTask(
  supabase: SupabaseClient, 
  workspaceId: string, 
  params: { title: string; description?: string; due_date?: string; contact_id?: string; lead_id?: string; status?: string }
): Promise<any> {
  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      workspace_id: workspaceId,
      title: params.title,
      description: params.description || '',
      status: params.status || 'pending',
      due_date: params.due_date,
      contact_id: params.contact_id,
      lead_id: params.lead_id
    })
    .select()
    .single();
  
  if (error) throw new Error(`Failed to create task: ${error.message}`);
  
  return { success: true, task_id: task.id, title: task.title };
}

async function executeUpdateLead(
  supabase: SupabaseClient, 
  workspaceId: string, 
  readOnly: boolean,
  params: { lead_id: string; updates: Record<string, any> }
): Promise<any> {
  if (readOnly) throw new Error('Agent is in read-only mode and cannot modify leads');
  
  const { data, error } = await supabase
    .from('leads')
    .update({ ...params.updates, updated_at: new Date().toISOString() })
    .eq('id', params.lead_id)
    .eq('workspace_id', workspaceId)
    .select()
    .single();
  
  if (error) throw new Error(`Failed to update lead: ${error.message}`);
  
  return { success: true, lead: data };
}

async function executeCreateActivity(
  supabase: SupabaseClient, 
  workspaceId: string, 
  params: { type: string; title: string; description?: string; contact_id?: string; lead_id?: string }
): Promise<any> {
  const { data, error } = await supabase
    .from('activities')
    .insert({
      workspace_id: workspaceId,
      type: params.type,
      title: params.title,
      description: params.description,
      contact_id: params.contact_id,
      lead_id: params.lead_id
    })
    .select()
    .single();
  
  if (error) throw new Error(`Failed to create activity: ${error.message}`);
  
  return { success: true, activity_id: data.id };
}

async function executeSendEmail(
  supabase: SupabaseClient,
  workspaceId: string,
  params: { to: string; subject: string; body: string }
): Promise<any> {
  // Log the email activity
  const { data, error } = await supabase
    .from('activities')
    .insert({
      workspace_id: workspaceId,
      type: 'email',
      title: `Email sent: ${params.subject}`,
      description: `To: ${params.to}\n\n${params.body.substring(0, 500)}`
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to log email: ${error.message}`);
  
  return { success: true, activity_id: data.id, message: 'Email logged (actual sending requires SMTP config)' };
}

async function executeWebhookTool(config: any, params: any): Promise<any> {
  const { url, method = 'POST', headers = {} } = config;
  
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(params)
  });
  
  if (!response.ok) throw new Error(`Webhook error: ${await response.text()}`);
  return await response.json();
}

// ============= DATA ACCESS (Query workspace data based on scopes) =============

async function queryWorkspaceData(
  supabase: SupabaseClient,
  workspaceId: string,
  dataAccess: { scopes: string[]; read_only: boolean; max_records?: number },
  scope: string,
  filters?: Record<string, any>
): Promise<any> {
  const maxRecords = dataAccess.max_records || 50;
  
  if (!dataAccess.scopes.includes(scope) && !dataAccess.scopes.includes('all')) {
    throw new Error(`Agent does not have access to ${scope} data`);
  }
  
  const tableMap: Record<string, string> = {
    leads: 'leads',
    contacts: 'contacts',
    tasks: 'tasks',
    activities: 'activities',
    forms: 'forms',
    pipelines: 'pipelines',
    opportunities: 'leads', // opportunities are leads in this system
    messages: 'messages',
    emails: 'email_campaigns',
    workflows: 'workflows'
  };
  
  const table = tableMap[scope];
  if (!table) throw new Error(`Unknown data scope: ${scope}`);
  
  let query = supabase.from(table).select('*').eq('workspace_id', workspaceId).limit(maxRecords);
  
  // Apply filters if provided
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }
  
  const { data, error } = await query;
  
  if (error) throw new Error(`Failed to query ${scope}: ${error.message}`);
  
  return { scope, count: data?.length || 0, records: data };
}

// ============= TOOL DETECTION & ROUTING =============

function detectToolIntegrations(integrations: any): Array<{ type: string; config: any }> {
  if (!integrations) return [];
  
  const tools = [];
  if (integrations['twilio']?.account_sid) tools.push({ type: 'twilio', config: integrations['twilio'] });
  if (integrations['serp']?.api_key) tools.push({ type: 'serp', config: integrations['serp'] });
  if (integrations['google_maps']?.api_key) tools.push({ type: 'google_maps', config: integrations['google_maps'] });
  if (integrations['custom']?.endpoint_url) tools.push({ type: 'custom', config: integrations['custom'] });
  if (integrations['mcp']?.server_url) tools.push({ type: 'mcp', config: integrations['mcp'] });
  
  return tools;
}

async function executeToolCall(
  toolName: string,
  params: any,
  supabase: SupabaseClient,
  workspaceId: string,
  integrations: any,
  dataAccess: any
): Promise<any> {
  console.log(`[Agent Runtime] Executing tool: ${toolName}`, params);
  
  switch (toolName) {
    // Internal CRM tools
    case 'search_web':
      return await executeSearchWeb(supabase, integrations, params.query);
    case 'send_message':
      return await executeSendMessage(supabase, workspaceId, params);
    case 'create_task':
      return await executeCreateTask(supabase, workspaceId, params);
    case 'update_lead':
      return await executeUpdateLead(supabase, workspaceId, dataAccess.read_only, params);
    case 'create_activity':
      return await executeCreateActivity(supabase, workspaceId, params);
    case 'query_data':
      return await queryWorkspaceData(supabase, workspaceId, dataAccess, params.scope, params.filters);
    case 'send_email':
      return await executeSendEmail(supabase, workspaceId, params);
    
    // External integrations
    case 'twilio_sms':
      return await executeTwilio(integrations['twilio'], 'send_sms', params);
    case 'twilio_call':
      return await executeTwilio(integrations['twilio'], 'make_call', params);
    case 'serp_search':
      return await executeSerpSearch(integrations['serp'], params.query);
    case 'maps_geocode':
      return await executeGoogleMaps(integrations['google_maps'], 'geocode', params);
    case 'maps_places':
      return await executeGoogleMaps(integrations['google_maps'], 'places_search', params);
    case 'custom_api':
      return await executeCustomEndpoint(integrations['custom'], params.method, params.body);
    case 'mcp_tool':
      return await executeMCPServer(integrations['mcp'], params.tool, params.params);
    
    default:
      // Check if it's a dynamically added tool
      const { data: dbTool } = await supabase
        .from('agent_tools')
        .select('*')
        .eq('name', toolName)
        .eq('is_active', true)
        .single();
      
      if (dbTool) {
        const execConfig = dbTool.executor_config as any;
        
        switch (dbTool.executor_type) {
          case 'webhook':
            // Support both 'url' and 'endpoint_url' for backwards compatibility
            const webhookUrl = execConfig?.endpoint_url || execConfig?.url;
            if (webhookUrl) {
              return await executeWebhookTool({ ...execConfig, url: webhookUrl }, params);
            }
            break;
            
          case 'integration':
            // Execute based on integration type
            const integrationType = execConfig?.integration_type;
            if (integrationType) {
              return await executeIntegrationTool(integrationType, execConfig, params, integrations);
            }
            break;
            
          case 'edge_function':
            const fnName = execConfig?.function_name;
            if (fnName) {
              return await executeEdgeFunctionTool(supabase, fnName, params);
            }
            break;
            
          case 'internal':
            // Internal tools should be handled above, but log if we get here
            console.warn(`[Agent Runtime] Internal tool ${toolName} not found in switch`);
            break;
        }
      }
      
      throw new Error(`Unknown or misconfigured tool: ${toolName}`);
  }
}

// Execute integration-based tools
async function executeIntegrationTool(
  integrationType: string,
  config: any,
  params: any,
  agentIntegrations: any
): Promise<any> {
  console.log(`[Agent Runtime] Executing integration tool: ${integrationType}`, params);
  
  // Try to get API key from agent integrations or config
  const integrationConfig = agentIntegrations?.[integrationType] || {};
  const apiKey = integrationConfig.api_key || config.auth_config?.api_key;
  
  switch (integrationType) {
    case 'openai':
      return await executeOpenAITool(apiKey || Deno.env.get('OPENAI_API_KEY'), config, params);
    case 'resend':
      return await executeResendTool(apiKey || Deno.env.get('RESEND_API_KEY'), params);
    case 'elevenlabs':
      return await executeElevenLabsTool(apiKey || Deno.env.get('ELEVENLABS_API_KEY'), params);
    case 'replicate':
      return await executeReplicateTool(apiKey || Deno.env.get('REPLICATE_API_KEY'), params);
    case 'stability':
      return await executeStabilityTool(apiKey || Deno.env.get('STABILITY_API_KEY'), params);
    default:
      // Generic API call for custom integrations
      if (config.endpoint_url) {
        return await executeWebhookTool({ 
          url: config.endpoint_url, 
          method: config.method || 'POST',
          auth_type: config.auth_type,
          auth_config: config.auth_config
        }, params);
      }
      throw new Error(`Unsupported integration type: ${integrationType}`);
  }
}

// Execute edge function tools
async function executeEdgeFunctionTool(
  supabase: SupabaseClient,
  functionName: string,
  params: any
): Promise<any> {
  console.log(`[Agent Runtime] Invoking edge function: ${functionName}`);
  
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: params
  });
  
  if (error) throw error;
  return data;
}

// OpenAI tool execution
async function executeOpenAITool(apiKey: string, config: any, params: any): Promise<any> {
  if (!apiKey) throw new Error('OpenAI API key not configured');
  
  const capability = config.capability || 'image_generation';
  
  if (capability === 'image_generation') {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: params.model || 'dall-e-3',
        prompt: params.prompt,
        size: params.size || '1024x1024',
        quality: params.quality || 'standard',
        n: 1
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }
    
    const data = await response.json();
    return { image_url: data.data?.[0]?.url, revised_prompt: data.data?.[0]?.revised_prompt };
  }
  
  throw new Error(`Unsupported OpenAI capability: ${capability}`);
}

// Resend email tool
async function executeResendTool(apiKey: string, params: any): Promise<any> {
  if (!apiKey) throw new Error('Resend API key not configured');
  
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: params.from || 'noreply@kiruvo.com',
      to: params.to,
      subject: params.subject,
      html: params.body
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${error}`);
  }
  
  return await response.json();
}

// ElevenLabs voice tool
async function executeElevenLabsTool(apiKey: string, params: any): Promise<any> {
  if (!apiKey) throw new Error('ElevenLabs API key not configured');
  
  const voiceId = params.voice_id || '21m00Tcm4TlvDq8ikWAM'; // Default voice
  
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: params.text,
      model_id: params.model_id || 'eleven_monolingual_v1'
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${error}`);
  }
  
  // Return audio as base64
  const buffer = await response.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  return { audio_base64: base64, format: 'mp3' };
}

// Replicate tool
async function executeReplicateTool(apiKey: string, params: any): Promise<any> {
  if (!apiKey) throw new Error('Replicate API key not configured');
  
  const model = params.model || 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b';
  
  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      version: model.includes(':') ? model.split(':')[1] : model,
      input: {
        prompt: params.prompt,
        negative_prompt: params.negative_prompt || '',
        ...(params.duration ? { duration: params.duration } : {})
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Replicate API error: ${error}`);
  }
  
  const prediction = await response.json();
  return { prediction_id: prediction.id, status: prediction.status, output: prediction.output };
}

// Stability AI tool
async function executeStabilityTool(apiKey: string, params: any): Promise<any> {
  if (!apiKey) throw new Error('Stability API key not configured');
  
  const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text_prompts: [{ text: params.prompt }],
      cfg_scale: 7,
      height: 1024,
      width: 1024,
      steps: 30
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Stability API error: ${error}`);
  }
  
  const data = await response.json();
  return { image_base64: data.artifacts?.[0]?.base64 };
}

// ============= SYSTEM PROMPT BUILDER =============

function buildSystemPrompt(agent: any, availableTools: any[], agentTools: any[], dataAccess: any, dynamicKnowledge?: { businessSettings?: any; contentItems?: any[]; items?: any[] }): string {
  let systemPrompt = '';

  // ===== DEEP PRODUCT KNOWLEDGE =====
  systemPrompt += `## KIRUVO PLATFORM KNOWLEDGE
You are an AI agent built into **Kiruvo**, a comprehensive CRM and business management platform. You have deep knowledge of every feature:

### Core CRM
- **Pipeline Management**: Kanban-style drag-and-drop lead tracking with customizable stages. Lead scoring with automated rules.
- **Contacts & Leads**: Full profiles with custom fields, activity history. Bulk import via CSV or Google Sheets.
- **Tasks**: Create, assign, track tasks linked to leads/contacts with due dates.

### Communication
- **Email Campaigns**: Create and schedule blasts (e.g., Monday 8:30 AM). HTML content, test sends, delivery metrics.
- **Email Lists**: Segmented subscriber lists. Import from CRM or CSV.
- **Inbox**: Unified inbox for email, SMS, social. Threaded conversations.
- **Voice/Calling**: Twilio-powered with templates, recording, transcripts, AI call summaries, voice broadcasting.

### Content & Marketing
- **Content Hub**: Single source of truth for programs, classes, events, announcements.
- **Flyer Builder**: AI Generate (prompt-based), drag-and-drop canvas, and templates. PDF + PNG export. Email blast integration.
- **Social Media**: Instagram post scheduling, comments, DMs, mentions, analytics.

### Automation & AI
- **Workflows**: Visual builder with triggers, conditions, actions. Templates library.
- **AI Agents**: Custom agents with memory, tools, integrations. Query CRM, create tasks, send messages, search web.

### Scheduling & Bookings
- **Calendar**: Day/week/month views. Color-coded by item/resource.
- **Bookings**: Resources, staff assignment, attendees. Public booking pages with Stripe. One-click roster export (Name, Email, Phone, Day/Time, Level, Age, DOB).
- **Point of Sale**: Items, promotions, receipts.

### Analytics & Administration
- **Dashboard**: KPIs, charts, pipeline viz, activity timeline.
- **Settings**: Business profile, staff roles, custom fields, integrations (Sheets, Stripe, Twilio, Instagram, TikTok).
- **Subscription Tiers**: Free, Pro, Premium, Enterprise with usage limits.
- **Knowledge Bases**: Documents to train AI agents with business context.

`;

  // ===== DYNAMIC BUSINESS CONTEXT =====
  if (dynamicKnowledge?.businessSettings) {
    const bs = dynamicKnowledge.businessSettings;
    systemPrompt += `## THIS BUSINESS\n`;
    if (bs.business_name) systemPrompt += `- Name: ${bs.business_name}\n`;
    if (bs.business_category) systemPrompt += `- Category: ${bs.business_category}\n`;
    if (bs.business_phone) systemPrompt += `- Phone: ${bs.business_phone}\n`;
    if (bs.business_email) systemPrompt += `- Email: ${bs.business_email}\n`;
    if (bs.city || bs.state_province) systemPrompt += `- Location: ${[bs.city, bs.state_province].filter(Boolean).join(', ')}\n`;
    if (bs.website) systemPrompt += `- Website: ${bs.website}\n`;
    systemPrompt += '\n';
  }

  if (dynamicKnowledge?.contentItems?.length) {
    systemPrompt += `## CURRENT PROGRAMS & CONTENT\n`;
    dynamicKnowledge.contentItems.slice(0, 15).forEach((item: any) => {
      const details = item.details || {};
      systemPrompt += `- **${item.title}** (${item.content_type})`;
      if (item.description) systemPrompt += `: ${item.description.substring(0, 100)}`;
      if (details.schedule) systemPrompt += ` | Schedule: ${details.schedule}`;
      if (details.price) systemPrompt += ` | Price: ${details.price}`;
      systemPrompt += '\n';
    });
    systemPrompt += '\n';
  }

  if (dynamicKnowledge?.items?.length) {
    systemPrompt += `## BOOKABLE SERVICES\n`;
    dynamicKnowledge.items.slice(0, 15).forEach((item: any) => {
      systemPrompt += `- **${item.title}** (${item.item_type})`;
      if (item.price) systemPrompt += ` — $${item.price}`;
      systemPrompt += '\n';
    });
    systemPrompt += '\n';
  }

  systemPrompt += `### HUMAN HANDOFF PROTOCOL
**CRITICAL**: Hand off to a human if:
1. User asks for a person/human/team/manager
2. User says "escalate", "talk to someone", "real person"
3. You cannot resolve after 2 attempts
4. User expresses strong frustration
5. Billing, refunds, subscription changes
6. Data deletion, privacy, legal matters

When handing off: HANDOFF_REQUEST: {"reason": "<brief>", "summary": "<context>", "priority": "<low|medium|high|urgent>"}
Then tell user: "I'm connecting you with our team now. They'll have full context and follow up shortly."

`;

  // Add personality/behavior context
  const behavior = agent.behavior || {};
  if (behavior.personality) {
    systemPrompt += `Personality: ${behavior.personality}\n\n`;
  }
  
  // Add response style instruction
  const styleInstructions: Record<string, string> = {
    'concise': 'Keep responses brief and to the point.',
    'detailed': 'Provide comprehensive, thorough responses.',
    'technical': 'Use precise technical language and be exact.',
    'friendly': 'Be warm, approachable, and conversational.'
  };
  if (behavior.response_style && styleInstructions[behavior.response_style]) {
    systemPrompt += `Response Style: ${styleInstructions[behavior.response_style]}\n\n`;
  }
  
  // Add behavior mode context
  const modeInstructions: Record<string, string> = {
    'assistant': 'You are a helpful assistant focused on answering questions and providing guidance.',
    'executor': 'You are an action-focused executor. Complete tasks efficiently with minimal conversation.',
    'analyzer': 'You are a data analyst. Focus on insights, patterns, and data-driven recommendations.',
    'validator': 'You are a validator. Check data accuracy, flag issues, and ensure quality.',
    'custom': ''
  };
  if (behavior.mode && modeInstructions[behavior.mode]) {
    systemPrompt += `${modeInstructions[behavior.mode]}\n\n`;
  }
  
  // Add custom rules
  if (behavior.custom_rules?.length) {
    systemPrompt += 'Custom Rules:\n';
    behavior.custom_rules.forEach((rule: string) => {
      systemPrompt += `- ${rule}\n`;
    });
    systemPrompt += '\n';
  }
  
  // Add main instructions
  systemPrompt += agent.instructions || 'You are a helpful AI assistant.';
  
  // Add data access context with REAL capability
  if (dataAccess?.scopes?.length) {
    systemPrompt += `\n\n## DATA ACCESS
You have REAL access to query the following data types: ${dataAccess.scopes.join(', ')}.
${dataAccess.read_only ? 'MODE: Read-only (you cannot modify data)' : 'MODE: Read-write (you can modify data)'}
${dataAccess.max_records ? `Limit: ${dataAccess.max_records} records per query` : ''}

To query data, use: TOOL_CALL: query_data | {"scope": "<data_type>", "filters": {}}`;
  }
  
  // Add enabled agent tools with REAL execution
  const enabledTools = agentTools.filter(t => t.enabled);
  if (enabledTools.length > 0) {
    systemPrompt += '\n\n## AVAILABLE TOOLS (These actually execute actions)\n';
    enabledTools.forEach(tool => {
      systemPrompt += `- ${tool.name}: ${tool.description}\n`;
    });
    systemPrompt += `
To use a tool, respond with: TOOL_CALL: <tool_name> | <params_as_json>

Examples:
- TOOL_CALL: search_web | {"query": "latest AI news"}
- TOOL_CALL: create_task | {"title": "Follow up with lead", "due_date": "2025-12-10"}
- TOOL_CALL: send_message | {"contact_id": "uuid", "content": "Hello!"}
- TOOL_CALL: query_data | {"scope": "leads", "filters": {"stage_id": "uuid"}}`;
  }
  
  // Add integration tools
  if (availableTools.length > 0) {
    systemPrompt += '\n\n## EXTERNAL INTEGRATIONS (Connected APIs)\n';
    availableTools.forEach(tool => {
      const toolDocs: Record<string, string> = {
        twilio: 'twilio_sms | {"to": "+1...", "from": "+1...", "message": "..."}  OR  twilio_call | {"to": "+1...", "from": "+1..."}',
        serp: 'serp_search | {"query": "search term"}',
        google_maps: 'maps_geocode | {"address": "..."}  OR  maps_places | {"query": "restaurants near me"}',
        custom: 'custom_api | {"method": "POST", "body": {...}}',
        mcp: 'mcp_tool | {"tool": "tool_name", "params": {...}}'
      };
      systemPrompt += `- ${tool.type}: ${toolDocs[tool.type] || 'Available'}\n`;
    });
  }
  
  return systemPrompt;
}

// ============= MAIN HANDLER =============

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claimsData.claims.sub;
    console.log(`[Agent Runtime] Authenticated user: ${userId}`);

    const body = await req.json();
    // Support both naming conventions for flexibility
    const agentId = body.agentId || body.agent_id;
    const input = body.input || body.message;
    const conversationHistory = body.conversation_history || [];
    const context = body.context || {};

    if (!agentId || !input) {
      throw new Error('agent_id and message are required');
    }

    console.log(`[Agent Runtime] Executing agent: ${agentId}`);

    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch agent configuration
    const { data: agent, error: agentError } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      throw new Error(`Agent not found: ${agentError?.message}`);
    }

    const workspaceId = context.workspace_id || agent.workspace_id;
    if (!workspaceId) {
      throw new Error('workspace_id is required in context');
    }

    // USAGE GATE: Check AI query limits
    const usageCheck = await checkUsageGate(workspaceId, 'ai_queries', userId as string);
    if (!usageCheck.allowed) {
      return usageLimitResponse(corsHeaders, usageCheck);
    }

    console.log(`[Agent Runtime] Agent: ${agent.name}, Workspace: ${workspaceId}`);

    // Extract enhanced configuration
    const agentBehavior = agent.behavior || {};
    const agentDataAccess = agent.data_access || { scopes: [], read_only: true };
    const agentTools = agent.tools || [];
    const temperature = agentBehavior.temperature || 0.7;
    const maxTokens = agentBehavior.max_response_tokens || 500;
    const integrations = agent.integration_configs || {};

    // Detect LLM integration
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    let llmIntegration: { type: string; config: any } | null = null;

    if (lovableApiKey) {
      llmIntegration = { type: 'lovable', config: { api_key: lovableApiKey } };
    } else if (integrations['openai']?.api_key) {
      llmIntegration = { type: 'openai', config: integrations['openai'] };
    } else if (integrations['mistral']?.api_key) {
      llmIntegration = { type: 'mistral', config: integrations['mistral'] };
    } else {
      // Check platform configs
      const { data: platformConfigs } = await supabase
        .from('platform_api_configs')
        .select('*')
        .eq('is_active', true)
        .in('integration_type', ['openai', 'mistral'])
        .limit(1);
      
      if (platformConfigs?.[0]) {
        llmIntegration = { type: platformConfigs[0].integration_type, config: platformConfigs[0].config };
      }
    }

    if (!llmIntegration) {
      throw new Error('No LLM integration configured');
    }

    // Detect available external integrations
    const availableTools = detectToolIntegrations(integrations);
    console.log('[Agent Runtime] Available integrations:', availableTools.map(t => t.type));
    console.log('[Agent Runtime] Enabled internal tools:', agentTools.filter((t: any) => t.enabled).map((t: any) => t.name));

    // Fetch dynamic business knowledge for system prompt
    const [{ data: businessSettings }, { data: contentItems }, { data: serviceItems }] = await Promise.all([
      supabase.from('business_settings').select('business_name, business_category, business_phone, business_email, city, state_province, website').eq('workspace_id', workspaceId).single(),
      supabase.from('content_items').select('title, description, content_type, details').eq('workspace_id', workspaceId).eq('is_active', true).order('updated_at', { ascending: false }).limit(15),
      supabase.from('items').select('title, item_type, price, description').eq('workspace_id', workspaceId).eq('is_active', true).order('title').limit(15),
    ]);

    // Build system prompt with dynamic knowledge
    let systemPrompt = buildSystemPrompt(agent, availableTools, agentTools, agentDataAccess, {
      businessSettings,
      contentItems: contentItems || [],
      items: serviceItems || [],
    });

    // Load agent memory if enabled
    if (agent.use_memory && workspaceId) {
      const retentionDays = agent.memory_retention_days || 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      const { data: memories } = await supabase
        .from('agent_memory')
        .select('*')
        .eq('agent_id', agentId)
        .eq('workspace_id', workspaceId)
        .gte('created_at', cutoffDate.toISOString())
        .order('importance_score', { ascending: false })
        .limit(10);
      
      if (memories?.length) {
        systemPrompt += '\n\n## MEMORY (Past interactions)\n';
        memories.forEach(m => systemPrompt += `- ${m.content}\n`);
      }
    }

    // Execute LLM
    let llmResponse = await executeLLM(llmIntegration, systemPrompt, input, { temperature, maxTokens, conversationHistory });
    const toolResults: any[] = [];

    // Process tool calls (allow up to 3 sequential tool calls)
    let iterations = 0;
    while (llmResponse.response.includes('TOOL_CALL:') && iterations < 3) {
      iterations++;
      const toolMatch = llmResponse.response.match(/TOOL_CALL:\s*(\w+)\s*\|\s*({.*})/);
      
      if (toolMatch) {
        const [, toolName, paramsJson] = toolMatch;
        try {
          const params = JSON.parse(paramsJson);
          const result = await executeToolCall(
            toolName, 
            params, 
            supabase, 
            workspaceId, 
            integrations, 
            agentDataAccess
          );
          toolResults.push({ tool: toolName, params, result, success: true });
          
          // Re-execute LLM with tool result
          const toolResultPrompt = `Tool "${toolName}" executed successfully. Result: ${JSON.stringify(result)}\n\nNow provide your response to the user based on this data.`;
          llmResponse = await executeLLM(llmIntegration, systemPrompt, toolResultPrompt, { temperature, maxTokens, conversationHistory: [] });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          toolResults.push({ tool: toolName, params: paramsJson, error: errorMsg, success: false });
          llmResponse.response = `I tried to use the ${toolName} tool but encountered an error: ${errorMsg}`;
          break;
        }
      } else {
        break;
      }
    }

    // Store memory if enabled
    if (agent.use_memory && workspaceId) {
      try {
        await supabase.from('agent_memory').insert({
          agent_id: agentId,
          workspace_id: workspaceId,
          memory_type: 'conversation',
          content: `User: ${input.substring(0, 200)}\nAgent: ${llmResponse.response.substring(0, 200)}`,
          importance_score: 5,
          context: { input, response: llmResponse.response, tools_used: toolResults.map(t => t.tool) }
        });
      } catch (e) {
        console.error('[Agent Runtime] Memory save error:', e);
      }
    }

    // Log usage
    try {
      await supabase.from('agent_usage').insert({
        agent_id: agentId,
        workspace_id: workspaceId,
        template_id: agent.template_id,
        integration_type: llmResponse.type,
        usage_count: 1,
        tokens_used: llmResponse.usage?.total_tokens || 0,
        cost_usd: calculateCost(llmResponse.type, llmResponse.usage?.total_tokens || 0),
        period_start: new Date().toISOString(),
        period_end: new Date().toISOString(),
      });
    } catch (e) {
      console.error('[Agent Runtime] Usage log error:', e);
    }

    // Detect handoff request
    let handoff = null;
    const handoffMatch = llmResponse.response.match(/HANDOFF_REQUEST:\s*({.*})/);
    if (handoffMatch) {
      try {
        handoff = JSON.parse(handoffMatch[1]);
        // Remove the HANDOFF_REQUEST from the visible response
        llmResponse.response = llmResponse.response.replace(/HANDOFF_REQUEST:\s*{.*}/, '').trim();
        
        // Log handoff as activity
        try {
          await supabase.from('activities').insert({
            workspace_id: workspaceId,
            type: 'agent_handoff',
            title: `Agent handoff requested: ${handoff.reason}`,
            description: `Priority: ${handoff.priority}\nSummary: ${handoff.summary}`,
          });
        } catch (_e) { /* ignore */ }
      } catch (e) {
        console.error('[Agent Runtime] Handoff parse error:', e);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        response: llmResponse.response,
        message: llmResponse.response,
        handoff,
        result: {
          ...llmResponse,
          handoff,
          tool_results: toolResults.length > 0 ? toolResults : undefined,
          config_used: {
            behavior_mode: agentBehavior.mode,
            response_style: agentBehavior.response_style,
            temperature,
            max_tokens: maxTokens,
            memory_enabled: agent.use_memory,
            data_scopes: agentDataAccess.scopes,
            read_only: agentDataAccess.read_only,
            tools_enabled: agentTools.filter((t: any) => t.enabled).map((t: any) => t.name),
            integrations_connected: availableTools.map(t => t.type)
          }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Agent Runtime] Error:', error);
    try {
      const { logEdgeFunctionError } = await import("../_shared/server-error-logger.ts");
      await logEdgeFunctionError("agent-runtime", error instanceof Error ? error : new Error(String(error)));
    } catch (_) { /* never block response */ }
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'An error occurred processing your request. Please try again.' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============= LLM EXECUTORS =============

async function executeLLM(
  integration: { type: string; config: any },
  systemPrompt: string,
  userInput: string,
  params: { temperature: number; maxTokens: number; conversationHistory?: Array<{role: string; content: string}> }
): Promise<any> {
  if (integration.type === 'lovable') {
    return await executeLovableAI(integration.config, systemPrompt, userInput, params);
  } else if (integration.type === 'openai') {
    return await executeOpenAI(integration.config, systemPrompt, userInput, params);
  } else if (integration.type === 'mistral') {
    return await executeMistral(integration.config, systemPrompt, userInput, params);
  }
  throw new Error(`Unsupported LLM type: ${integration.type}`);
}

async function executeLovableAI(
  config: any, 
  systemPrompt: string, 
  userInput: string, 
  params: { temperature: number; maxTokens: number; conversationHistory?: Array<{role: string; content: string}> }
): Promise<any> {
  // Build messages array with conversation history
  const messages: Array<{role: string; content: string}> = [
    { role: 'system', content: systemPrompt }
  ];
  
  // Add conversation history
  if (params.conversationHistory?.length) {
    messages.push(...params.conversationHistory);
  }
  
  // Add current user input
  messages.push({ role: 'user', content: userInput });

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.api_key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages,
      temperature: params.temperature,
      max_tokens: params.maxTokens,
    }),
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 429) throw new Error('Rate limit exceeded. Please try again in a moment.');
    if (status === 402) throw new Error('AI credits depleted. Please add credits to continue.');
    throw new Error(`Lovable AI error: ${status}`);
  }

  const data = await response.json();
  return {
    response: data.choices[0]?.message?.content || 'No response generated',
    type: 'lovable',
    usage: data.usage,
  };
}

async function executeOpenAI(
  config: any, 
  systemPrompt: string, 
  userInput: string, 
  params: { temperature: number; maxTokens: number; conversationHistory?: Array<{role: string; content: string}> }
): Promise<any> {
  const messages: Array<{role: string; content: string}> = [
    { role: 'system', content: systemPrompt }
  ];
  
  if (params.conversationHistory?.length) {
    messages.push(...params.conversationHistory);
  }
  
  messages.push({ role: 'user', content: userInput });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.api_key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: params.temperature,
      max_tokens: params.maxTokens,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI error: ${response.status}`);
  }

  const data = await response.json();
  return {
    response: data.choices[0]?.message?.content || 'No response generated',
    type: 'openai',
    usage: data.usage,
  };
}

async function executeMistral(config: any, systemPrompt: string, userInput: string, params: { temperature: number; maxTokens: number }): Promise<any> {
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.api_key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userInput }
      ],
      temperature: params.temperature,
      max_tokens: params.maxTokens,
    }),
  });

  if (!response.ok) {
    throw new Error(`Mistral error: ${response.status}`);
  }

  const data = await response.json();
  return {
    response: data.choices[0]?.message?.content || 'No response generated',
    type: 'mistral',
    usage: data.usage,
  };
}

function calculateCost(type: string, tokens: number): number {
  const rates: Record<string, number> = {
    'lovable': 0.0001,
    'openai': 0.0015,
    'mistral': 0.0002
  };
  return ((tokens / 1000) * (rates[type] || 0.001));
}
