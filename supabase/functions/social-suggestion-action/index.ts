// Authenticated actions on a suggestion (approve/edit/dismiss) from the in-app coach panel.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { verifyAuth, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const auth = await verifyAuth(req);
  if (!auth) return unauthorizedResponse(corsHeaders);

  let body: any = {};
  try { body = await req.json(); } catch {}
  const { suggestionId, action } = body as { suggestionId?: string; action?: string };
  if (!suggestionId || !action) {
    return new Response(JSON.stringify({ error: 'suggestionId and action required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: suggestion, error } = await admin
    .from('social_post_suggestions').select('*').eq('id', suggestionId).maybeSingle();
  if (error || !suggestion) {
    return new Response(JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const { data: isMember } = await admin.rpc('is_workspace_member', { _workspace_id: suggestion.workspace_id, _user_id: auth.userId });
  if (!isMember) return unauthorizedResponse(corsHeaders);

  if (action === 'dismiss') {
    await admin.from('social_post_suggestions').update({ status: 'dismissed', approval_token: null }).eq('id', suggestionId);
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  if (action === 'approve') {
    await admin.from('social_post_suggestions').update({ status: 'approved', approval_token: null }).eq('id', suggestionId);
    await admin.from('scheduled_posts').insert({
      user_id: suggestion.user_id,
      workspace_id: suggestion.workspace_id,
      platform: suggestion.platform,
      caption: suggestion.caption,
      images: suggestion.images,
      scheduled_at: new Date(Date.now() - 1000).toISOString(),
      status: 'pending',
    });
    try {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/process-scheduled-posts`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
        body: '{}',
      });
    } catch {}
    await admin.from('social_post_suggestions').update({ status: 'posted' }).eq('id', suggestionId);
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  if (action === 'edit') {
    // Caller will open composer with this suggestion's content; just mark as edited.
    await admin.from('social_post_suggestions').update({ status: 'edited' }).eq('id', suggestionId);
    return new Response(JSON.stringify({ ok: true, suggestion }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  return new Response(JSON.stringify({ error: 'unknown action' }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
