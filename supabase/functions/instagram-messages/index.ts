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
    let body = null;
    
    // Safely parse JSON body - handle empty bodies
    if (method === 'POST') {
      try {
        const text = await req.text();
        body = text ? JSON.parse(text) : null;
      } catch {
        body = null;
      }
    }

    // Treat GET or POST without action as fetch conversations
    if (method === 'GET' || (method === 'POST' && !body?.action)) {
      // Fetch conversations from Instagram using the Instagram Graph API
      // Instagram API with Instagram Login uses graph.instagram.com
      const conversationsUrl = `https://graph.instagram.com/v21.0/${account.user_id_platform}/conversations?fields=id,participants,updated_time&platform=instagram&access_token=${account.access_token}`;
      
      console.log('Fetching conversations for user:', account.user_id_platform);
      
      const convResponse = await fetch(conversationsUrl);
      if (!convResponse.ok) {
        const errorText = await convResponse.text();
        console.error('Instagram conversations error:', errorText);
        
        // Parse the error to give a helpful message
        let errorMessage = 'Failed to fetch conversations';
        let isFeatureUnavailable = false;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error?.code === 190) {
            errorMessage = 'Instagram token expired or invalid. Please reconnect your Instagram account with messaging permissions.';
          } else if (errorJson.error?.code === 2 || errorJson.error?.code === 10 || errorJson.error?.code === 100) {
            // Code 2: Service unavailable / endpoint not available for account type
            // Code 10/100: Permission errors
            errorMessage = 'FEATURE_UNAVAILABLE: Instagram DM access requires a Business or Creator account connected to a Facebook Page with messaging enabled.';
            isFeatureUnavailable = true;
          } else if (errorJson.error?.message) {
            errorMessage = errorJson.error.message;
          }
        } catch {
          // Keep default message
        }
        
        // Return a structured response for feature unavailable
        if (isFeatureUnavailable) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              featureUnavailable: true,
              message: 'Instagram DM access requires a Business or Creator account connected to a Facebook Page with messaging enabled.',
              conversations: []
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        throw new Error(errorMessage);
      }
      
      const convData = await convResponse.json();
      const conversations = convData.data || [];
      
      // Fetch messages for each conversation
      const conversationsWithMessages = await Promise.all(
        conversations.slice(0, 10).map(async (conv: any) => {
          const messagesUrl = `https://graph.instagram.com/v21.0/${conv.id}?fields=messages{id,message,from,created_time}&access_token=${account.access_token}`;
          
          try {
            const msgResponse = await fetch(messagesUrl);
            if (msgResponse.ok) {
              const msgData = await msgResponse.json();
              return {
                ...conv,
                messages: msgData.messages?.data || []
              };
            }
          } catch (e) {
            console.error('Error fetching messages for conversation:', e);
          }
          return { ...conv, messages: [] };
        })
      );

      // Cache messages in database
      for (const conv of conversationsWithMessages) {
        for (const msg of conv.messages) {
          const direction = msg.from?.id === account.user_id_platform ? 'outbound' : 'inbound';
          
          await supabase
            .from('instagram_messages')
            .upsert({
              workspace_id: workspaceId,
              instagram_conversation_id: conv.id,
              instagram_message_id: msg.id,
              sender_id: msg.from?.id || 'unknown',
              sender_username: msg.from?.username || msg.from?.name,
              content: msg.message,
              direction,
              message_timestamp: msg.created_time,
            }, { onConflict: 'instagram_message_id' });
        }
      }

      return new Response(
        JSON.stringify({ success: true, conversations: conversationsWithMessages }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (method === 'POST' && body?.action === 'send') {
      // Send a message reply
      const { recipientId, message } = body;
      
      if (!recipientId || !message) {
        throw new Error('recipientId and message are required');
      }

      const sendUrl = `https://graph.instagram.com/v21.0/${account.user_id_platform}/messages`;
      const sendResponse = await fetch(sendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: message },
          access_token: account.access_token,
        }),
      });

      if (!sendResponse.ok) {
        const error = await sendResponse.text();
        console.error('Instagram send message error:', error);
        throw new Error('Failed to send message');
      }

      const sendData = await sendResponse.json();

      return new Response(
        JSON.stringify({ success: true, messageId: sendData.message_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (method === 'POST' && body?.action === 'markRead') {
      const { messageIds } = body;
      
      if (messageIds?.length) {
        await supabase
          .from('instagram_messages')
          .update({ read_at: new Date().toISOString() })
          .in('instagram_message_id', messageIds);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid request');

  } catch (error) {
    console.error('Instagram messages error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
