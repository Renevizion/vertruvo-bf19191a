// Public endpoint: validates a one-shot approval token from an email/SMS link
// and immediately publishes the associated suggestion via post-social-media.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APP_URL = Deno.env.get('APP_URL') || 'https://kiruvo.com';

function htmlPage(title: string, body: string, ok = true) {
  const color = ok ? '#059669' : '#dc2626';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
  <style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px}
  .card{background:#fff;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.08);max-width:480px;width:100%;padding:40px;text-align:center}
  h1{color:${color};margin:0 0 12px;font-size:24px}p{color:#475569;line-height:1.6;margin:0 0 24px}
  a{display:inline-block;background:#059669;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600}
  </style></head><body><div class="card"><h1>${title}</h1>${body}<a href="${APP_URL}/social">Open Kiruvo</a></div></body></html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const token = url.searchParams.get('token') || '';
  if (!token || token.length < 20) {
    return new Response(htmlPage('Invalid link', '<p>This approval link is missing or invalid.</p>', false),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'text/html' } });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: suggestion, error } = await supabase
    .from('social_post_suggestions')
    .select('*')
    .eq('approval_token', token)
    .maybeSingle();

  if (error || !suggestion) {
    return new Response(htmlPage('Link not found', '<p>This approval link is no longer valid.</p>', false),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'text/html' } });
  }

  if (suggestion.status === 'posted' || suggestion.status === 'approved') {
    return new Response(htmlPage('Already posted', '<p>This post has already been published.</p>'),
      { headers: { ...corsHeaders, 'Content-Type': 'text/html' } });
  }
  if (suggestion.token_expires_at && new Date(suggestion.token_expires_at) < new Date()) {
    await supabase.from('social_post_suggestions').update({ status: 'expired', approval_token: null }).eq('id', suggestion.id);
    return new Response(htmlPage('Link expired', '<p>Open Kiruvo to review and post manually.</p>', false),
      { status: 410, headers: { ...corsHeaders, 'Content-Type': 'text/html' } });
  }
  if (suggestion.status === 'dismissed') {
    return new Response(htmlPage('Dismissed', '<p>This suggestion was dismissed.</p>', false),
      { status: 410, headers: { ...corsHeaders, 'Content-Type': 'text/html' } });
  }

  // Burn the token immediately to prevent replay.
  await supabase.from('social_post_suggestions')
    .update({ approval_token: null, status: 'approved' })
    .eq('id', suggestion.id);

  // Find an account for this workspace/platform
  const { data: account } = await supabase
    .from('social_media_accounts')
    .select('id')
    .eq('user_id', suggestion.user_id)
    .eq('platform', suggestion.platform)
    .maybeSingle();

  // Fire post-social-media using service role (post function reads auth header for user)
  // Use direct insert into scheduled_posts marked due now so process-scheduled-posts handles it.
  const { error: schedErr } = await supabase.from('scheduled_posts').insert({
    user_id: suggestion.user_id,
    workspace_id: suggestion.workspace_id,
    platform: suggestion.platform,
    caption: suggestion.caption,
    images: suggestion.images,
    scheduled_at: new Date(Date.now() - 1000).toISOString(),
    status: 'pending',
  });

  if (schedErr) {
    console.error('schedule insert failed', schedErr);
    await supabase.from('social_post_suggestions')
      .update({ status: 'failed', error_message: schedErr.message }).eq('id', suggestion.id);
    return new Response(htmlPage('Could not queue post', '<p>Please open Kiruvo and try again.</p>', false),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'text/html' } });
  }

  // Try to invoke the scheduler immediately so it posts within seconds.
  try {
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/process-scheduled-posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
  } catch (e) { console.warn('immediate dispatch failed', e); }

  await supabase.from('social_post_suggestions').update({ status: 'posted' }).eq('id', suggestion.id);

  return new Response(
    htmlPage('Approved — posting now', `<p><strong>${suggestion.platform}</strong> post is queued and publishing now. You can close this tab.</p>`),
    { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
  );
});
