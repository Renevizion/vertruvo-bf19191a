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
    const INSTAGRAM_CLIENT_ID = Deno.env.get('INSTAGRAM_CLIENT_ID');

    if (!INSTAGRAM_CLIENT_ID) {
      throw new Error('Instagram Client ID not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get user from auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Not authenticated');

    // Use exact redirect_uri that matches Meta dashboard configuration.
    // IMPORTANT: Instagram is extremely strict about redirect_uri exact matching.
    // We standardize on the trailing-slash variant end-to-end.
    const baseUrl = SUPABASE_URL!.replace(/\/$/, '');
    const redirectUri = `${baseUrl}/functions/v1/instagram-oauth-callback/`;
    
    console.log('OAuth redirect_uri:', redirectUri);

    // Instagram Business Login scopes - match exactly what Meta dashboard shows
    // Scopes must be valid for the "Instagram API with Instagram Login" product.
    // Including unsupported scopes can cause Instagram to reject the request with
    // "Invalid Request: ... Invalid platform app".
    const scopes = [
      'instagram_business_basic',
      'instagram_business_manage_messages',
      'instagram_business_manage_comments',
      'instagram_business_content_publish',
      'instagram_business_manage_insights',
    ].join(',');

    // Carry the exact redirect_uri through `state` so the callback can reuse it verbatim
    // during the token exchange (prevents subtle redirect_uri mismatches).
    const statePayload = {
      v: 1,
      user_id: user.id,
      redirect_uri: redirectUri,
    };
    const state = btoa(JSON.stringify(statePayload));

    // Instagram OAuth (Instagram Platform / Instagram Login)
    // Business Login for Instagram uses the authorization window at:
    // https://www.instagram.com/oauth/authorize
    const oauthUrl = new URL('https://www.instagram.com/oauth/authorize');
    oauthUrl.searchParams.set('client_id', INSTAGRAM_CLIENT_ID);
    oauthUrl.searchParams.set('redirect_uri', redirectUri);
    oauthUrl.searchParams.set('response_type', 'code');
    oauthUrl.searchParams.set('scope', scopes);
    oauthUrl.searchParams.set('state', state);

    console.log('Generated Instagram OAuth URL:', oauthUrl.toString());

    return new Response(
      JSON.stringify({ 
        success: true,
        oauthUrl: oauthUrl.toString(),
        // Exposed for debugging + setup support (does not include secrets)
        redirectUri,
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
