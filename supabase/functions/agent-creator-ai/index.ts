import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkUsageGate, usageLimitResponse, getWorkspaceForUser } from "../_shared/usage-gate.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Scope explanations
const SCOPE_EXPLANATIONS: Record<string, string> = {
  leads: "Access lead records - needed for lead management, qualification, or lead-related queries",
  contacts: "Access contact records - needed for customer communication or contact lookups", 
  tasks: "Access tasks - needed to create, read, or manage tasks and to-dos",
  activities: "Access activity history - needed for logging or viewing interaction history",
  forms: "Access form data - needed for form submissions or lead capture analysis",
  pipelines: "Access pipeline configuration - needed for stage management or pipeline analysis",
  opportunities: "Access opportunity/deal data - same as leads in this system",
  messages: "Access conversation messages - needed for messaging or communication history",
  emails: "Access email campaigns - needed for email marketing or campaign analysis",
  workflows: "Access workflow definitions - needed for automation management"
};

// EXTERNAL DATA SOURCES - Be honest about what's available
const KNOWN_DATA_SOURCES: Record<string, {
  has_api: boolean;
  api_type: 'public' | 'private' | 'affiliate' | 'scrape_only' | 'none';
  integration_method: string;
  requires_credentials: boolean;
  setup_notes: string;
}> = {
  // E-commerce platforms
  alibaba: { has_api: false, api_type: 'scrape_only', integration_method: 'firecrawl', requires_credentials: true, setup_notes: 'Alibaba has no public API. Use Firecrawl to scrape product pages. Rate limiting applies.' },
  amazon: { has_api: true, api_type: 'affiliate', integration_method: 'amazon_product_api', requires_credentials: true, setup_notes: 'Requires Amazon Product Advertising API credentials (affiliate account). Limited to affiliate use cases.' },
  ebay: { has_api: true, api_type: 'public', integration_method: 'ebay_api', requires_credentials: true, setup_notes: 'Requires eBay Developer API key. Free tier available.' },
  shopify: { has_api: true, api_type: 'private', integration_method: 'shopify_api', requires_credentials: true, setup_notes: 'Requires Shopify store access token. Only for stores you own/manage.' },
  stockx: { has_api: false, api_type: 'scrape_only', integration_method: 'firecrawl', requires_credentials: true, setup_notes: 'StockX has no public API. Use Firecrawl to scrape. Aggressive anti-bot measures.' },
  etsy: { has_api: true, api_type: 'public', integration_method: 'etsy_api', requires_credentials: true, setup_notes: 'Requires Etsy API key. Rate limited.' },
  
  // Search/social
  google: { has_api: true, api_type: 'public', integration_method: 'serp', requires_credentials: false, setup_notes: 'Use SERP API integration (already available). Free tier included.' },
  youtube: { has_api: true, api_type: 'public', integration_method: 'youtube_api', requires_credentials: true, setup_notes: 'Requires Google Cloud API key with YouTube Data API enabled.' },
  tiktok: { has_api: true, api_type: 'private', integration_method: 'tiktok_api', requires_credentials: true, setup_notes: 'TikTok API is invite-only for most features. Display API is public but limited.' },
  instagram: { has_api: true, api_type: 'private', integration_method: 'instagram_api', requires_credentials: true, setup_notes: 'Requires Meta Business account. Limited to business profiles you manage.' },
  twitter: { has_api: true, api_type: 'public', integration_method: 'twitter_api', requires_credentials: true, setup_notes: 'X/Twitter API v2. Free tier extremely limited, paid required for meaningful use.' },
  linkedin: { has_api: true, api_type: 'private', integration_method: 'linkedin_api', requires_credentials: true, setup_notes: 'LinkedIn API is partner-only. No public access available.' },
  reddit: { has_api: true, api_type: 'public', integration_method: 'reddit_api', requires_credentials: true, setup_notes: 'Free API available but heavily rate limited after 2023 changes.' },
  
  // Other
  craigslist: { has_api: false, api_type: 'scrape_only', integration_method: 'firecrawl', requires_credentials: true, setup_notes: 'No API. Scraping is against ToS and heavily blocked.' },
  yelp: { has_api: true, api_type: 'public', integration_method: 'yelp_api', requires_credentials: true, setup_notes: 'Yelp Fusion API. Requires API key, free tier available.' },
  zillow: { has_api: true, api_type: 'affiliate', integration_method: 'zillow_api', requires_credentials: true, setup_notes: 'Zillow API deprecated. Use Zestimate API with affiliate agreement.' },
};

// Detect data sources mentioned in user prompt
function detectDataSources(prompt: string): Array<{ name: string; info: typeof KNOWN_DATA_SOURCES[string] }> {
  const detected: Array<{ name: string; info: typeof KNOWN_DATA_SOURCES[string] }> = [];
  const lowerPrompt = prompt.toLowerCase();
  
  for (const [source, info] of Object.entries(KNOWN_DATA_SOURCES)) {
    if (lowerPrompt.includes(source)) {
      detected.push({ name: source, info });
    }
  }
  
  return detected;
}

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
    console.log(`[Agent Creator AI] Authenticated user: ${claimsData.claims.sub}`);

    // USAGE GATE: Check AI query limits
    const userId = claimsData.claims.sub as string;
    const wsId = await getWorkspaceForUser(userId);
    if (wsId) {
      const usageCheck = await checkUsageGate(wsId, 'ai_queries', userId);
      if (!usageCheck.allowed) {
        return usageLimitResponse(corsHeaders, usageCheck);
      }
    }

    const body = await req.json();
    const { prompt, context, availableIntegrations, businessContext } = body;

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Fetch available tools from database
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: existingTools } = await supabase
      .from('agent_tools')
      .select('name, display_name, description, parameters_schema')
      .eq('is_active', true);

    const availableToolsList = existingTools || [];
    const availableToolNames = availableToolsList.map(t => t.name);

    // Extract business name from context - CRITICAL for personalization
    const businessName = businessContext?.businessName || 'the business';
    const businessCategory = businessContext?.businessCategory || 'general';

    console.log('[Agent Creator AI] Processing:', prompt.substring(0, 100));
    console.log('[Agent Creator AI] Business name:', businessName);
    console.log('[Agent Creator AI] Available tools:', availableToolNames);

    // Detect external data sources in the user's prompt
    const detectedSources = detectDataSources(prompt);
    console.log('[Agent Creator AI] Detected data sources:', detectedSources.map(s => s.name));

    const toolsDescription = availableToolsList
      .map(tool => `- ${tool.name}: ${tool.description}`)
      .join('\n');

    const integrationsContext = availableIntegrations?.length 
      ? `Available integrations: ${availableIntegrations.join(', ')}\n- openai/mistral: LLM provider for agent responses\n- twilio: SMS and voice calls\n- serp: Web search API\n- google_maps: Location/places search\n- mcp: External tool server\n- custom: Custom API endpoint`
      : '';

    // Build data source reality check for the AI
    let dataSourceContext = '';
    if (detectedSources.length > 0) {
      dataSourceContext = `\n\nIMPORTANT - DETECTED EXTERNAL DATA SOURCES IN USER REQUEST:
The user mentioned these platforms. You MUST be HONEST about integration requirements:

${detectedSources.map(s => `- ${s.name.toUpperCase()}:
  * Has Public API: ${s.info.has_api ? 'Yes' : 'NO'}
  * API Type: ${s.info.api_type}
  * Integration Method: ${s.info.integration_method}
  * Requires Credentials: ${s.info.requires_credentials ? 'YES' : 'No'}
  * Reality Check: ${s.info.setup_notes}`).join('\n\n')}

For platforms WITHOUT public APIs (scrape_only), you MUST:
1. Recommend Firecrawl integration
2. Warn about rate limits and anti-bot measures
3. Include credential requirements in setup notes
4. Do NOT pretend a simple "search web" tool will work

For platforms WITH APIs but requiring credentials:
1. Clearly state what credentials are needed
2. Include this in implementation_summary
3. Do NOT suggest the agent will work out-of-box`;
    }

    const systemPrompt = `You are an AI agent configuration expert. Generate COMPLETE, production-ready configurations.

CRITICAL PERSONALIZATION REQUIREMENT:
- The user's business is called: "${businessName}"
- Business category: ${businessCategory}
- NEVER use "Kiruvo" or "Kiruvo CRM" in greetings or instructions
- ALWAYS use "${businessName}" when referring to the business
- The greeting MUST mention "${businessName}" (e.g., "Hello! Thank you for calling ${businessName}...")

CRITICAL MINDSET: NEVER say "I cannot" or "this isn't possible". ALWAYS provide a SOLUTION. If a capability doesn't exist, design how to BUILD IT.

EXISTING TOOLS (use these when they fit):
${toolsDescription}

CAPABILITY MAPPING - When user needs these, suggest the right integration/approach:
- Image Generation: integration=openai (DALL-E), huggingface (FLUX), stability, replicate
- Video Generation: integration=replicate, runway, huggingface
- Voice/Audio: integration=elevenlabs, openai (TTS)
- Email Sending: integration=resend, or use send_message tool
- SMS/Calling: integration=twilio
- Web Search: integration=serp, or use search_web tool
- AI Text: integration=openai, mistral (already available via platform)

IMPORTANT RULES:
1. If an existing tool fits the need, use it.
2. If the agent needs a capability that NO existing tool provides, RECOMMEND building it.
3. Mark recommended tools with full configuration for HOW to build them.
4. ALWAYS suggest relevant integrations that enable the capability.
5. Be solution-oriented - show users exactly what they need to build.

Generate a JSON configuration with these fields:

{
  "name": "Clear agent name",
  "type": "workflow" | "conversation" | "voice",
  "description": "2-3 sentences about what this agent does",
  "category": "general" | "sales" | "support" | "lead_management" | "automation" | "content" | "media",
  "greeting": "Initial message to users",
  "instructions": "Detailed behavioral instructions (3+ sentences)",
  
  "data_access": {
    "scopes": ["list", "of", "scopes"],
    "scope_reasoning": { "scope_name": "Why needed" },
    "read_only": true/false,
    "read_only_reasoning": "Why read-only or read-write",
    "max_records": number (50-500)
  },
  
  "behavior": {
    "mode": "assistant" | "executor" | "analyzer" | "validator" | "creator",
    "mode_reasoning": "Why this mode",
    "personality": "Personality description",
    "response_style": "concise" | "detailed" | "technical" | "friendly",
    "temperature": 0.1-1.0,
    "max_response_tokens": 200-2000,
    "custom_rules": ["rule 1", "rule 2"]
  },
  
  "tools": [
    { 
      "name": "existing_tool_name", 
      "description": "What this tool does",
      "enabled": true/false,
      "reasoning": "Why this agent needs this tool",
      "is_recommended": false,
      "exists_in_system": true
    }
  ],
  
  "recommended_tools": [
    {
      "name": "new_tool_name",
      "display_name": "New Tool Name",
      "description": "What this new tool would do",
      "reasoning": "Why this capability is needed and how it solves the user's request",
      "capability_category": "media" | "communication" | "data" | "search" | "ai" | "automation",
      "suggested_executor_type": "integration" | "edge_function" | "webhook",
      "suggested_integration": "openai" | "replicate" | "elevenlabs" | "twilio" | "resend" | "serp" | null,
      "integration_capability": "image_generation" | "video_generation" | "voice_synthesis" | "sms" | "email" | "search" | null,
      "suggested_parameters": { 
        "param_name": { "type": "string", "description": "...", "required": true }
      },
      "implementation_notes": "Brief technical notes on how this would work"
    }
  ],
  
  "use_memory": true/false,
  "memory_reasoning": "Why memory is/isn't needed",
  "memory_retention_days": 7-90,
  
  "input_schema": { "type": "text" | "json", "required_fields": [], "example": "" },
  "output_schema": { "type": "text" | "json" | "action" | "media", "format": "", "example": "" },
  
  "suggestedIntegrations": ["integration_ids"],
  "integration_reasoning": { "integration_name": "Why suggested and what capability it enables" },
  
  "implementation_summary": "1-2 sentences explaining what the user needs to do to make this agent work"
}

Available scopes: leads, contacts, tasks, activities, forms, pipelines, opportunities, messages, emails, workflows, all

${integrationsContext}
${dataSourceContext}

Available integrations for recommended_tools:
- openai: Text generation, image generation (DALL-E), embeddings, vision analysis
- mistral: Text generation (fast, cheap)
- twilio: SMS, voice calls, WhatsApp
- elevenlabs: Voice synthesis, audio generation
- huggingface: Image generation (FLUX), video, text
- replicate: Image/video generation (many models)
- stability: Stable Diffusion image generation
- resend: Email sending
- serp: Web search, image search
- google_maps: Geocoding, places, directions

Respond with ONLY valid JSON, no markdown or extra text.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2500,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    console.log('[Agent Creator AI] Raw response length:', content.length);

    // Parse the JSON response
    let agentConfig;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Process tools - mark which are existing vs recommended
        const tools = (parsed.tools || []).map((t: any) => ({
          ...t,
          is_recommended: !availableToolNames.includes(t.name),
          exists_in_system: availableToolNames.includes(t.name)
        }));
        
        // Separate existing tools and recommended new tools
        const existingToolsConfig = tools.filter((t: any) => t.exists_in_system);
        const recommendedNewTools = [
          ...tools.filter((t: any) => !t.exists_in_system),
          ...(parsed.recommended_tools || [])
        ];

        // Dedupe recommended tools by name
        const seenNames = new Set<string>();
        const uniqueRecommendedTools = recommendedNewTools.filter((t: any) => {
          if (seenNames.has(t.name)) return false;
          seenNames.add(t.name);
          return true;
        });
        
        agentConfig = {
          name: parsed.name || 'New Agent',
          type: parsed.type || 'conversation',
          description: parsed.description || '',
          category: parsed.category || 'general',
          greeting: parsed.greeting || 'Hello! How can I help you today?',
          instructions: parsed.instructions || '',
          voice: parsed.voice || 'alloy',
          
          data_access: {
            scopes: parsed.data_access?.scopes || ['leads', 'contacts'],
            scope_reasoning: parsed.data_access?.scope_reasoning || {},
            read_only: parsed.data_access?.read_only ?? false,
            read_only_reasoning: parsed.data_access?.read_only_reasoning || '',
            filter_by_workspace: true,
            max_records: parsed.data_access?.max_records || 100
          },
          
          behavior: {
            mode: parsed.behavior?.mode || 'assistant',
            mode_reasoning: parsed.behavior?.mode_reasoning || '',
            personality: parsed.behavior?.personality || 'Professional and helpful',
            response_style: parsed.behavior?.response_style || 'friendly',
            temperature: parsed.behavior?.temperature || 0.7,
            max_response_tokens: parsed.behavior?.max_response_tokens || 500,
            custom_rules: parsed.behavior?.custom_rules || []
          },
          
          tools: existingToolsConfig.length > 0 ? existingToolsConfig : [
            { name: 'query_data', description: 'Query workspace data', enabled: true, reasoning: 'Default tool', is_recommended: false, exists_in_system: true }
          ],
          
          recommended_tools: uniqueRecommendedTools.map((t: any) => ({
            name: t.name,
            display_name: t.display_name || t.name.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
            description: t.description,
            reasoning: t.reasoning,
            suggested_parameters: t.suggested_parameters || {},
            suggested_executor_type: t.suggested_executor_type || 'internal'
          })),
          
          use_memory: parsed.use_memory ?? true,
          memory_reasoning: parsed.memory_reasoning || '',
          memory_retention_days: parsed.memory_retention_days || 30,
          
          input_schema: {
            type: parsed.input_schema?.type || 'text',
            required_fields: parsed.input_schema?.required_fields || [],
            example: parsed.input_schema?.example || ''
          },
          output_schema: {
            type: parsed.output_schema?.type || 'text',
            format: parsed.output_schema?.format || '',
            example: parsed.output_schema?.example || ''
          },
          
          suggestedIntegrations: parsed.suggestedIntegrations || [],
          integration_reasoning: parsed.integration_reasoning || {},
        };
      } else {
        throw new Error('No JSON in response');
      }
    } catch (parseError) {
      console.error('[Agent Creator AI] Parse error:', parseError);
      agentConfig = {
        name: 'Custom Agent',
        type: 'conversation',
        description: 'AI agent based on your requirements',
        category: 'general',
        greeting: 'Hello! How can I help you?',
        instructions: content.substring(0, 500),
        voice: 'alloy',
        data_access: {
          scopes: ['leads', 'contacts'],
          scope_reasoning: { leads: 'Default access', contacts: 'Default access' },
          read_only: false,
          read_only_reasoning: 'Standard access mode',
          filter_by_workspace: true,
          max_records: 100
        },
        behavior: {
          mode: 'assistant',
          mode_reasoning: 'Default helpful mode',
          personality: 'Helpful and professional',
          response_style: 'friendly',
          temperature: 0.7,
          max_response_tokens: 500,
          custom_rules: []
        },
        tools: [
          { name: 'query_data', description: 'Query workspace data', enabled: true, reasoning: 'Default tool', is_recommended: false, exists_in_system: true }
        ],
        recommended_tools: [],
        use_memory: true,
        memory_reasoning: 'Helps maintain context',
        memory_retention_days: 30,
        input_schema: { type: 'text', required_fields: [], example: '' },
        output_schema: { type: 'text', format: '', example: '' },
        suggestedIntegrations: [],
        integration_reasoning: {},
      };
    }

    console.log('[Agent Creator AI] Generated:', agentConfig.name);
    console.log('[Agent Creator AI] Tools:', agentConfig.tools.map((t: any) => t.name));
    console.log('[Agent Creator AI] Recommended new tools:', agentConfig.recommended_tools?.map((t: any) => t.name) || []);
    console.log('[Agent Creator AI] Detected data sources:', detectedSources.map(s => s.name));

    // Add data source requirements to response
    const dataSourceRequirements = detectedSources.map(s => ({
      name: s.name,
      display_name: s.name.charAt(0).toUpperCase() + s.name.slice(1),
      has_api: s.info.has_api,
      api_type: s.info.api_type,
      integration_method: s.info.integration_method,
      requires_credentials: s.info.requires_credentials,
      setup_notes: s.info.setup_notes,
    }));

    return new Response(
      JSON.stringify({
        ...agentConfig,
        detected_data_sources: dataSourceRequirements,
        has_external_dependencies: dataSourceRequirements.length > 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Agent Creator AI] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
