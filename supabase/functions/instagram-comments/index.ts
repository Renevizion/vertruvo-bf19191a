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

    const method = req.method;
    
    // Parse body safely - handle empty bodies gracefully
    let body = null;
    if (method === 'POST') {
      try {
        const text = await req.text();
        if (text && text.trim()) {
          body = JSON.parse(text);
        }
      } catch (e) {
        // Empty or invalid body - treat as a list request
        body = null;
      }
    }

    // GET or POST without action = list media & comments
    if (method === 'GET' || (method === 'POST' && !body?.action)) {
      // First, get recent media
      // IMPORTANT: Tokens obtained via Instagram Login are Instagram User access tokens.
      // These must be used against graph.instagram.com (not graph.facebook.com), otherwise
      // you'll see OAuth error 190: "Cannot parse access token".
      const IG_GRAPH_VERSION = 'v24.0';
      const mediaUrl = new URL(`https://graph.instagram.com/${IG_GRAPH_VERSION}/${account.user_id_platform}/media`);
      mediaUrl.searchParams.set('fields', 'id,caption,media_type,media_url,thumbnail_url,timestamp,permalink,comments_count');
      mediaUrl.searchParams.set('limit', '20');
      mediaUrl.searchParams.set('access_token', account.access_token);
      
      const mediaResponse = await fetch(mediaUrl.toString());
      if (!mediaResponse.ok) {
        const errorText = await mediaResponse.text();
        console.error('Instagram media error:', errorText);
        
        // Check for specific error codes
        let errorMessage = 'Failed to fetch media';
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error?.code === 190) {
            errorMessage = 'Instagram token expired. Please reconnect your Instagram account in the Accounts tab.';

            // Keep the UI accurate: mark the stored token as expired
            try {
              const { error: expireError } = await supabase
                .from('social_media_accounts')
                .update({ expires_at: new Date().toISOString() })
                .eq('user_id', user.id)
                .eq('platform', 'instagram');

              if (expireError) {
                console.warn('Failed to mark Instagram token expired:', expireError);
              }
            } catch (e) {
              console.warn('Failed to mark Instagram token expired:', e);
            }
          } else if (errorJson.error?.message) {
            errorMessage = errorJson.error.message;
          }
        } catch {
          // Not JSON, keep generic message
        }
        
        throw new Error(errorMessage);
      }
      
      const mediaData = await mediaResponse.json();
      const mediaItems = mediaData.data || [];
      
      // Fetch comments for each media item
      const mediaWithComments = await Promise.all(
        mediaItems.map(async (media: any) => {
          const commentsUrl = new URL(`https://graph.instagram.com/${IG_GRAPH_VERSION}/${media.id}/comments`);
          commentsUrl.searchParams.set('fields', 'id,text,username,timestamp,from{id,username},replies{id,text,username,timestamp}');
          commentsUrl.searchParams.set('access_token', account.access_token);
          
          try {
            const commentsResponse = await fetch(commentsUrl.toString());
            if (commentsResponse.ok) {
              const commentsData = await commentsResponse.json();
              const comments = commentsData.data || [];
              
              // Cache comments in database
              for (const comment of comments) {
                await supabase
                  .from('instagram_comments')
                  .upsert({
                    workspace_id: workspaceId,
                    media_id: media.id,
                    comment_id: comment.id,
                    content: comment.text,
                    from_id: comment.from?.id,
                    from_username: comment.from?.username || comment.username,
                    comment_timestamp: comment.timestamp,
                  }, { onConflict: 'comment_id' });
              }
              
              return { ...media, comments };
            }
          } catch (e) {
            console.error('Error fetching comments for media:', e);
          }
          return { ...media, comments: [] };
        })
      );

      return new Response(
        JSON.stringify({ success: true, media: mediaWithComments }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (method === 'POST' && body?.action === 'reply') {
      const { commentId, message } = body;
      
      if (!commentId || !message) {
        throw new Error('commentId and message are required');
      }

      const IG_GRAPH_VERSION = 'v24.0';
      const replyUrl = `https://graph.instagram.com/${IG_GRAPH_VERSION}/${commentId}/replies`;
      const replyResponse = await fetch(replyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          message,
          access_token: account.access_token,
        }).toString(),
      });

      if (!replyResponse.ok) {
        const error = await replyResponse.text();
        console.error('Instagram reply error:', error);
        throw new Error('Failed to reply to comment');
      }

      const replyData = await replyResponse.json();

      // Mark comment as replied in database
      await supabase
        .from('instagram_comments')
        .update({ replied: true })
        .eq('comment_id', commentId);

      return new Response(
        JSON.stringify({ success: true, replyId: replyData.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (method === 'POST' && body?.action === 'hide') {
      const { commentId, hide = true } = body;
      
      if (!commentId) {
        throw new Error('commentId is required');
      }

      const IG_GRAPH_VERSION = 'v24.0';
      const hideUrl = `https://graph.instagram.com/${IG_GRAPH_VERSION}/${commentId}`;
      const hideResponse = await fetch(hideUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          hide: hide.toString(),
          access_token: account.access_token,
        }).toString(),
      });

      if (!hideResponse.ok) {
        const error = await hideResponse.text();
        console.error('Instagram hide error:', error);
        throw new Error('Failed to hide comment');
      }

      // Update database
      await supabase
        .from('instagram_comments')
        .update({ hidden: hide })
        .eq('comment_id', commentId);

      return new Response(
        JSON.stringify({ success: true, hidden: hide }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (method === 'POST' && body?.action === 'delete') {
      const { commentId } = body;
      
      if (!commentId) {
        throw new Error('commentId is required');
      }

      const IG_GRAPH_VERSION = 'v24.0';
      const deleteUrl = new URL(`https://graph.instagram.com/${IG_GRAPH_VERSION}/${commentId}`);
      deleteUrl.searchParams.set('access_token', account.access_token);
      const deleteResponse = await fetch(deleteUrl.toString(), { method: 'DELETE' });

      if (!deleteResponse.ok) {
        const error = await deleteResponse.text();
        console.error('Instagram delete error:', error);
        throw new Error('Failed to delete comment');
      }

      // Remove from database
      await supabase
        .from('instagram_comments')
        .delete()
        .eq('comment_id', commentId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid request');

  } catch (error) {
    console.error('Instagram comments error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
