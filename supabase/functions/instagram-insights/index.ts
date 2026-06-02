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

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Not authenticated');

    // Get user's workspace
    const { data: workspaces } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .limit(1);
    
    const workspaceId = workspaces?.[0]?.workspace_id;
    if (!workspaceId) throw new Error('No workspace found');

    // Get Instagram account
    const { data: account, error: accountError } = await supabase
      .from('social_media_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'instagram')
      .single();

    if (accountError || !account) {
      throw new Error('Instagram account not connected');
    }

    const url = new URL(req.url);
    const period = url.searchParams.get('period') || 'day';
    const metric = url.searchParams.get('metric');

    // Fetch account info
    const accountUrl = `https://graph.facebook.com/v18.0/${account.user_id_platform}?fields=id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url&access_token=${account.access_token}`;
    
    const accountResponse = await fetch(accountUrl);
    if (!accountResponse.ok) {
      const error = await accountResponse.text();
      console.error('Instagram account info error:', error);
      throw new Error('Failed to fetch account info');
    }
    
    const accountInfo = await accountResponse.json();

    // Fetch insights
    const insightMetrics = [
      'impressions',
      'reach',
      'profile_views',
      'website_clicks',
      'email_contacts',
    ].join(',');
    
    const insightsUrl = `https://graph.facebook.com/v18.0/${account.user_id_platform}/insights?metric=${insightMetrics}&period=${period}&access_token=${account.access_token}`;
    
    let insights: any[] = [];
    try {
      const insightsResponse = await fetch(insightsUrl);
      if (insightsResponse.ok) {
        const insightsData = await insightsResponse.json();
        insights = insightsData.data || [];
      }
    } catch (e) {
      console.error('Error fetching insights:', e);
    }

    // Fetch recent media with engagement
    const mediaUrl = `https://graph.facebook.com/v18.0/${account.user_id_platform}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,permalink,like_count,comments_count&limit=20&access_token=${account.access_token}`;
    
    let media: any[] = [];
    try {
      const mediaResponse = await fetch(mediaUrl);
      if (mediaResponse.ok) {
        const mediaData = await mediaResponse.json();
        media = mediaData.data || [];
      }
    } catch (e) {
      console.error('Error fetching media:', e);
    }

    // Calculate engagement metrics
    const totalLikes = media.reduce((sum: number, m: any) => sum + (m.like_count || 0), 0);
    const totalComments = media.reduce((sum: number, m: any) => sum + (m.comments_count || 0), 0);
    const avgEngagement = media.length > 0 
      ? ((totalLikes + totalComments) / media.length).toFixed(1)
      : 0;

    // Save today's snapshot
    const today = new Date().toISOString().split('T')[0];
    const insightValues: Record<string, number> = {};
    
    for (const insight of insights) {
      const value = insight.values?.[0]?.value || 0;
      insightValues[insight.name] = value;
    }

    await supabase
      .from('instagram_analytics_snapshots')
      .upsert({
        workspace_id: workspaceId,
        snapshot_date: today,
        followers_count: accountInfo.followers_count || 0,
        follows_count: accountInfo.follows_count || 0,
        media_count: accountInfo.media_count || 0,
        reach: insightValues.reach || 0,
        impressions: insightValues.impressions || 0,
        profile_views: insightValues.profile_views || 0,
        website_clicks: insightValues.website_clicks || 0,
        email_contacts: insightValues.email_contacts || 0,
      }, { onConflict: 'workspace_id,snapshot_date' });

    // Fetch historical data
    const { data: historicalData } = await supabase
      .from('instagram_analytics_snapshots')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('snapshot_date', { ascending: false })
      .limit(30);

    // Top performing posts
    const topPosts = [...media]
      .sort((a, b) => ((b.like_count || 0) + (b.comments_count || 0)) - ((a.like_count || 0) + (a.comments_count || 0)))
      .slice(0, 5);

    return new Response(
      JSON.stringify({
        success: true,
        account: accountInfo,
        insights,
        media,
        topPosts,
        historicalData: historicalData || [],
        summary: {
          followers: accountInfo.followers_count || 0,
          following: accountInfo.follows_count || 0,
          posts: accountInfo.media_count || 0,
          totalLikes,
          totalComments,
          avgEngagement,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Instagram insights error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
