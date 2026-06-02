/**
 * twilio-oauth-callback
 *
 * Handles the OAuth 2.0 authorization code exchange for Twilio Connect.
 * Called by Twilio after the user authorizes Kiruvo to access their account.
 *
 * Flow:
 *  1. Twilio redirects to: /twilio-oauth-callback?code=XXX&state=WORKSPACE_ID
 *  2. This function exchanges the code for access_token + account_sid
 *  3. Stores credentials in platform_config keyed by workspace_id
 *  4. Redirects back to the app's Settings/Twilio page with ?connected=true
 *
 * Environment variables required:
 *  - TWILIO_CONNECT_CLIENT_ID      (your Kiruvo app's Twilio Connect client_id)
 *  - TWILIO_CONNECT_CLIENT_SECRET  (your Kiruvo app's Twilio Connect client_secret)
 *  - APP_URL                       (e.g. https://your-kiruvo-app.lovable.app)
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLIENT_ID = Deno.env.get("TWILIO_CONNECT_CLIENT_ID") ?? "";
const CLIENT_SECRET = Deno.env.get("TWILIO_CONNECT_CLIENT_SECRET") ?? "";
const APP_URL = Deno.env.get("APP_URL") ?? "https://lovable.dev";

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const workspaceId = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const redirectBase = `${APP_URL}/settings?tab=twilio`;

  if (error) {
    console.error("[twilio-oauth] user denied or error:", error);
    return Response.redirect(`${redirectBase}&twilio_error=${encodeURIComponent(error)}`, 302);
  }

  if (!code || !workspaceId) {
    return Response.redirect(`${redirectBase}&twilio_error=missing_params`, 302);
  }

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Exchange authorization code for tokens
    const redirectUri = `${SUPABASE_URL}/functions/v1/twilio-oauth-callback`;
    const tokenResp = await fetch("https://login.twilio.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    });

    if (!tokenResp.ok) {
      const txt = await tokenResp.text();
      console.error("[twilio-oauth] token exchange failed:", txt);
      return Response.redirect(`${redirectBase}&twilio_error=token_exchange_failed`, 302);
    }

    const tokens = await tokenResp.json();
    // tokens: { access_token, refresh_token, token_type, expires_in, account_sid }
    const accountSid = tokens.account_sid ?? tokens.sub;

    if (!accountSid) {
      return Response.redirect(`${redirectBase}&twilio_error=no_account_sid`, 302);
    }

    // Fetch the account's auth token using the access token
    const accountResp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    // Store credentials securely in platform_config per workspace
    const configKey = `twilio_connect:${workspaceId}`;
    const credentialData = {
      account_sid: accountSid,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expires_at: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
      connected_at: new Date().toISOString(),
      workspace_id: workspaceId,
    };

    await admin.from("platform_config").upsert(
      {
        key: configKey,
        value: credentialData,
        description: `Twilio Connect credentials for workspace ${workspaceId}`,
      },
      { onConflict: "key" }
    );

    console.log(`[twilio-oauth] Connected workspace ${workspaceId} to Twilio account ${accountSid}`);
    // Return an HTML page that notifies the parent window and closes the popup
    return new Response(popupHtml("success", APP_URL), { headers: { "Content-Type": "text/html" } });
  } catch (err: any) {
    console.error("[twilio-oauth] unexpected error:", err);
    return new Response(popupHtml("error", APP_URL, "server_error"), { headers: { "Content-Type": "text/html" } });
  }
});

function popupHtml(status: "success" | "error", appUrl: string, error?: string): string {
  const msg = status === "success"
    ? `{ type: 'twilio_oauth_success' }`
    : `{ type: 'twilio_oauth_error', error: '${error ?? "unknown"}' }`;
  const fallback = status === "success"
    ? `${appUrl}/settings?tab=phone-numbers&twilio_connected=true`
    : `${appUrl}/settings?tab=phone-numbers&twilio_error=${error ?? "unknown"}`;
  return `<!DOCTYPE html>
<html>
<head><title>${status === "success" ? "Connected!" : "Connection failed"}</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8f9fa;}
.box{text-align:center;padding:32px;border-radius:16px;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:320px;}
.icon{font-size:48px;margin-bottom:12px;}
.title{font-size:18px;font-weight:600;margin-bottom:6px;}
.sub{font-size:13px;color:#666;}</style></head>
<body><div class="box">
  <div class="icon">${status === "success" ? "✅" : "❌"}</div>
  <div class="title">${status === "success" ? "Twilio Connected!" : "Connection Failed"}</div>
  <div class="sub">${status === "success" ? "Closing window..." : `Error: ${error ?? "unknown"}`}</div>
</div>
<script>
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(${msg}, '*');
      setTimeout(() => window.close(), 800);
    } else {
      window.location.href = '${fallback}';
    }
  } catch(e) {
    window.location.href = '${fallback}';
  }
</script></body></html>`;
}
