import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { integrationId } = await req.json();

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

    if (integrationError) throw integrationError;
    if (!integration.google_access_token) throw new Error('No access token');

    // Check if token is expired
    let accessToken = integration.google_access_token;
    if (integration.token_expires_at && new Date(integration.token_expires_at) <= new Date()) {
      // Refresh token
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
      const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId!,
          client_secret: clientSecret!,
          refresh_token: integration.google_refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!refreshResponse.ok) throw new Error('Failed to refresh token');
      
      const tokens = await refreshResponse.json();
      accessToken = tokens.access_token;

      // Update tokens
      await supabase
        .from('google_sheet_integrations')
        .update({
          google_access_token: accessToken,
          token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        })
        .eq('id', integrationId);
    }

    // List spreadsheets from Google Drive
    const driveResponse = await fetch(
      'https://www.googleapis.com/drive/v3/files?q=mimeType="application/vnd.google-apps.spreadsheet"&pageSize=50&fields=files(id,name,modifiedTime)',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!driveResponse.ok) {
      const errorText = await driveResponse.text();
      console.error('Drive API error:', errorText);
      throw new Error('Failed to list spreadsheets');
    }

    const driveData = await driveResponse.json();

    return new Response(
      JSON.stringify({ sheets: driveData.files }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in google-sheets-list:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
