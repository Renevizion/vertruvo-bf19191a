import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { z } from 'https://esm.sh/zod@3.22.4'

import { publicCorsHeaders } from "../_shared/cors-public.ts";
// Helper to parse user agent for device type and browser
function parseUserAgent(userAgent: string) {
  const ua = userAgent.toLowerCase();
  
  let deviceType = 'desktop';
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent)) {
    deviceType = 'tablet';
  } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(userAgent)) {
    deviceType = 'mobile';
  }
  
  let browser = 'unknown';
  if (ua.includes('firefox')) browser = 'firefox';
  else if (ua.includes('chrome')) browser = 'chrome';
  else if (ua.includes('safari')) browser = 'safari';
  else if (ua.includes('edge')) browser = 'edge';
  
  return { deviceType, browser };
}

// Hash IP address for privacy - GDPR compliant
async function hashIP(ip: string): Promise<string> {
  if (!ip || ip === 'unknown') return 'unknown';
  
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + '_kiruvo_salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 16); // Return first 16 chars for brevity
}

Deno.serve(async (req) => {
  const corsHeaders = publicCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const rawBody = await req.json()
    
    // Validate top-level request structure
    const requestSchema = z.object({
      formId: z.string().uuid(),
      data: z.record(z.string(), z.any()),
      variantId: z.string().uuid().nullable().optional(),
      sessionId: z.string().max(200).nullable().optional(),
      timeToSubmit: z.number().int().min(0).max(86400).nullable().optional(),
      referrer: z.string().max(2000).nullable().optional(),
    })
    
    const { formId, data: rawData, variantId, sessionId, timeToSubmit, referrer } = requestSchema.parse(rawBody)

    // Validate and sanitize form field data
    const formDataSchema = z.object({
      name: z.string().trim().min(1).max(200).optional(),
      email: z.string().trim().email().max(255).optional(),
      phone: z.string().trim().max(50).optional(),
      company: z.string().trim().max(200).optional(),
      value: z.preprocess(
        (v) => (v === '' || v === undefined || v === null) ? undefined : Number(v),
        z.number().min(0).max(999999999).optional()
      ),
      notes: z.string().trim().max(5000).optional(),
    }).catchall(z.string().max(5000))

    const data = formDataSchema.parse(rawData)
    
    const receivedAt = Date.now();
    console.log('Form submission received for form:', formId, 'at:', new Date(receivedAt).toISOString())

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get form configuration
    const { data: form, error: formError } = await supabaseClient
      .from('forms')
      .select('*')
      .eq('id', formId)
      .eq('is_active', true)
      .single()

    if (formError || !form) {
      console.error('Form not found or inactive')
      return new Response(
        JSON.stringify({ error: 'Form not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Processing form:', form.name)
    
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const { deviceType, browser } = parseUserAgent(userAgent);
    
    // Hash IP for privacy instead of storing raw IP
    const rawIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const hashedIP = await hashIP(rawIP);

    // If form has no pipeline/stage configured, find the workspace's primary pipeline
    let pipelineId = form.pipeline_id;
    let stageId = form.stage_id;

    if (!pipelineId) {
      const { data: pipelines } = await supabaseClient
        .from('pipelines')
        .select('id, name')
        .eq('workspace_id', form.workspace_id)
        .order('name');

      if (pipelines && pipelines.length > 0) {
        const salesPipeline = pipelines.find((p: any) => p.name.toLowerCase().includes('sales'));
        pipelineId = salesPipeline ? salesPipeline.id : pipelines[0].id;
      }
    }

    if (pipelineId && !stageId) {
      const { data: stages } = await supabaseClient
        .from('pipeline_stages')
        .select('id')
        .eq('pipeline_id', pipelineId)
        .order('position')
        .limit(1);

      if (stages && stages.length > 0) {
        stageId = stages[0].id;
      }
    }

    // Create lead from submission
    const leadData: any = {
      workspace_id: form.workspace_id,
      pipeline_id: pipelineId,
      stage_id: stageId,
      source: `Form: ${form.name}`,
      name: data.name || 'Unknown',
      email: data.email,
      phone: data.phone,
      company: data.company,
      value: typeof data.value === 'number' ? data.value : 0,
      notes: data.notes || '',
    }

    const { data: lead, error: leadError } = await supabaseClient
      .from('leads')
      .insert(leadData)
      .select()
      .single()

    if (leadError) {
      console.error('Error creating lead')
      return new Response(
        JSON.stringify({ error: 'Failed to create lead' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const leadCreatedAt = Date.now();
    console.log('Lead created successfully in', leadCreatedAt - receivedAt, 'ms')

    // Store submission
    const { data: submission, error: submissionError } = await supabaseClient
      .from('form_submissions')
      .insert({
        form_id: formId,
        data: data,
        lead_id: lead.id,
      })
      .select('id')
      .single()

    if (submissionError) {
      console.error('Error storing submission')
    }

    // Log "form_submitted" activity on the lead with full submission data
    await supabaseClient.from('activities').insert({
      lead_id: lead.id,
      workspace_id: form.workspace_id,
      type: 'form_submitted',
      title: `Form submitted: ${form.name}`,
      description: JSON.stringify({
        form_id: formId,
        form_name: form.name,
        submission_id: submission?.id || null,
        submission_data: data,
        referrer: rawBody.referrer || null,
        device_type: deviceType,
        browser: browser,
        submitted_at: new Date().toISOString(),
      }),
    })
    
    // Track form metrics for analytics and A/B testing
    // Using hashed IP for privacy compliance
    await supabaseClient.from('form_metrics').insert({
      form_id: formId,
      variant_id: variantId || null,
      session_id: sessionId || null,
      time_to_submit: timeToSubmit || null,
      device_type: deviceType,
      browser: browser,
      user_agent: userAgent,
      ip_address: hashedIP, // Store hashed IP instead of raw
      referrer: referrer || null,
      converted: true,
      fields_changed: data,
    });

    // Send form-submission-notify email to workspace owner (fire-and-forget)
    const { data: wsOwner } = await supabaseClient
      .from('workspaces')
      .select('owner_id')
      .eq('id', form.workspace_id)
      .single();

    if (wsOwner?.owner_id) {
      const { data: ownerProfile } = await supabaseClient
        .from('profiles')
        .select('email, first_name')
        .eq('id', wsOwner.owner_id)
        .single();

      if (ownerProfile?.email) {
        supabaseClient.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'form-submission-notify',
            recipientEmail: ownerProfile.email,
            idempotencyKey: `form-notify-${submission?.id || lead.id}`,
            templateData: {
              formName: form.name,
              submitterName: data.name || 'Unknown',
              submitterEmail: data.email || 'N/A',
            },
          },
        }).catch(() => {});
      }
    }

    // Auto-response email to the form submitter (if configured and they have an email)
    if (data.email && form.auto_response_config) {
      const arConfig = form.auto_response_config as any;
      if (arConfig.enabled) {
        // Get business name for template
        const { data: bizSettings } = await supabaseClient
          .from('business_settings')
          .select('business_name')
          .eq('workspace_id', form.workspace_id)
          .maybeSingle();
        const businessName = bizSettings?.business_name || 'Our Team';

        if (arConfig.mode === 'ai') {
          // AI-crafted response: call the AI gateway via edge function
          try {
            const aiResponse = await supabaseClient.functions.invoke('form-auto-response-ai', {
              body: {
                formName: form.name,
                submitterName: data.name || '',
                submitterEmail: data.email,
                submissionData: data,
                businessName,
                aiPrompt: arConfig.aiPrompt || '',
                aiLength: arConfig.aiLength || 'short',
                aiStrictMode: arConfig.aiStrictMode !== false,
                workspaceId: form.workspace_id,
              },
            });
            const aiMessage = aiResponse?.data?.message || '';
            if (aiMessage) {
              await supabaseClient.functions.invoke('send-transactional-email', {
                body: {
                  templateName: 'form-auto-response',
                  recipientEmail: data.email,
                  idempotencyKey: `form-ar-${submission?.id || lead.id}`,
                  templateData: {
                    recipientName: data.name || '',
                    businessName,
                    formName: form.name,
                    customMessage: aiMessage,
                  },
                },
              });
              const autoResponseTime = Date.now() - receivedAt;
              console.log(`[form-submit] AI auto-response queued in ${autoResponseTime}ms`);
              // Log auto-response activity on the lead with timing
              await supabaseClient.from('activities').insert({
                lead_id: lead.id,
                workspace_id: form.workspace_id,
                type: 'email',
                title: 'Auto-response sent (AI-crafted)',
                description: JSON.stringify({
                  message: `AI-crafted auto-response sent to ${data.email} after "${form.name}" submission`,
                  email_body: aiMessage,
                  recipient: data.email,
                  response_time_ms: autoResponseTime,
                  responded_at: new Date().toISOString(),
                }),
              });
            }
          } catch (err) {
            console.error('AI auto-response failed:', err);
          }
        } else {
          // Dynamic template mode — replace merge variables
          let message = arConfig.templateMessage || '';
          message = message.replace(/\{\{name\}\}/g, data.name || 'there');
          message = message.replace(/\{\{email\}\}/g, data.email || '');
          message = message.replace(/\{\{company\}\}/g, data.company || '');
          message = message.replace(/\{\{business_name\}\}/g, businessName);
          message = message.replace(/\{\{phone\}\}/g, data.phone || '');

          await supabaseClient.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'form-auto-response',
              recipientEmail: data.email,
              idempotencyKey: `form-ar-${submission?.id || lead.id}`,
              templateData: {
                recipientName: data.name || '',
                businessName,
                formName: form.name,
                customMessage: message,
              },
            },
          }).catch(() => {});
          const templateResponseTime = Date.now() - receivedAt;
          console.log(`[form-submit] Template auto-response queued in ${templateResponseTime}ms`);
          // Log auto-response activity on the lead with timing
          try {
            await supabaseClient.from('activities').insert({
              lead_id: lead.id,
              workspace_id: form.workspace_id,
              type: 'email',
              title: 'Auto-response sent',
              description: JSON.stringify({
                message: `Template auto-response sent to ${data.email} after "${form.name}" submission`,
                email_body: message,
                recipient: data.email,
                response_time_ms: templateResponseTime,
                responded_at: new Date().toISOString(),
              }),
            });
          } catch (_) { /* non-critical */ }
        }
      }
    }

    // Trigger workflows listening for form_submitted events
    supabaseClient.functions.invoke('workflow-trigger', {
      body: {
        triggerType: 'form_submitted',
        data: {
          workspace_id: form.workspace_id,
          form_id: formId,
          form_name: form.name,
          lead_id: lead.id,
          lead: {
            id: lead.id,
            name: data.name || 'Unknown',
            email: data.email || null,
            phone: data.phone || null,
            company: data.company || null,
            value: typeof data.value === 'number' ? data.value : 0,
            source: `Form: ${form.name}`,
          },
        },
      },
    }).catch((err: any) => console.error('[form-submit] workflow-trigger failed:', err));

    const totalTime = Date.now() - receivedAt;
    console.log(`[form-submit] Complete pipeline finished in ${totalTime}ms`);

    return new Response(
      JSON.stringify({ success: true, leadId: lead.id, responseTimeMs: totalTime }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    // Return specific message for validation errors
    if (error instanceof z.ZodError) {
      console.error('Validation error in form-submit')
      return new Response(
        JSON.stringify({ error: 'Invalid form data. Please check your inputs.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.error('Error in form-submit')
    try {
      const { logEdgeFunctionError } = await import("../_shared/server-error-logger.ts");
      await logEdgeFunctionError("form-submit", error instanceof Error ? error : new Error(String(error)));
    } catch (_) { /* never block response */ }
    return new Response(
      JSON.stringify({ error: 'An error occurred processing the form' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})