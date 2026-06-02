import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { checkUsageGate, usageLimitResponse } from "../_shared/usage-gate.ts";

Deno.serve(async (req) => {
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
    console.log(`[INSIGHTS] Authenticated user: ${claimsData.claims.sub}`);

    const { workspaceId } = await req.json();

    if (!workspaceId) {
      return new Response(
        JSON.stringify({ error: 'Missing workspaceId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is member of workspace
    const serviceClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { data: membership } = await serviceClient.rpc('is_workspace_member', { _workspace_id: workspaceId, _user_id: claimsData.claims.sub });
    if (!membership) {
      return new Response(JSON.stringify({ error: 'Forbidden: not a member of this workspace' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // USAGE GATE: Check AI query limits
    const usageCheck = await checkUsageGate(workspaceId, 'ai_queries', claimsData.claims.sub as string);
    if (!usageCheck.allowed) {
      return usageLimitResponse(corsHeaders, usageCheck);
    }

    // Initialize Supabase client
    const supabase = serviceClient;

    // RATE LIMITING: Check if workspace generated insights recently
    const { data: recentInsights } = await supabase
      .from('agent_insights')
      .select('created_at')
      .eq('workspace_id', workspaceId)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
      .order('created_at', { ascending: false })
      .limit(1);

    if (recentInsights && recentInsights.length > 0) {
      const minutesSinceLastGeneration = Math.floor(
        (Date.now() - new Date(recentInsights[0].created_at).getTime()) / 1000 / 60
      );
      
      if (minutesSinceLastGeneration < 15) {
        return new Response(
          JSON.stringify({ 
            error: `Rate limit: Please wait ${15 - minutesSinceLastGeneration} more minutes before generating new insights.`,
            retryAfter: 15 - minutesSinceLastGeneration
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ABUSE PREVENTION: Limit total insights per workspace
    const { count: totalInsights } = await supabase
      .from('agent_insights')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    if (totalInsights && totalInsights > 500) {
      console.warn(`[ABUSE ALERT] Workspace ${workspaceId} has ${totalInsights} insights`);
      return new Response(
        JSON.stringify({ error: 'Maximum insights limit reached. Please contact support.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Fetch workspace data for insights
    const [
      { data: leads },
      { data: workflows },
      { data: forms },
      { data: activities },
    ] = await Promise.all([
      supabase.from('leads').select('*').eq('workspace_id', workspaceId).limit(100),
      supabase.from('workflows').select('*').eq('workspace_id', workspaceId),
      supabase.from('forms').select('*').eq('workspace_id', workspaceId),
      supabase.from('activities').select('*').eq('workspace_id', workspaceId).limit(100),
    ]);

    // Calculate metrics
    const totalLeads = leads?.length || 0;
    const convertedLeads = leads?.filter((l: any) => l.stage_id && l.value && l.value > 0).length || 0;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
    const totalRevenue = leads?.reduce((sum: number, l: any) => sum + (l.value || 0), 0) || 0;
    const avgDealSize = convertedLeads > 0 ? totalRevenue / convertedLeads : 0;
    
    const leadSources = leads?.reduce((acc: Record<string, number>, l: any) => {
      const source = l.source || 'unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};
    
    const topSource = Object.entries(leadSources).sort((a, b) => b[1] - a[1])[0] as [string, number] | undefined;
    
    // Generate AI insights using Lovable AI
    const systemPrompt = `You are a business intelligence analyst. Analyze the provided CRM data and generate 3-5 actionable insights. 
For each insight, provide: title (short), description (2-3 sentences), metric value (number), metric unit (string), trend (up/down/stable), confidence (0-1), and actionable recommendations array.`;

    const dataContext = `
Total Leads: ${totalLeads}
Converted Leads: ${convertedLeads}
Conversion Rate: ${conversionRate.toFixed(1)}%
Total Revenue: $${totalRevenue.toFixed(2)}
Average Deal Size: $${avgDealSize.toFixed(2)}
Top Lead Source: ${topSource?.[0] || 'unknown'} (${topSource?.[1] || 0} leads)
Active Workflows: ${workflows?.length || 0}
Active Forms: ${forms?.length || 0}
Recent Activities: ${activities?.length || 0}
`;

    // ERROR PREVENTION: Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    console.log(`[INSIGHTS] Generating for workspace ${workspaceId}`);
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this CRM data and provide insights:\n${dataContext}` }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'generate_insights',
            description: 'Generate business insights from CRM data',
            parameters: {
              type: 'object',
              properties: {
                insights: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      description: { type: 'string' },
                      metric_type: { type: 'string', enum: ['conversion_rate', 'best_contact_time', 'lead_quality', 'workflow_performance', 'revenue_trend'] },
                      metric_value: { type: 'number' },
                      metric_unit: { type: 'string' },
                      trend: { type: 'string', enum: ['up', 'down', 'stable'] },
                      trend_percentage: { type: 'number' },
                      confidence: { type: 'number', minimum: 0, maximum: 1 },
                      recommendations: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            action: { type: 'string' },
                            impact: { type: 'string', enum: ['low', 'medium', 'high'] },
                            effort: { type: 'string', enum: ['low', 'medium', 'high'] }
                          },
                          required: ['action', 'impact', 'effort']
                        }
                      }
                    },
                    required: ['title', 'description', 'metric_type', 'metric_value', 'metric_unit', 'trend', 'confidence', 'recommendations'],
                    additionalProperties: false
                  }
                }
              },
              required: ['insights'],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'generate_insights' } }
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[INSIGHTS] AI gateway error ${response.status} for workspace ${workspaceId}`);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limits exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add funds to your workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    const insightsData = toolCall ? JSON.parse(toolCall.function.arguments) : { insights: [] };

    // VALIDATION: Limit insights per generation
    if (insightsData.insights.length > 10) {
      console.warn(`[ABUSE ALERT] AI returned ${insightsData.insights.length} insights, limiting to 10`);
      insightsData.insights = insightsData.insights.slice(0, 10);
    }

    // Store insights in database with REQUIRED workspace_id
    const insightRecords = insightsData.insights.map((insight: any) => ({
      workspace_id: workspaceId,
      context_type: 'workspace',
      context_id: workspaceId,
      insight_type: insight.metric_type,
      title: insight.title,
      description: insight.description,
      metric_value: insight.metric_value,
      metric_unit: insight.metric_unit,
      trend: insight.trend,
      trend_percentage: insight.trend_percentage || 0,
      confidence_score: insight.confidence,
      recommendations: insight.recommendations || [],
      is_read: false,
      content: insight,
      model_used: 'google/gemini-2.5-flash',
    }));

    if (insightRecords.length > 0) {
      const { error: insertError } = await supabase.from('agent_insights').insert(insightRecords);
      if (insertError) {
        console.error('[INSIGHTS] Insert error:', insertError);
        throw new Error('Failed to store insights');
      }
      console.log(`[INSIGHTS] Successfully generated ${insightRecords.length} insights for workspace ${workspaceId}`);
    }

    return new Response(
      JSON.stringify({ success: true, insights: insightsData.insights }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // ERROR HANDLING: Distinguish between timeout, network, and logic errors
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[INSIGHTS] Request timeout');
      return new Response(
        JSON.stringify({ error: 'Request timeout. Please try again.' }),
        { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.error('[INSIGHTS] Generation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
