import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Twilio signature validation using HMAC-SHA1
function validateTwilioSignature(
  authToken: string,
  signature: string | null,
  url: string,
  params: Record<string, string>
): boolean {
  if (!signature || !authToken) return false;

  // Sort param keys and concatenate key=value pairs
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const key of sortedKeys) {
    data += key + params[key];
  }

  const computed = createHmac('sha1', authToken)
    .update(data, 'utf-8')
    .digest('base64');

  return computed === signature;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value as string;
    });

    // Validate Twilio signature
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioSignature = req.headers.get('X-Twilio-Signature');

    if (twilioAuthToken) {
      const isValid = validateTwilioSignature(
        twilioAuthToken,
        twilioSignature,
        req.url,
        params
      );

      if (!isValid) {
        console.error('Invalid Twilio signature');
        return new Response('Forbidden', { status: 403 });
      }
    }

    const callSid = params['CallSid'];
    const callStatus = params['CallStatus'];
    const callDuration = params['CallDuration'];
    const recordingUrl = params['RecordingUrl'];

    console.log('Twilio status callback:', { callSid, callStatus, callDuration });

    if (!callSid) {
      throw new Error('Missing CallSid');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Update call log with new status
    const updateData: any = {
      status: callStatus,
    };

    if (callDuration && parseInt(callDuration) > 0) {
      updateData.duration = parseInt(callDuration);
      updateData.completed_at = new Date().toISOString();
    }

    if (recordingUrl) {
      updateData.recording_url = recordingUrl;
    }

    const { data: updatedRows, error: updateError } = await supabase
      .from('call_logs')
      .update(updateData)
      .eq('call_sid', callSid)
      .select('id, broadcast_id, objective_id, objective_text');

    if (updateError) {
      console.error('Error updating call log:', updateError);
      throw updateError;
    }

    console.log('Call log updated successfully:', callSid, callStatus);

    // Trigger transcription + objective evaluation when call completes
    if (callStatus === 'completed' && updatedRows && updatedRows[0]) {
      const row = updatedRows[0];
      if (row.objective_id || row.objective_text) {
        // Fire-and-forget; do not block Twilio response
        fetch(`${SUPABASE_URL}/functions/v1/voice-objective-evaluator`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ call_log_id: row.id }),
        }).catch((e) => console.error('Failed to trigger evaluator:', e));
      }
    }

    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/xml' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in status callback:', error);
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { 
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/xml' 
        } 
      }
    );
  }
});
