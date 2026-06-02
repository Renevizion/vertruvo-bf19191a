import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { leadId, customPrompt, dryRun, emailBody: providedBody, angle } = await req.json();
    if (!leadId) {
      return new Response(JSON.stringify({ error: 'leadId required' }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the user is authenticated
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch lead
    const { data: lead, error: leadError } = await supabaseClient
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();
    if (leadError || !lead) {
      return new Response(JSON.stringify({ error: 'Lead not found' }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!lead.email) {
      return new Response(JSON.stringify({ error: 'Lead has no email address' }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch business settings
    const { data: bizSettings } = await supabaseClient
      .from('business_settings')
      .select('business_name')
      .eq('workspace_id', lead.workspace_id)
      .maybeSingle();
    const businessName = bizSettings?.business_name || 'Our Team';

    // Fetch available services/items
    const { data: items } = await supabaseClient
      .from('items')
      .select('title, description, price, item_type, duration_minutes')
      .eq('workspace_id', lead.workspace_id)
      .eq('is_active', true)
      .limit(20);

    let servicesContext = '';
    if (items && items.length > 0) {
      const itemList = items.map(i => {
        let line = `- ${i.title} (${i.item_type})`;
        if (i.price) line += ` — $${i.price}`;
        if (i.duration_minutes) line += `, ${i.duration_minutes} min`;
        if (i.description) line += `: ${i.description.substring(0, 120)}`;
        return line;
      }).join('\n');
      servicesContext = `\n\nAvailable services/programs offered by "${businessName}":\n${itemList}\n\nNaturally recommend 1-2 relevant services based on the lead's context. Don't list everything.`;
    }

    // Fetch recent activities for context
    const { data: recentActivities } = await supabaseClient
      .from('activities')
      .select('type, title, description, created_at')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(5);

    let activityContext = '';
    if (recentActivities && recentActivities.length > 0) {
      activityContext = `\n\nRecent history with this lead:\n${recentActivities.map(a => `- ${a.title || a.type} (${new Date(a.created_at).toLocaleDateString()})`).join('\n')}`;
    }

    const angleHint = angle === 'shorter' ? 'Make it noticeably shorter (1-2 sentences).'
      : angle === 'friendlier' ? 'Make the tone warmer and more conversational.'
      : angle === 'objection' ? 'Anticipate and gently address a common hesitation.'
      : '';
    const systemPrompt = `You are writing a personalized outreach email body on behalf of "${businessName}".
${customPrompt ? `Special instructions: ${customPrompt}` : 'Write a friendly follow-up email to re-engage this lead.'}
${angleHint}

Rules:
- Write ONLY the email body (no subject, no "Hi Name" greeting — handled by template)
- Keep it 2-4 sentences. Warm, professional, not pushy.
- Do NOT include sign-off or signature (handled by template)
- Do NOT include unsubscribe text
- Reference their previous interaction naturally if context is available${servicesContext}${activityContext}`;

    const userMessage = `Lead: ${lead.name} (${lead.email})
Company: ${lead.company || 'N/A'}
Source: ${lead.source || 'Unknown'}
Notes: ${lead.notes || 'None'}

Write the email body:`;

    let emailBody = (typeof providedBody === 'string' && providedBody.trim()) ? providedBody.trim() : '';

    if (!emailBody) {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          max_tokens: 300,
        }),
      });

      if (!aiResponse.ok) {
        const status = aiResponse.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later.' }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits in Settings.' }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: 'AI generation failed' }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await aiResponse.json();
      emailBody = result.choices?.[0]?.message?.content || '';

      if (!emailBody) {
        return new Response(JSON.stringify({ error: 'AI returned empty response' }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Dry-run: return draft only, do not send.
    if (dryRun) {
      return new Response(JSON.stringify({ success: true, draft: true, emailBody }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send the email
    await supabaseClient.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'form-auto-response',
        recipientEmail: lead.email,
        idempotencyKey: `ai-outreach-${leadId}-${Date.now()}`,
        templateData: {
          recipientName: lead.name || '',
          businessName,
          formName: 'Follow-up',
          customMessage: emailBody,
        },
      },
    });

    // Log the outreach as an activity
    await supabaseClient.from('activities').insert({
      lead_id: leadId,
      workspace_id: lead.workspace_id,
      type: 'email',
      title: 'AI outreach sent',
      description: JSON.stringify({
        message: `AI-crafted outreach sent to ${lead.email}`,
        email_body: emailBody,
        recipient: lead.email,
        responded_at: new Date().toISOString(),
      }),
    });

    return new Response(JSON.stringify({ success: true, emailBody }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-lead-outreach error:", e);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
