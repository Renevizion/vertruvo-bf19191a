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
    const state = url.searchParams.get('state');
    const errorParam = url.searchParams.get('error');
    const errorReason = url.searchParams.get('error_reason');

    const APP_URL = Deno.env.get('APP_URL') || 'https://kiruvo.com';

    // Handle OAuth denial
    if (errorParam) {
      console.error('OAuth denied:', errorParam, errorReason);
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${APP_URL}/social-media?error=${encodeURIComponent(errorReason || errorParam)}`
        }
      });
    }

    if (!code || !state) {
      throw new Error('Missing OAuth parameters');
    }

    const INSTAGRAM_CLIENT_ID = Deno.env.get('INSTAGRAM_CLIENT_ID');
    const INSTAGRAM_CLIENT_SECRET = Deno.env.get('INSTAGRAM_CLIENT_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!INSTAGRAM_CLIENT_ID || !INSTAGRAM_CLIENT_SECRET) {
      throw new Error('Instagram credentials not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // `state` can be either:
    // 1) legacy: raw user id
    // 2) v1: base64(JSON) => { v: 1, user_id, redirect_uri }
    let appUserId = state;
    let redirectUriFromState: string | null = null;
    try {
      const decoded = JSON.parse(atob(state));
      if (decoded?.v === 1 && typeof decoded?.user_id === 'string') {
        appUserId = decoded.user_id;
      }
      if (decoded?.v === 1 && typeof decoded?.redirect_uri === 'string') {
        redirectUriFromState = decoded.redirect_uri;
      }
    } catch {
      // ignore: state was not base64 JSON
    }
    
    // CRITICAL: Instagram requires the redirect_uri used in the token exchange
    // to be IDENTICAL to the redirect_uri used in the OAuth dialog request.
    // NOTE: In backend functions, `req.url` is often an internal URL (http + rewritten path)
    // and will NOT match the external OAuth redirect. Always use the external functions URL.
    const baseUrl = SUPABASE_URL!.replace(/\/$/, '');
    const redirectUriBase = `${baseUrl}/functions/v1/instagram-oauth-callback`;
    const redirectUriNoSlash = redirectUriBase;
    const redirectUriWithSlash = `${redirectUriBase}/`;

    // Only accept redirect URIs we expect (prevents tampering), but allow both variants.
    const isExpectedRedirectUri = (value: string | null) =>
      value === redirectUriNoSlash || value === redirectUriWithSlash;

    // IMPORTANT: The verification code can effectively be "consumed" even if the token exchange fails.
    // Retrying a second time with a different redirect_uri frequently results in:
    // "This authorization code has been used".
    // Therefore we MUST do a single exchange using the exact redirect_uri.
    // If we cannot decode state, we default to the trailing-slash variant.
    const redirectUriForTokenExchange = isExpectedRedirectUri(redirectUriFromState)
      ? (redirectUriFromState as string)
      : redirectUriWithSlash;
    
    console.log('State redirect_uri:', redirectUriFromState);
    console.log('Token exchange redirect_uri:', redirectUriForTokenExchange);
    console.log('Received code:', code?.substring(0, 20) + '...');

    const exchangeCodeForToken = async (redirectUri: string) => {
      const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: INSTAGRAM_CLIENT_ID,
          client_secret: INSTAGRAM_CLIENT_SECRET,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          code: code,
        }).toString(),
      });

      if (!tokenResponse.ok) {
        const raw = await tokenResponse.text();
        console.error('Instagram token exchange error:', raw);

        let message = 'Failed to get Instagram access token';
        try {
          const parsed = JSON.parse(raw);
          message = parsed?.error_message || parsed?.error?.message || message;
        } catch {
          // ignore JSON parse errors
        }

        const err = new Error(message) as Error & { raw?: string };
        err.raw = raw;
        throw err;
      }

      return await tokenResponse.json();
    };

    // 1) Exchange code for Instagram access token (SINGLE attempt).
    const tokenData: any = await exchangeCodeForToken(redirectUriForTokenExchange);
    const shortLivedToken = tokenData.access_token as string;
    const userId = tokenData.user_id as string;

    if (!shortLivedToken || !userId) {
      console.error('Token response:', tokenData);
      throw new Error('Missing access token or user ID from token exchange');
    }

    console.log('Got Instagram short-lived token for user:', userId);

    // 2) Exchange for long-lived token (60 days)
    let longLivedToken = shortLivedToken;
    let expiresAt: string | null = null;
    try {
      const longLivedUrl = new URL('https://graph.instagram.com/access_token');
      longLivedUrl.searchParams.set('grant_type', 'ig_exchange_token');
      longLivedUrl.searchParams.set('client_secret', INSTAGRAM_CLIENT_SECRET);
      longLivedUrl.searchParams.set('access_token', shortLivedToken);

      const longLivedResp = await fetch(longLivedUrl.toString());
      if (longLivedResp.ok) {
        const longLivedData = await longLivedResp.json();
        if (longLivedData?.access_token) {
          longLivedToken = longLivedData.access_token;
          console.log('Exchanged for long-lived token, expires in:', longLivedData.expires_in, 'seconds');

          if (typeof longLivedData.expires_in === 'number') {
            expiresAt = new Date(Date.now() + longLivedData.expires_in * 1000).toISOString();
          }
        }
      } else {
        console.warn('Long-lived token exchange failed:', await longLivedResp.text());
      }
    } catch (e) {
      console.warn('Long-lived token exchange error:', e);
    }

    // If we didn't get expires_in from the long-lived exchange, fall back to any
    // expires_in value the initial token exchange may have provided.
    if (!expiresAt && typeof tokenData?.expires_in === 'number') {
      expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
    }

    // 3) Get app user's IG professional account id + username
    // Docs: GET https://graph.instagram.com/v24.0/me?fields=user_id,username&access_token=...
    // Note: /oauth/access_token returns an app-scoped user id; publishing/comment endpoints
    // expect the IG professional account id (user_id) returned by /me.
    const IG_GRAPH_VERSION = 'v24.0';
    let igProfessionalId: string = userId;
    let username: string | null = null;
    try {
      const meUrl = new URL(`https://graph.instagram.com/${IG_GRAPH_VERSION}/me`);
      meUrl.searchParams.set('fields', 'user_id,username');
      meUrl.searchParams.set('access_token', longLivedToken);

      const meResp = await fetch(meUrl.toString());
      if (meResp.ok) {
        const meData = await meResp.json();
        const first = Array.isArray(meData?.data) ? meData.data[0] : meData;
        if (first?.user_id) igProfessionalId = String(first.user_id);
        if (first?.username) username = String(first.username);
        console.log('Instagram /me:', { user_id: igProfessionalId, username });
      } else {
        console.warn('Instagram /me fetch failed:', await meResp.text());
      }
    } catch (e) {
      console.warn('Profile fetch error:', e);
    }

    // 4) Store connection in database
    const { error: dbError } = await supabase
      .from('social_media_accounts')
      .upsert(
        {
          user_id: appUserId,
          platform: 'instagram',
          access_token: longLivedToken,
          expires_at: expiresAt,
          user_id_platform: igProfessionalId,
          username: username,
        },
        { onConflict: 'user_id,platform' },
      );

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to save Instagram connection');
    }

    console.log('Instagram connection saved successfully for user:', appUserId);

    // Redirect back to app
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${APP_URL}/social-media?connected=instagram`
      }
    });

  } catch (error) {
    console.error('Error in instagram-oauth-callback:', error);
    const APP_URL = Deno.env.get('APP_URL') || 'https://kiruvo.com';
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${APP_URL}/social-media?error=${encodeURIComponent((error as Error).message)}`
      }
    });
  }
});
