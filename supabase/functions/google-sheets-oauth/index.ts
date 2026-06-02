import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, type } = await req.json().catch(() => ({}));
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    // Get the origin from the request to redirect back after OAuth
    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('?')[0].replace(/\/$/, '');
    
    if (!clientId || !supabaseUrl) {
      throw new Error('Missing Google OAuth configuration');
    }

    // Extract project ID from Supabase URL
    // Format: https://PROJECT_ID.supabase.co
    const projectId = supabaseUrl.split('//')[1].split('.')[0];

    // Construct the callback URL
    const redirectUri = `https://${projectId}.supabase.co/functions/v1/google-sheets-callback`;
    
    // Google OAuth URL with required scopes (Sheets + full Drive for watch API)
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive');
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent');
    
    // Include userId, type, and origin in state for the callback
    const state = JSON.stringify({ userId, type, origin });
    authUrl.searchParams.append('state', state);

    console.log('Generated OAuth URL:', authUrl.toString());
    console.log('Redirect URI:', redirectUri);

    return new Response(
      JSON.stringify({ 
        authUrl: authUrl.toString(),
        redirectUri 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in google-sheets-oauth:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
