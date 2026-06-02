import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function decodeBase64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function parseDataUrl(dataUrl: string): { mime: string; bytes: Uint8Array; ext: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!match) throw new Error('Invalid image data URL');
  const mime = match[1];
  const b64 = match[2];
  const ext = mime.split('/')[1] || 'png';
  return { mime, bytes: decodeBase64ToBytes(b64), ext };
}

async function ensurePublicImageUrl(opts: {
  supabase: any;
  bucket: string;
  userId: string;
  imageUrl: string;
}): Promise<string> {
  const { supabase, bucket, userId, imageUrl } = opts;

  if (!imageUrl.startsWith('data:')) return imageUrl;

  const { mime, bytes, ext } = parseDataUrl(imageUrl);
  const path = `social-media/${userId}/${crypto.randomUUID()}.${ext}`;

  // Convert to ArrayBuffer (avoids BlobPart typing issues in Deno)
  const body = (bytes.buffer as ArrayBuffer).slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, body, {
      contentType: mime,
      upsert: true,
    });

  if (uploadError) {
    console.error('Storage upload error:', uploadError);
    throw new Error('Failed to upload image for posting');
  }

  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
  if (!publicData?.publicUrl) throw new Error('Failed to generate public image URL');

  return publicData.publicUrl;
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { platform, caption, imageUrl, images, scheduledDate, productTags, accountId } = await req.json();

    if (!platform || !caption) {
      throw new Error('Platform and caption are required');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Not authenticated');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // Normalize images array
    const imageArray: string[] = images && images.length > 0 
      ? images 
      : (imageUrl ? [imageUrl] : []);

    // Get user from auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Not authenticated');

    // If scheduling for later, save to scheduled_posts instead of posting now
    if (scheduledDate) {
      const scheduledTime = new Date(scheduledDate);
      if (scheduledTime <= new Date()) {
        throw new Error('Scheduled time must be in the future');
      }

      // Upload all images to public storage first
      const publicImages: string[] = [];
      for (const img of imageArray) {
        const publicUrl = await ensurePublicImageUrl({
          supabase,
          bucket: 'assets',
          userId: user.id,
          imageUrl: img,
        });
        publicImages.push(publicUrl);
      }

      const { data: scheduledPost, error: scheduleError } = await supabase
        .from('scheduled_posts')
        .insert({
          user_id: user.id,
          platform,
          caption,
          images: publicImages,
          scheduled_at: scheduledDate,
        })
        .select()
        .single();

      if (scheduleError) {
        console.error('Error scheduling post:', scheduleError);
        throw new Error('Failed to schedule post');
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          scheduled: true,
          message: `Post scheduled for ${scheduledTime.toLocaleString()}`,
          scheduledPost
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get social media account credentials — support multi-account via accountId
    let accountQuery = supabase
      .from('social_media_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', platform);
    
    if (accountId) {
      accountQuery = accountQuery.eq('id', accountId);
    }
    
    const { data: account, error: accountError } = await accountQuery.limit(1).single();

    if (accountError || !account) {
      throw new Error(`${platform} account not connected. Please connect your account first.`);
    }

    let postResult;

    if (platform === 'instagram') {
      const IG_GRAPH_VERSION = 'v24.0';
      
      if (imageArray.length === 0) {
        throw new Error('Instagram requires at least one image');
      }

      // Upload all images to public storage
      const publicImages: string[] = [];
      for (const img of imageArray) {
        const publicUrl = await ensurePublicImageUrl({
          supabase,
          bucket: 'assets',
          userId: user.id,
          imageUrl: img,
        });
        publicImages.push(publicUrl);
      }

      // Helper to wait for container to be ready
      async function waitForContainer(containerId: string): Promise<void> {
        const maxAttempts = 15;
        const pollInterval = 2000;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const statusUrl = `https://graph.instagram.com/${IG_GRAPH_VERSION}/${containerId}?fields=status_code&access_token=${account.access_token}`;
          const statusResponse = await fetch(statusUrl);

          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            console.log(`Container ${containerId} status (attempt ${attempt + 1}):`, statusData.status_code);

            if (statusData.status_code === 'FINISHED') {
              return;
            } else if (statusData.status_code === 'ERROR') {
              throw new Error('Instagram failed to process the media. Please try a different image.');
            }
          }

          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }

        throw new Error('Instagram is taking too long to process the media. Please try again.');
      }

      // Helper to handle error responses
      async function handleInstagramError(response: Response, defaultMessage: string): Promise<never> {
        const raw = await response.text();
        console.error('Instagram error:', raw);

        let errorMessage = defaultMessage;
        try {
          const parsed = JSON.parse(raw);
          const msg = parsed?.error?.message;
          const code = parsed?.error?.code;

          if (code === 190) {
            try {
              await supabase
                .from('social_media_accounts')
                .update({ expires_at: new Date().toISOString() })
                .eq('user_id', user!.id)
                .eq('platform', 'instagram');
            } catch (e) {
              console.warn('Failed to mark Instagram token expired:', e);
            }
            errorMessage = 'Instagram token expired. Please reconnect your Instagram account in the Accounts tab.';
          } else if (msg) {
            errorMessage = `Instagram error: ${msg}`;
          }
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(errorMessage);
      }

      if (publicImages.length === 1) {
        // Single image post
        const containerUrl = `https://graph.instagram.com/${IG_GRAPH_VERSION}/${account.user_id_platform}/media`;
        const containerParams = new URLSearchParams({
          image_url: publicImages[0],
          caption,
          access_token: account.access_token,
        });

        const containerResponse = await fetch(containerUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: containerParams.toString(),
        });

        if (!containerResponse.ok) {
          await handleInstagramError(containerResponse, 'Failed to create Instagram post');
        }

        const containerData = await containerResponse.json();
        await waitForContainer(containerData.id);

        // Publish
        const publishUrl = `https://graph.instagram.com/${IG_GRAPH_VERSION}/${account.user_id_platform}/media_publish`;
        const publishParams = new URLSearchParams({
          creation_id: containerData.id,
          access_token: account.access_token,
        });

        const publishResponse = await fetch(publishUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: publishParams.toString(),
        });

        if (!publishResponse.ok) {
          await handleInstagramError(publishResponse, 'Failed to publish Instagram post');
        }

        postResult = await publishResponse.json();

      } else {
        // Carousel post (multiple images)
        console.log(`Creating carousel with ${publicImages.length} images`);
        const childContainerIds: string[] = [];

        // Create child containers for each image
        for (const imageUrl of publicImages) {
          const containerUrl = `https://graph.instagram.com/${IG_GRAPH_VERSION}/${account.user_id_platform}/media`;
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
            await handleInstagramError(response, 'Failed to create carousel item');
          }

          const data = await response.json();
          childContainerIds.push(data.id);
          await waitForContainer(data.id);
        }

        // Create carousel container
        const carouselUrl = `https://graph.instagram.com/${IG_GRAPH_VERSION}/${account.user_id_platform}/media`;
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
          await handleInstagramError(carouselResponse, 'Failed to create carousel');
        }

        const carouselData = await carouselResponse.json();
        await waitForContainer(carouselData.id);

        // Publish carousel
        const publishUrl = `https://graph.instagram.com/${IG_GRAPH_VERSION}/${account.user_id_platform}/media_publish`;
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
          await handleInstagramError(publishResponse, 'Failed to publish carousel');
        }

        postResult = await publishResponse.json();
      }

      // Apply product tags if provided
      if (productTags && productTags.length > 0 && postResult?.id) {
        try {
          const tagUrl = `https://graph.instagram.com/${IG_GRAPH_VERSION}/${postResult.id}/product_tags`;
          const tagParams = new URLSearchParams({
            product_tags: JSON.stringify(productTags.map((tag: any) => ({
              product_id: tag.productId,
              x: tag.x || 0.5,
              y: tag.y || 0.5
            }))),
            access_token: account.access_token,
          });

          await fetch(tagUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: tagParams.toString(),
          });
        } catch (tagError) {
          console.warn('Error applying product tags:', tagError);
        }
      }
    } else if (platform === 'tiktok') {
      // Post to TikTok using Content Posting API
      
      if (!imageUrl) {
        throw new Error('TikTok requires video or image content');
      }

      const tiktokUrl = 'https://open.tiktokapis.com/v2/post/publish/inbox/video/init/';
      
      const tiktokBody = {
        post_info: {
          title: caption,
          privacy_level: 'SELF_ONLY', // Change as needed
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
          video_cover_timestamp_ms: 1000
        },
        source_info: {
          source: 'FILE_UPLOAD',
          video_url: imageUrl
        }
      };

      const tiktokResponse = await fetch(tiktokUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${account.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tiktokBody)
      });

      if (!tiktokResponse.ok) {
        const error = await tiktokResponse.text();
        console.error('TikTok post error:', error);
        throw new Error('Failed to post to TikTok');
      }

      postResult = await tiktokResponse.json();
    }

    // Log activity
    await supabase.from('activities').insert({
      workspace_id: user.id,
      type: 'social_post',
      title: `Posted to ${platform}`,
      description: caption
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Successfully posted to ${platform}`,
        result: postResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error posting to social media:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
