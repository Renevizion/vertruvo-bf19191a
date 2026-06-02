import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to refresh access token if expired
async function getValidAccessToken(integration: any, supabase: any) {
  const now = new Date();
  const expiresAt = new Date(integration.token_expires_at);
  
  // If token expires in less than 5 minutes, refresh it
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    console.log('Access token expired or expiring soon, refreshing...');
    
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        refresh_token: integration.google_refresh_token,
        grant_type: 'refresh_token',
      }),
    });
    
    if (!tokenResponse.ok) {
      throw new Error('Failed to refresh access token');
    }
    
    const tokens = await tokenResponse.json();
    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    
    // Update the database with new token
    await supabase
      .from('google_sheet_integrations')
      .update({
        google_access_token: tokens.access_token,
        token_expires_at: newExpiresAt.toISOString(),
      })
      .eq('id', integration.id);
    
    console.log('Access token refreshed successfully');
    return tokens.access_token;
  }
  
  return integration.google_access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { integrationId, sheetId } = await req.json();
    
    console.log('Registering Drive watch for integration:', integrationId, 'sheet:', sheetId);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get integration with access token
    const { data: integration, error: integrationError } = await supabase
      .from('google_sheet_integrations')
      .select('*')
      .eq('id', integrationId)
      .single();

    if (integrationError || !integration) {
      console.error('Integration error:', integrationError);
      throw new Error('Integration not found');
    }

    // Get valid access token (refresh if needed)
    const accessToken = await getValidAccessToken(integration, supabase);

    const projectId = supabaseUrl.split('//')[1].split('.')[0];
    const channelId = `sheet-watch-${integrationId}-${Date.now()}`; // Add timestamp for uniqueness
    const webhookUrl = `https://${projectId}.supabase.co/functions/v1/google-drive-push`;
    
    console.log('Registering watch with channel:', channelId);
    console.log('Webhook URL:', webhookUrl);
    
    const watchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${sheetId}/watch`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: channelId,
          type: 'web_hook',
          address: webhookUrl
        })
      }
    );

    const responseText = await watchResponse.text();
    console.log('Watch API response:', responseText);

    if (!watchResponse.ok) {
      console.error('Failed to register watch. Status:', watchResponse.status);
      console.error('Response:', responseText);
      throw new Error(`Watch registration failed (${watchResponse.status}): ${responseText}`);
    }

    const watchData = JSON.parse(responseText);
    console.log('✓ Drive watch registered successfully!');
    console.log('Watch details:', watchData);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Drive watch registered successfully - your sheet is now monitored in real-time!',
        watchData,
        channelId,
        webhookUrl
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in register-drive-watch:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        details: 'Make sure Drive API is enabled and your OAuth scopes include drive.file permission'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
