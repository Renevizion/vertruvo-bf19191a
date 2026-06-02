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
    const { phoneNumber, friendlyName } = await req.json();

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Not authenticated');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio credentials not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get user from auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Not authenticated');

    // Get user's workspace
    const { data: workspaceData, error: workspaceError } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (workspaceError) throw new Error('User workspace not found');

    const workspaceId = workspaceData.workspace_id;

    // Purchase the phone number through Twilio API
    const purchaseUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json`;
    
    const formData = new URLSearchParams({
      PhoneNumber: phoneNumber,
      ...(friendlyName && { FriendlyName: friendlyName })
    });

    const response = await fetch(purchaseUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Twilio purchase error:', error);
      throw new Error('Failed to purchase phone number');
    }

    const purchaseData = await response.json();

    // Check if this is the first phone number
    const { data: existingNumbers } = await supabase
      .from('twilio_phone_numbers')
      .select('id')
      .eq('workspace_id', workspaceId);

    const isFirstNumber = !existingNumbers || existingNumbers.length === 0;

    // Store in database
    const { data: dbNumber, error: dbError } = await supabase
      .from('twilio_phone_numbers')
      .insert({
        phone_number: phoneNumber,
        friendly_name: friendlyName || purchaseData.friendly_name,
        workspace_id: workspaceId,
        twilio_sid: purchaseData.sid,
        is_active: isFirstNumber
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to save phone number');
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        phoneNumber: dbNumber
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in twilio-purchase-number:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
