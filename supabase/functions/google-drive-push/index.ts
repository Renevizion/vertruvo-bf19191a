import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-goog-channel-id, x-goog-resource-state, x-goog-resource-id, x-goog-changed',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Google Drive Push Notification Received ===');
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    
    // Log all Google-specific headers
    const channelId = req.headers.get('x-goog-channel-id');
    const resourceState = req.headers.get('x-goog-resource-state');
    const resourceId = req.headers.get('x-goog-resource-id');
    const changed = req.headers.get('x-goog-changed');
    
    console.log('Headers:', {
      channelId,
      resourceState,
      resourceId,
      changed
    });
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Only process actual changes, not sync messages
    if (resourceState !== 'update') {
      console.log(`Ignoring ${resourceState} notification (not an update)`);
      return new Response('OK', { 
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
        status: 200 
      });
    }

    // Extract integration ID from channel ID (format: sheet-watch-{integrationId}-{timestamp})
    if (!channelId || !channelId.startsWith('sheet-watch-')) {
      console.log('Invalid or missing channel ID:', channelId);
      return new Response('OK', { 
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
        status: 200 
      });
    }

    // Extract just the UUID portion (remove sheet-watch- prefix and -timestamp suffix)
    const parts = channelId.replace('sheet-watch-', '').split('-');
    const integrationId = parts.slice(0, 5).join('-'); // UUID is 5 parts (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    console.log('✓ Valid update notification for integration:', integrationId);
    console.log('Triggering sync...');

    // Call the sync function to update CRM with latest sheet data
    const { data, error } = await supabase.functions.invoke('google-sheets-sync', {
      body: { integrationId }
    });

    if (error) {
      console.error('❌ Sync function error:', error);
      throw error;
    }

    console.log('✓ Sync completed successfully!');
    console.log('Sync result:', data);

    return new Response('OK', { 
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      status: 200 
    });
  } catch (error) {
    console.error('❌ Error in google-drive-push:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Return 200 even on error to prevent Google from retrying indefinitely
    return new Response(`Error: ${errorMessage}`, { 
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      status: 200 
    });
  }
});
