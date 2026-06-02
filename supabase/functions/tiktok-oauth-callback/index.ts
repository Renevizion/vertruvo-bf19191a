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
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // Contains user ID with timestamp
    const errorParam = url.searchParams.get('error');

    const APP_URL = Deno.env.get('APP_URL') || 'https://kiruvo.lovable.app';

    // Handle OAuth denial
    if (errorParam) {
      console.error('OAuth denied:', errorParam);
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${APP_URL}/social-media?error=${encodeURIComponent(errorParam)}`
        }
      });
    }

    if (!code || !state) {
      throw new Error('Missing OAuth parameters');
    }

    // Extract user ID from state (format: userId_timestamp)
    const userId = state.split('_')[0];

    const TIKTOK_CLIENT_KEY = Deno.env.get('TIKTOK_CLIENT_KEY');
    const TIKTOK_CLIENT_SECRET = Deno.env.get('TIKTOK_CLIENT_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!TIKTOK_CLIENT_KEY || !TIKTOK_CLIENT_SECRET) {
      throw new Error('TikTok credentials not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Exchange code for access token
    const tokenUrl = 'https://open.tiktokapis.com/v2/oauth/token/';
    const formData = new URLSearchParams({
      client_key: TIKTOK_CLIENT_KEY,
      client_secret: TIKTOK_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: `${SUPABASE_URL}/functions/v1/tiktok-oauth-callback`
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('TikTok token error:', error);
      throw new Error('Failed to get TikTok access token');
    }

    const tokenData = await tokenResponse.json();

    // Store tokens in database
    const { error: dbError } = await supabase
      .from('social_media_accounts')
      .upsert({
        user_id: userId,
        platform: 'tiktok',
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to save TikTok connection');
    }

    // Redirect back to app with full URL
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${APP_URL}/social-media?connected=tiktok`
      }
    });

  } catch (error) {
    console.error('Error in tiktok-oauth-callback:', error);
    const APP_URL = Deno.env.get('APP_URL') || 'https://kiruvo.lovable.app';
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${APP_URL}/social-media?error=${encodeURIComponent((error as Error).message)}`
      }
    });
  }
});
