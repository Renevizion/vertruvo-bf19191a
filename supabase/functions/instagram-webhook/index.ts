import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // Webhook verification (GET request from Meta)
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    const VERIFY_TOKEN = Deno.env.get('INSTAGRAM_WEBHOOK_VERIFY_TOKEN') || 'kiruvo_instagram_webhook_2025';

    console.log('Webhook verification request:', { mode, token, challenge });

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook verified successfully');
      return new Response(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    } else {
      console.error('Webhook verification failed');
      return new Response('Forbidden', { status: 403 });
    }
  }

  // Handle webhook events (POST request from Meta)
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      console.log('Received Instagram webhook:', JSON.stringify(body, null, 2));

      const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

      // Process different webhook event types
      if (body.object === 'instagram') {
        for (const entry of body.entry || []) {
          const instagramId = entry.id;
          const time = entry.time;

          // Handle messaging events
          if (entry.messaging) {
            for (const messagingEvent of entry.messaging) {
              console.log('Messaging event:', messagingEvent);
              
              // Log the activity
              await supabase.from('activities').insert({
                type: 'instagram_message',
                title: 'Instagram Message Received',
                description: `Received message from Instagram user`,
              });
            }
          }

          // Handle comment events
          if (entry.changes) {
            for (const change of entry.changes) {
              console.log('Change event:', change);
              
              if (change.field === 'comments') {
                await supabase.from('activities').insert({
                  type: 'instagram_comment',
                  title: 'Instagram Comment',
                  description: `New comment on Instagram post`,
                });
              }

              if (change.field === 'mentions') {
                await supabase.from('activities').insert({
                  type: 'instagram_mention',
                  title: 'Instagram Mention',
                  description: `You were mentioned on Instagram`,
                });
              }
            }
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error processing webhook:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response('Method not allowed', { status: 405 });
});
