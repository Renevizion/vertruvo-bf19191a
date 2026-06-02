// Cron-driven posting coach. Runs every 30 min.
// For each workspace with a connected social account:
// - If a scheduled post is due in <= 60 min -> upcoming nudge
// - If no posts in last 7 days -> silence nudge + draft suggestion
// - If cadence gap (no post within 7/target_per_week days) -> cadence nudge + draft suggestion
// Fans out to in-app + email + SMS based on cadence settings.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const APP_URL = Deno.env.get('APP_URL') || 'https://kiruvo.com';
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

function genToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function generateCaption(brand: string, platform: string): Promise<string> {
  if (!LOVABLE_API_KEY) return `Quick update from ${brand}! ✨`;
  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You write short, warm, on-brand social captions. 1-2 sentences, 1-2 emojis max, no hashtags spam. Plain text only.' },
          { role: 'user', content: `Write a ${platform} caption for "${brand}" that nudges followers to engage. Keep it under 220 chars.` },
        ],
      }),
    });
    const j = await res.json();
    return j?.choices?.[0]?.message?.content?.trim() || `Something fresh from ${brand} ✨`;
  } catch { return `Something fresh from ${brand} ✨`; }
}

async function generateImage(brand: string): Promise<string | null> {
  if (!LOVABLE_API_KEY) return null;
  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [{ role: 'user', content: `Beautiful, modern, on-brand square social media image for "${brand}". Warm tones, lifestyle, no text overlay.` }],
        modalities: ['image', 'text'],
      }),
    });
    const j = await res.json();
    return j?.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
  } catch { return null; }
}

async function sendEmail(supabase: any, to: string, suggestion: any, brand: string, approveUrl: string, editUrl: string, reasonLabel: string) {
  try {
    await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'social-post-suggestion',
        recipientEmail: to,
        idempotencyKey: `social-suggest-${suggestion.id}`,
        templateData: {
          brand,
          platform: suggestion.platform,
          caption: suggestion.caption,
          imageUrl: suggestion.images?.[0] || null,
          approveUrl,
          editUrl,
          reasonLabel,
        },
      },
    });
  } catch (e) { console.error('email failed', e); }
}

async function sendSms(supabase: any, workspaceId: string, to: string, text: string) {
  try {
    await supabase.functions.invoke('send-sms', {
      body: { workspace_id: workspaceId, to, body: text, kind: 'social_coach' },
    });
  } catch (e) { console.warn('sms failed (non-fatal)', e); }
}

async function fanout(supabase: any, suggestion: any, settings: any, brand: string, reasonLabel: string) {
  const approveUrl = `${SUPABASE_URL}/functions/v1/social-approve-post?token=${suggestion.approval_token}`;
  const editUrl = `${APP_URL}/social?suggestion=${suggestion.id}`;
  const channels = settings?.channels || { inapp: true, email: true, sms: false };
  const title = reasonLabel;
  const body = suggestion.caption?.slice(0, 200) || '';

  if (channels.inapp !== false) {
    await supabase.from('social_notifications').insert({
      workspace_id: suggestion.workspace_id,
      user_id: suggestion.user_id,
      kind: suggestion.reason,
      title, body, suggestion_id: suggestion.id,
    });
  }
  if (channels.email) {
    const { data: prof } = await supabase.from('profiles').select('email').eq('id', suggestion.user_id).maybeSingle();
    const email = settings?.notify_email || prof?.email;
    if (email) await sendEmail(supabase, email, suggestion, brand, approveUrl, editUrl, reasonLabel);
  }
  if (channels.sms && settings?.notify_phone) {
    const short = `Kiruvo: ${reasonLabel}. Approve & post: ${approveUrl}`;
    await sendSms(supabase, suggestion.workspace_id, settings.notify_phone, short);
  }
  await supabase.from('social_cadence_settings').update({ last_nudge_at: new Date().toISOString() }).eq('workspace_id', suggestion.workspace_id);
}

async function createSuggestion(supabase: any, workspaceId: string, userId: string, platform: string, brand: string, reason: string) {
  const caption = await generateCaption(brand, platform);
  const image = await generateImage(brand);
  const token = genToken();
  const { data, error } = await supabase.from('social_post_suggestions').insert({
    workspace_id: workspaceId,
    user_id: userId,
    platform,
    caption,
    images: image ? [image] : [],
    reason,
    status: 'pending',
    approval_token: token,
    token_expires_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
  }).select('*').single();
  if (error) { console.error('insert suggestion', error); return null; }
  return data;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  // 1) Find workspaces with a connected Instagram (extendable to TikTok later)
  const { data: accounts } = await supabase
    .from('social_media_accounts')
    .select('id, user_id, platform, username')
    .eq('platform', 'instagram');

  const seen = new Set<string>();
  const targets: Array<{ workspaceId: string; userId: string; platform: string; username: string | null }> = [];
  for (const a of accounts || []) {
    const { data: ws } = await supabase.from('workspaces').select('id, name').eq('owner_id', a.user_id).maybeSingle();
    if (!ws) continue;
    const key = `${ws.id}:${a.platform}`;
    if (seen.has(key)) continue;
    seen.add(key);
    targets.push({ workspaceId: ws.id, userId: a.user_id, platform: a.platform, username: a.username });
  }

  const summary: any[] = [];

  for (const t of targets) {
    const { data: ws } = await supabase.from('workspaces').select('name').eq('id', t.workspaceId).maybeSingle();
    const brand = ws?.name || t.username || 'your brand';

    // Settings (create default if missing)
    let { data: settings } = await supabase.from('social_cadence_settings').select('*').eq('workspace_id', t.workspaceId).maybeSingle();
    if (!settings) {
      const ins = await supabase.from('social_cadence_settings').insert({ workspace_id: t.workspaceId }).select('*').single();
      settings = ins.data;
    }

    // Throttle: skip if we nudged within the last 4 hours.
    if (settings?.last_nudge_at && (Date.now() - new Date(settings.last_nudge_at).getTime()) < 4 * 3600 * 1000) {
      summary.push({ workspace: t.workspaceId, skipped: 'throttled' }); continue;
    }

    // Already a pending suggestion? skip generating another.
    const { data: pending } = await supabase
      .from('social_post_suggestions').select('id')
      .eq('workspace_id', t.workspaceId).eq('status', 'pending').limit(1);
    if (pending && pending.length > 0) {
      summary.push({ workspace: t.workspaceId, skipped: 'pending_exists' }); continue;
    }

    // (A) Upcoming scheduled post in next 60 min
    const soon = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const { data: upcoming } = await supabase.from('scheduled_posts').select('id, caption, images, platform, scheduled_at')
      .eq('user_id', t.userId).eq('status', 'pending').lte('scheduled_at', soon).gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true }).limit(1);
    if (upcoming && upcoming.length > 0) {
      const up = upcoming[0];
      const token = genToken();
      const { data: sug } = await supabase.from('social_post_suggestions').insert({
        workspace_id: t.workspaceId, user_id: t.userId, platform: up.platform, caption: up.caption,
        images: up.images, reason: 'upcoming', status: 'pending', approval_token: token,
        token_expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      }).select('*').single();
      if (sug) await fanout(supabase, sug, settings, brand, 'Upcoming post in under an hour');
      summary.push({ workspace: t.workspaceId, nudge: 'upcoming' }); continue;
    }

    // (B) Cadence / silence check
    const { data: lastPost } = await supabase.from('scheduled_posts').select('updated_at')
      .eq('user_id', t.userId).eq('status', 'posted').order('updated_at', { ascending: false }).limit(1);
    const lastTs = lastPost?.[0]?.updated_at ? new Date(lastPost[0].updated_at).getTime() : 0;
    const daysSince = lastTs ? Math.floor((Date.now() - lastTs) / 86400000) : 999;
    const target = settings?.target_posts_per_week || 3;
    const gapDays = Math.max(1, Math.floor(7 / target));

    if (daysSince >= 7) {
      const sug = await createSuggestion(supabase, t.workspaceId, t.userId, t.platform, brand, 'silence');
      if (sug) await fanout(supabase, sug, settings, brand, "You haven't posted in a week");
      summary.push({ workspace: t.workspaceId, nudge: 'silence' }); continue;
    }
    if (daysSince >= gapDays) {
      const sug = await createSuggestion(supabase, t.workspaceId, t.userId, t.platform, brand, 'cadence_gap');
      if (sug) await fanout(supabase, sug, settings, brand, 'Time for your next post');
      summary.push({ workspace: t.workspaceId, nudge: 'cadence_gap' }); continue;
    }
    summary.push({ workspace: t.workspaceId, skipped: 'on_track' });
  }

  // Expire stale tokens
  await supabase.from('social_post_suggestions')
    .update({ status: 'expired', approval_token: null })
    .lt('token_expires_at', new Date().toISOString())
    .eq('status', 'pending');

  return new Response(JSON.stringify({ ok: true, summary }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
