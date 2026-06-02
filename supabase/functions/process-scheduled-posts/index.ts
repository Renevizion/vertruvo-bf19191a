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

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Get all pending posts that are due
    const { data: pendingPosts, error: fetchError } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .limit(10);

    if (fetchError) {
      console.error('Error fetching pending posts:', fetchError);
      throw fetchError;
    }

    if (!pendingPosts || pendingPosts.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending posts to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${pendingPosts.length} scheduled posts`);

    const results = [];

    for (const post of pendingPosts) {
      try {
        // Mark as processing
        await supabase
          .from('scheduled_posts')
          .update({ status: 'processing' })
          .eq('id', post.id);

        // Get the user's social media account
        const { data: account, error: accountError } = await supabase
          .from('social_media_accounts')
          .select('*')
          .eq('user_id', post.user_id)
          .eq('platform', post.platform)
          .single();

        if (accountError || !account) {
          throw new Error(`${post.platform} account not connected`);
        }

        let postResult;

        if (post.platform === 'instagram') {
          const IG_GRAPH_VERSION = 'v24.0';
          const images = post.images || [];

          if (images.length === 0) {
            throw new Error('Instagram requires at least one image');
          }

          if (images.length === 1) {
            // Single image post
            postResult = await postSingleImage(account, images[0], post.caption, IG_GRAPH_VERSION);
          } else {
            // Carousel post
            postResult = await postCarousel(account, images, post.caption, IG_GRAPH_VERSION);
          }
        } else if (post.platform === 'tiktok') {
          // TikTok posting logic
          postResult = { message: 'TikTok scheduled posting not implemented' };
        }

        // Mark as posted
        await supabase
          .from('scheduled_posts')
          .update({ 
            status: 'posted',
            post_result: postResult,
            updated_at: new Date().toISOString()
          })
          .eq('id', post.id);

        // Log activity
        await supabase.from('activities').insert({
          workspace_id: post.workspace_id || post.user_id,
          type: 'social_post',
          title: `Scheduled post to ${post.platform}`,
          description: post.caption
        });

        results.push({ id: post.id, status: 'posted', result: postResult });

      } catch (postError: any) {
        console.error(`Error posting scheduled post ${post.id}:`, postError);
        
        // Mark as failed
        await supabase
          .from('scheduled_posts')
          .update({ 
            status: 'failed',
            error_message: postError.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', post.id);

        results.push({ id: post.id, status: 'failed', error: postError.message });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        processed: results.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing scheduled posts:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function postSingleImage(account: any, imageUrl: string, caption: string, version: string) {
  // Create media container
  const containerUrl = `https://graph.instagram.com/${version}/${account.user_id_platform}/media`;
  const containerParams = new URLSearchParams({
    image_url: imageUrl,
    caption,
    access_token: account.access_token,
  });

  const containerResponse = await fetch(containerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: containerParams.toString(),
  });

  if (!containerResponse.ok) {
    const errorText = await containerResponse.text();
    console.error('Instagram container error:', errorText);
    throw new Error('Failed to create Instagram post container');
  }

  const containerData = await containerResponse.json();
  const containerId = containerData.id;

  // Poll for container status
  await waitForContainerReady(containerId, account.access_token, version);

  // Publish
  const publishUrl = `https://graph.instagram.com/${version}/${account.user_id_platform}/media_publish`;
  const publishParams = new URLSearchParams({
    creation_id: containerId,
    access_token: account.access_token,
  });

  const publishResponse = await fetch(publishUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: publishParams.toString(),
  });

  if (!publishResponse.ok) {
    const errorText = await publishResponse.text();
    console.error('Instagram publish error:', errorText);
    throw new Error('Failed to publish Instagram post');
  }

  return await publishResponse.json();
}

async function postCarousel(account: any, images: string[], caption: string, version: string) {
  const childContainerIds: string[] = [];

  // Create child containers for each image
  for (const imageUrl of images) {
    const containerUrl = `https://graph.instagram.com/${version}/${account.user_id_platform}/media`;
    const containerParams = new URLSearchParams({
      image_url: imageUrl,
      is_carousel_item: 'true',
      access_token: account.access_token,
    });

    const response = await fetch(containerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: containerParams.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Instagram carousel item error:', errorText);
      throw new Error('Failed to create carousel item');
    }

    const data = await response.json();
    childContainerIds.push(data.id);

    // Wait for each container to be ready
    await waitForContainerReady(data.id, account.access_token, version);
  }

  // Create carousel container
  const carouselUrl = `https://graph.instagram.com/${version}/${account.user_id_platform}/media`;
  const carouselParams = new URLSearchParams({
    media_type: 'CAROUSEL',
    children: childContainerIds.join(','),
    caption,
    access_token: account.access_token,
  });

  const carouselResponse = await fetch(carouselUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: carouselParams.toString(),
  });

  if (!carouselResponse.ok) {
    const errorText = await carouselResponse.text();
    console.error('Instagram carousel container error:', errorText);
    throw new Error('Failed to create carousel container');
  }

  const carouselData = await carouselResponse.json();
  
  // Wait for carousel to be ready
  await waitForContainerReady(carouselData.id, account.access_token, version);

  // Publish carousel
  const publishUrl = `https://graph.instagram.com/${version}/${account.user_id_platform}/media_publish`;
  const publishParams = new URLSearchParams({
    creation_id: carouselData.id,
    access_token: account.access_token,
  });

  const publishResponse = await fetch(publishUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: publishParams.toString(),
  });

  if (!publishResponse.ok) {
    const errorText = await publishResponse.text();
    console.error('Instagram carousel publish error:', errorText);
    throw new Error('Failed to publish carousel');
  }

  return await publishResponse.json();
}

async function waitForContainerReady(containerId: string, accessToken: string, version: string) {
  const maxAttempts = 15;
  const pollInterval = 2000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const statusUrl = `https://graph.instagram.com/${version}/${containerId}?fields=status_code&access_token=${accessToken}`;
    const response = await fetch(statusUrl);

    if (response.ok) {
      const data = await response.json();
      console.log(`Container ${containerId} status (attempt ${attempt + 1}):`, data.status_code);

      if (data.status_code === 'FINISHED') {
        return;
      } else if (data.status_code === 'ERROR') {
        throw new Error('Instagram failed to process the media');
      }
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error('Instagram is taking too long to process the media');
}
