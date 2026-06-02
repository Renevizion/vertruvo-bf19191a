import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { checkUsageGate, usageLimitResponse, getWorkspaceForUser } from "../_shared/usage-gate.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const authClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    console.log(`[MISTRAL] Authenticated user: ${claimsData.claims.sub}`);

    // USAGE GATE: Check AI query limits
    const userId = claimsData.claims.sub as string;
    const wsId = await getWorkspaceForUser(userId);
    if (wsId) {
      const usageCheck = await checkUsageGate(wsId, 'ai_queries', userId);
      if (!usageCheck.allowed) {
        return usageLimitResponse(corsHeaders, usageCheck);
      }
    }

    const { contextType, contextId, insightType, contextData, forceRefresh = false } = await req.json();
    
    console.log(`[MISTRAL] Request: ${contextType}/${insightType} for ${contextId || 'no-id'}`);
    
    // Use service role for DB queries (scoped by workspace via RLS-like filtering)
    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // RATE LIMITING: Check recent generations (8 min cooldown)
    let recentGenQuery = supabaseClient
      .from('agent_insights')
      .select('created_at')
      .eq('context_type', contextType)
      .eq('insight_type', insightType)
      .gte('created_at', new Date(Date.now() - 8 * 60 * 1000).toISOString()) // Last 8 min
      .limit(1);

    recentGenQuery = wsId ? recentGenQuery.eq('workspace_id', wsId) : recentGenQuery.is('workspace_id', null);
    recentGenQuery = contextId ? recentGenQuery.eq('context_id', contextId) : recentGenQuery.is('context_id', null);

    const { data: recentGen } = await recentGenQuery;

    if (!forceRefresh && recentGen && recentGen.length > 0) {
      const secondsSince = Math.floor((Date.now() - new Date(recentGen[0].created_at).getTime()) / 1000);
      if (secondsSince < 480) { // 8 minutes
        console.log(`[MISTRAL] Rate limited: ${480 - secondsSince}s remaining`);
        return new Response(
          JSON.stringify({ 
            error: `Please wait ${Math.ceil((480 - secondsSince) / 60)} more minutes`,
            retryAfter: 480 - secondsSince
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check cache first (unless forceRefresh)
    if (!forceRefresh) {
      let cachedInsightQuery = supabaseClient
        .from('agent_insights')
        .select('*')
        .eq('context_type', contextType)
        .eq('insight_type', insightType)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      cachedInsightQuery = wsId ? cachedInsightQuery.eq('workspace_id', wsId) : cachedInsightQuery.is('workspace_id', null);
      cachedInsightQuery = contextId ? cachedInsightQuery.eq('context_id', contextId) : cachedInsightQuery.is('context_id', null);

      const { data: cachedInsight } = await cachedInsightQuery.single();

      if (cachedInsight) {
        console.log('[MISTRAL] Returning cached insight');
        return new Response(JSON.stringify({ 
          insights: cachedInsight.content,
          cached: true,
          model: cachedInsight.model_used,
          created_at: cachedInsight.created_at
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Get agent settings to determine model
    const { data: settings } = await supabaseClient
      .from('agent_settings')
      .select('*')
      .limit(1)
      .single();

    if (!settings?.agent_features_enabled) {
      return new Response(JSON.stringify({ error: 'Agent features disabled' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine API endpoint and model based on provider
    const provider = settings.ai_provider || 'mistral';
    let apiUrl: string;
    let apiKey: string;
    let model: string;
    
    if (provider === 'gemini') {
      apiUrl = 'https://ai.gateway.lovable.dev/v1/chat/completions';
      apiKey = Deno.env.get('LOVABLE_API_KEY')!;
      model = settings.agent_tier === 'premium' ? 'google/gemini-2.5-pro' : 'google/gemini-2.5-flash';
    } else {
      apiUrl = 'https://api.mistral.ai/v1/chat/completions';
      apiKey = Deno.env.get('MISTRAL_API_KEY')!;
      model = settings.agent_tier === 'premium' ? 'mistral-large-latest' : 'mistral-small-latest';
    }

    // Build prompt based on context type
    const prompt = buildPrompt(contextType, insightType, contextData);

    // ERROR PREVENTION: Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

    console.log(`[MISTRAL] Calling ${provider} model: ${model}`);
    const aiResponse = await fetch(apiUrl, {
      signal: controller.signal,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: getSystemPrompt(contextType, insightType) },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    clearTimeout(timeoutId);

    if (!aiResponse.ok) {
      console.error(`[MISTRAL] API error ${aiResponse.status}`);
      const errorText = await aiResponse.text();
      console.error(`${provider} API error:`, aiResponse.status, errorText);
      
      // Handle rate limits and payment errors specifically
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      if (aiResponse.status === 402) {
        throw new Error('AI credits exhausted. Please add credits to your account.');
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const insights = parseInsights(aiData.choices[0].message.content, insightType);

    // Cache the insights (with validation)
    console.log(`[MISTRAL] Caching insight for ${contextType}/${insightType}`);
    const { error: cacheError } = await supabaseClient.from('agent_insights').insert({
      workspace_id: wsId,
      context_type: contextType,
      context_id: contextId ?? null,
      insight_type: insightType,
      content: insights,
      title: contextType === 'task' ? 'Task pulse report' : null,
      model_used: model,
      expires_at: new Date(Date.now() + (15 * 60 * 1000)).toISOString(), // 15 min cache
    });

    if (cacheError) {
      console.error('[MISTRAL] Cache insert error:', cacheError);
    }

    return new Response(JSON.stringify({ 
      insights,
      cached: false,
      model
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    // ERROR HANDLING: Distinguish error types
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[MISTRAL] Request timeout');
      return new Response(
        JSON.stringify({ error: 'Request timeout. Please try again.' }),
        { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.error('[MISTRAL] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'An error occurred with the AI service. Please try again.' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getSystemPrompt(contextType: string, insightType: string): string {
  const basePrompt = 'You are an AI assistant for a CRM system. Provide concise, actionable insights.';
  
  const prompts: Record<string, Record<string, string>> = {
    lead: {
      summary: `${basePrompt} Summarize lead information in 2-3 bullet points, highlighting key details and engagement patterns.`,
      suggestion: `${basePrompt} Suggest 3 specific next actions for this lead. Format: Action - Reason. Be strategic and time-aware.`,
      scoring: `${basePrompt} Analyze lead quality. Provide: 1) Score (1-10), 2) Key signals (positive/negative), 3) Priority level.`
    },
    contact: {
      summary: `${basePrompt} Summarize contact engagement history in 2-3 bullet points. Focus on patterns and relationship strength.`,
      suggestion: `${basePrompt} Suggest optimal engagement strategies: best contact time, preferred channel, and 2 action items.`
    },
    kpi: {
      summary: `${basePrompt} Analyze KPI trends and provide 2-3 key insights with percentage changes. Focus on actionable takeaways.`,
      alert: `${basePrompt} Explain why this KPI is in alert state and suggest 2 specific corrective actions.`
    },
    task: {
      suggestion: `${basePrompt} Suggest 3-5 prioritized tasks based on lead activity gaps and opportunities. Format: Title | Priority | Category.`,
      prioritization: `${basePrompt} Analyze tasks and suggest optimal order. Consider urgency, lead value, and dependencies.`
    },
    conversation: {
      draft: `${basePrompt} Draft a professional message based on context. Keep it concise (3-4 sentences), personalized, and action-oriented.`,
      summary: `${basePrompt} Summarize conversation thread in 2-3 bullet points. Highlight key decisions and next steps.`
    },
    sheets: {
      mapping: `${basePrompt} Suggest optimal column mappings for CRM import. Format: SheetColumn -> CRMField with confidence level.`,
      cleaning: `${basePrompt} Identify data quality issues and suggest fixes. Format: Issue | Impact | Suggested Fix.`
    }
  };

  return prompts[contextType]?.[insightType] || basePrompt;
}

function buildPrompt(contextType: string, insightType: string, contextData: any): string {
  // Build context-specific prompts
  switch (contextType) {
    case 'lead':
      return `Lead Information:\nName: ${contextData.name}\nEmail: ${contextData.email || 'N/A'}\nPhone: ${contextData.phone || 'N/A'}\nCompany: ${contextData.company || 'N/A'}\nValue: $${contextData.value || 0}\nSource: ${contextData.source || 'Unknown'}\nStage: ${contextData.stage || 'Unknown'}\nCreated: ${contextData.created_at}\nNotes: ${contextData.notes || 'No notes'}\nRecent Activities: ${JSON.stringify(contextData.activities || [])}\n\n${insightType === 'summary' ? 'Summarize this lead.' : insightType === 'suggestion' ? 'What should we do next with this lead?' : 'Score this lead quality.'}`;

    case 'contact':
      return `Contact Information:\nName: ${contextData.name}\nEmail: ${contextData.email || 'N/A'}\nPhone: ${contextData.phone || 'N/A'}\nCompany: ${contextData.company || 'N/A'}\nTotal Activities: ${contextData.activity_count || 0}\nLast Contact: ${contextData.last_activity || 'Never'}\nEngagement History: ${JSON.stringify(contextData.activities || [])}\n\n${insightType === 'summary' ? 'Summarize this contact relationship.' : 'Suggest best engagement approach.'}`;

    case 'kpi':
      return `KPI Data:\nMetric: ${contextData.metric}\nCurrent Value: ${contextData.current}\nPrevious Value: ${contextData.previous}\nChange: ${contextData.change}%\nTrend: ${contextData.trend}\nContext: ${contextData.context || ''}\n\n${insightType === 'summary' ? 'Analyze this KPI trend.' : 'Explain the alert and suggest fixes.'}`;

    case 'task':
      return `Task Context:\nExisting Tasks: ${JSON.stringify(contextData.tasks || [])}\nLeads: ${JSON.stringify(contextData.leads || [])}\nRecent Activities: ${JSON.stringify(contextData.activities || [])}\n\n${insightType === 'suggestion' ? 'Suggest new tasks based on gaps.' : 'Prioritize existing tasks.'}`;

    case 'conversation':
      return `Conversation Context:\nContact: ${contextData.contact_name}\nPrevious Messages: ${JSON.stringify(contextData.messages || [])}\nLead Info: ${JSON.stringify(contextData.lead_info || {})}\n\n${insightType === 'draft' ? 'Draft a follow-up message.' : 'Summarize the conversation.'}`;

    case 'sheets':
      return `Sheet Data:\nColumns: ${JSON.stringify(contextData.columns || [])}\nSample Rows: ${JSON.stringify(contextData.sample_rows || [])}\nCRM Fields: ${JSON.stringify(contextData.crm_fields || [])}\n\n${insightType === 'mapping' ? 'Suggest column mappings.' : 'Identify data quality issues.'}`;

    default:
      return JSON.stringify(contextData);
  }
}

function parseInsights(content: string, insightType: string): any {
  // Parse the AI response into structured format
  try {
    // Try to parse as JSON first (in case AI returns JSON)
    return JSON.parse(content);
  } catch {
    // Otherwise structure the text response
    return {
      type: insightType,
      content: content.trim(),
      generated_at: new Date().toISOString()
    };
  }
}
