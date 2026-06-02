import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Not authenticated');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const TIKTOK_CLIENT_KEY = Deno.env.get('TIKTOK_CLIENT_KEY');

    if (!TIKTOK_CLIENT_KEY) {
      throw new Error('TikTok Client Key not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get user from auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Not authenticated');

    // Build TikTok OAuth URL
    const redirectUri = `${SUPABASE_URL}/functions/v1/tiktok-oauth-callback`;
    
    // TikTok scopes for content publishing
    const scopes = [
      'user.info.basic',
      'video.publish',
      'video.upload'
    ].join(',');

    const csrfState = `${user.id}_${Date.now()}`;

    const oauthUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');
    oauthUrl.searchParams.set('client_key', TIKTOK_CLIENT_KEY);
    oauthUrl.searchParams.set('redirect_uri', redirectUri);
    oauthUrl.searchParams.set('scope', scopes);
    oauthUrl.searchParams.set('response_type', 'code');
    oauthUrl.searchParams.set('state', csrfState);

    console.log('Generated TikTok OAuth URL:', oauthUrl.toString());

    return new Response(
      JSON.stringify({ 
        success: true,
        oauthUrl: oauthUrl.toString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating OAuth URL:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
