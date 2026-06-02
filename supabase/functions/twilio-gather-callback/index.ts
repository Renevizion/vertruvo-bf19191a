import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

function validateTwilioSignature(
  authToken: string,
  signature: string | null,
  url: string,
  params: Record<string, string>
): boolean {
  if (!signature || !authToken) return false;
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const key of sortedKeys) data += key + params[key];
  const computed = createHmac('sha1', authToken).update(data, 'utf-8').digest('base64');
  return computed === signature;
}

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const callLogId = url.searchParams.get('callLogId');

    const formData = await req.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => { params[key] = value as string; });

    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioSignature = req.headers.get('X-Twilio-Signature');
    if (twilioAuthToken) {
      const isValid = validateTwilioSignature(twilioAuthToken, twilioSignature, req.url, params);
      if (!isValid) {
        console.error('Invalid Twilio signature on gather callback');
        return new Response('Forbidden', { status: 403 });
      }
    }

    const digit = params['Digits'] || null;
    const speech = params['SpeechResult'] || null;
    const confidence = params['Confidence'] ? parseFloat(params['Confidence']) : null;
    const callSid = params['CallSid'];

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (callLogId && uuidRegex.test(callLogId)) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      const { data: existing } = await supabase
        .from('call_logs')
        .select('keypress_log, speech_responses')
        .eq('id', callLogId)
        .single();

      const keypressLog = (existing?.keypress_log as any[]) || [];
      const speechResponses = (existing?.speech_responses as any[]) || [];
      const ts = new Date().toISOString();

      if (digit) keypressLog.push({ digit, timestamp: ts });
      if (speech) speechResponses.push({ text: speech, confidence, timestamp: ts });

      await supabase
        .from('call_logs')
        .update({ keypress_log: keypressLog, speech_responses: speechResponses })
        .eq('id', callLogId);

      console.log('Gather captured', { callSid, digit, speech, confidence });
    }

    // Acknowledge politely and hang up; status callback will trigger objective evaluation
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you. Goodbye.</Say>
  <Hangup/>
</Response>`;
    return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
  } catch (error) {
    console.error('Gather callback error:', error);
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response><Say>Goodbye.</Say><Hangup/></Response>`;
    return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
  }
});
