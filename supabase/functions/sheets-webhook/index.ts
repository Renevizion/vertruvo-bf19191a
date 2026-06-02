import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sheets-webhook-secret',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Webhook triggered - incoming request');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const webhookSecret = Deno.env.get('SHEETS_WEBHOOK_SECRET');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    // Verify webhook secret if configured
    if (webhookSecret) {
      const providedSecret = req.headers.get('x-sheets-webhook-secret');
      
      if (!providedSecret) {
        console.error('Missing webhook secret header');
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Missing authentication header' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401 
          }
        );
      }
      
      if (providedSecret !== webhookSecret) {
        console.error('Invalid webhook secret provided');
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Invalid authentication' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401 
          }
        );
      }
      
      console.log('Webhook secret verified successfully');
    } else {
      console.warn('SHEETS_WEBHOOK_SECRET not configured - skipping authentication');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse the webhook payload from Google Apps Script
    const { integrationId } = await req.json();

    if (!integrationId) {
      throw new Error('Integration ID is required');
    }

    console.log('Triggering sync for integration:', integrationId);

    // Call the sync function
    const { data, error } = await supabase.functions.invoke('google-sheets-sync', {
      body: { integrationId }
    });

    if (error) {
      console.error('Sync function error:', error);
      throw error;
    }

    console.log('Sync completed:', data);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Sync triggered successfully', 
        data 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in sheets webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
