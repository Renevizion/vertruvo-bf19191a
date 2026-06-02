import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    const state = url.searchParams.get('state');

    // Parse state early to get user_id and origin
    let isOnboarding = false;
    let userId: string | null = null;
    let origin: string | null = null;
    try {
      const stateData = state ? JSON.parse(state) : {};
      isOnboarding = stateData.type === 'onboarding';
      userId = stateData.userId;
      origin = stateData.origin;
    } catch {
      isOnboarding = state === 'onboarding';
    }
    
    // Fallback to environment variable if origin not in state
    const appUrl = origin || Deno.env.get('APP_URL') || 'https://2f60aceb-57d0-45d0-94a9-7ec777384764.lovableproject.com';

    if (error) {
      console.error('OAuth error:', error);
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${appUrl}/?error=${encodeURIComponent(error)}`,
          ...corsHeaders,
        }
      });
    }

    if (!code) {
      throw new Error('No authorization code received');
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!clientId || !clientSecret || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    // Extract project ID from Supabase URL
    const projectId = supabaseUrl.split('//')[1].split('.')[0];
    const redirectUri = `https://${projectId}.supabase.co/functions/v1/google-sheets-callback`;

    console.log('📥 OAuth callback - exchanging code for tokens');

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      throw new Error('Failed to exchange authorization code for tokens');
    }

    const tokens = await tokenResponse.json();
    console.log('✓ Successfully obtained tokens');

    // Calculate token expiration
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000));

    // Store tokens in Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data, error: insertError } = await supabase
      .from('google_sheet_integrations')
      .insert({
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        is_active: true,
        user_id: userId,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to store tokens:', insertError);
      throw insertError;
    }

    console.log('✓ Integration saved:', data.id);

    // Build redirect URL with integration info
    const redirectUrl = isOnboarding
      ? `${appUrl}/?sheets_connected=true&integration_id=${data.id}&onboarding=true`
      : `${appUrl}/settings?tab=integrations&sheets_connected=true&integration_id=${data.id}`;

    console.log('↪️ Redirecting to:', redirectUrl);

    // Simple 302 redirect - no HTML, no CSP issues
    return new Response(null, {
      status: 302,
      headers: {
        'Location': redirectUrl,
        ...corsHeaders,
      },
    });

  } catch (error) {
    console.error('❌ Error in google-sheets-callback:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    // Use the origin from state or fallback
    const fallbackUrl = Deno.env.get('APP_URL') || 'https://2f60aceb-57d0-45d0-94a9-7ec777384764.lovableproject.com';
    const errorUrl = `${fallbackUrl}/?error=${encodeURIComponent(errorMessage)}`;
    
    return new Response(null, {
      status: 302,
      headers: {
        'Location': errorUrl,
        ...corsHeaders,
      }
    });
  }
});
