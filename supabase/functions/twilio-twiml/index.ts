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

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

serve(async (req) => {
  try {
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioSignature = req.headers.get('X-Twilio-Signature');
    const url = new URL(req.url);
    let params: Record<string, string> = {};

    if (req.method === 'POST') {
      const formData = await req.formData();
      formData.forEach((value, key) => { params[key] = value as string; });
    } else {
      url.searchParams.forEach((value, key) => { params[key] = value; });
    }

    if (twilioAuthToken) {
      const isValid = validateTwilioSignature(twilioAuthToken, twilioSignature, req.url, params);
      if (!isValid) {
        console.error('Invalid Twilio signature');
        return new Response('Forbidden', { status: 403 });
      }
    }

    const templateId = url.searchParams.get('templateId');
    const leadId = url.searchParams.get('leadId');
    const contactId = url.searchParams.get('contactId');
    const callLogId = url.searchParams.get('callLogId');
    const broadcastText = url.searchParams.get('broadcastText');
    const gatherKeys = url.searchParams.get('gatherKeys') === '1';
    const gatherSpeech = url.searchParams.get('gatherSpeech') === '1';
    const isMachineAnswered = params['AnsweredBy']?.startsWith('machine') ?? false;

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    let message = "Hello! This is a call from your CRM system. Thank you!";

    if (broadcastText) {
      message = broadcastText;
    } else if (templateId && uuidRegex.test(templateId)) {
      const { data: template } = await supabase
        .from('call_templates')
        .select('template')
        .eq('id', templateId)
        .single();

      if (template) {
        message = template.template;
        if (leadId && uuidRegex.test(leadId)) {
          const { data: lead } = await supabase
            .from('leads').select('name, email, phone, company').eq('id', leadId).single();
          if (lead) {
            message = message
              .replace(/\{\{name\}\}/gi, lead.name || 'there')
              .replace(/\{\{email\}\}/gi, lead.email || 'your email')
              .replace(/\{\{phone\}\}/gi, lead.phone || 'your number')
              .replace(/\{\{company\}\}/gi, lead.company || 'our company');
          }
        } else if (contactId && uuidRegex.test(contactId)) {
          const { data: contact } = await supabase
            .from('contacts').select('name, email, phone, company').eq('id', contactId).single();
          if (contact) {
            message = message
              .replace(/\{\{name\}\}/gi, contact.name || 'there')
              .replace(/\{\{email\}\}/gi, contact.email || 'your email')
              .replace(/\{\{phone\}\}/gi, contact.phone || 'your number')
              .replace(/\{\{company\}\}/gi, contact.company || 'our company');
          }
        }
        message = message
          .replace(/\{\{name\}\}/gi, 'there')
          .replace(/\{\{email\}\}/gi, '')
          .replace(/\{\{phone\}\}/gi, '')
          .replace(/\{\{company\}\}/gi, 'our company');
      }
    }

    const safeMessage = escapeXml(message);

    // If campaign requests gather, wrap in <Gather> so we capture DTMF + speech
    let twiml: string;
    if ((gatherKeys || gatherSpeech) && callLogId && uuidRegex.test(callLogId)) {
      const gatherCallback = `${SUPABASE_URL}/functions/v1/twilio-gather-callback?callLogId=${callLogId}`;
      const inputAttr = gatherKeys && gatherSpeech ? 'speech dtmf'
        : gatherSpeech ? 'speech'
        : 'dtmf';

      twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="${inputAttr}" action="${gatherCallback}" method="POST" timeout="6" speechTimeout="auto" numDigits="1">
    <Say voice="alice">${safeMessage}</Say>
    <Pause length="1"/>
    <Say voice="alice">Please respond now, or press a key to continue.</Say>
  </Gather>
  <Say voice="alice">We didn't receive a response. Goodbye.</Say>
</Response>`;
    } else {
      const voicemailPause = broadcastText && isMachineAnswered ? '  <Pause length="1"/>\n' : '';
      twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
${voicemailPause}  <Say voice="alice">${safeMessage}</Say>
  <Pause length="1"/>
  <Hangup/>
</Response>`;
    }

    return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });

  } catch (error) {
    console.error('Error generating TwiML:', error);
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>We're sorry, there was an error processing this call.</Say>
</Response>`;
    return new Response(errorTwiml, { headers: { 'Content-Type': 'text/xml' } });
  }
});
