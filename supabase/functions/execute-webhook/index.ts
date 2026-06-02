import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { webhookId, payload, workflowRunId } = await req.json();

    if (!webhookId || !payload) {
      return new Response(
        JSON.stringify({ error: 'Missing webhookId or payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch webhook configuration
    const { data: webhook, error: webhookError } = await supabase
      .from('webhook_configs')
      .select('*')
      .eq('id', webhookId)
      .single();

    if (webhookError || !webhook) {
      throw new Error('Webhook not found');
    }

    if (!webhook.is_active) {
      throw new Error('Webhook is not active');
    }

    // Prepare request headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'CRM-Workflow-System/1.0',
      ...(webhook.headers || {}),
    };

    // Add HMAC signature if secret is configured
    if (webhook.secret) {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(webhook.secret);
      const messageData = encoder.encode(JSON.stringify(payload));
      
      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signature = await crypto.subtle.sign('HMAC', key, messageData);
      const signatureHex = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      headers['X-Webhook-Signature'] = signatureHex;
      headers['X-Webhook-Timestamp'] = Date.now().toString();
    }

    // Execute webhook with retry logic
    const retryConfig = webhook.retry_config || { max_retries: 3, backoff: 'exponential' };
    let lastError: Error | null = null;
    let response: Response | null = null;

    for (let attempt = 1; attempt <= retryConfig.max_retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

        response = await fetch(webhook.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        // Log successful delivery
        await supabase.from('webhook_logs').insert({
          webhook_id: webhookId,
          event_type: payload.event || 'unknown',
          payload: payload,
          response_status: response.status,
          response_body: await response.text(),
          attempt_number: attempt,
        });

        if (response.ok) {
          return new Response(
            JSON.stringify({
              success: true,
              status: response.status,
              attempt,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        lastError = error as Error;

        // Log failed attempt
        await supabase.from('webhook_logs').insert({
          webhook_id: webhookId,
          event_type: payload.event || 'unknown',
          payload: payload,
          error: lastError.message,
          attempt_number: attempt,
        });

        // Calculate backoff delay
        if (attempt < retryConfig.max_retries) {
          const delay = retryConfig.backoff === 'exponential'
            ? Math.pow(2, attempt - 1) * 1000
            : 1000;
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Webhook delivery failed after all retry attempts',
        attempts: retryConfig.max_retries,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook execution error:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred processing the webhook' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
