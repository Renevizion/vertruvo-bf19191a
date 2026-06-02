import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAuth, unauthorizedResponse } from "../_shared/auth.ts";
import { checkUsageGate, usageLimitResponse } from "../_shared/usage-gate.ts";
import { resolveFromNumber } from "../_shared/sandbox-twilio.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await verifyAuth(req);
    if (!auth) return unauthorizedResponse(corsHeaders);
    console.log(`[Twilio Make Call] Authenticated: ${auth.userId}`);

    const {
      phoneNumber,
      workspaceId,
      templateId,
      contactId,
      leadId,
      agentId,
      voicemailDropId,
      voicemailText,
      objectiveId,
      objectiveText,
      gatherKeypresses,
      gatherSpeech,
    } = await req.json();
    
    if (!phoneNumber || !workspaceId) {
      throw new Error('Missing required fields');
    }

    // USAGE GATE: Check voice session limits
    const usageCheck = await checkUsageGate(workspaceId, 'voice_sessions', auth.userId);
    if (!usageCheck.allowed) return usageLimitResponse(corsHeaders, usageCheck);

    // Normalize phone number to E.164 format for Twilio
    const normalizePhoneNumber = (phone: string): string => {
      // Remove all non-numeric characters
      let cleaned = phone.replace(/\D/g, '');
      
      // If it starts with 1 and is 11 digits, it's already US format
      if (cleaned.length === 11 && cleaned.startsWith('1')) {
        return `+${cleaned}`;
      }
      
      // If it's 10 digits, assume US and add +1
      if (cleaned.length === 10) {
        return `+1${cleaned}`;
      }
      
      // If it already has a + prefix in the original, preserve it
      if (phone.startsWith('+')) {
        return `+${cleaned}`;
      }
      
      // Default: add + prefix
      return `+${cleaned}`;
    };

    // Validate US phone number format
    const isValidUSPhone = (phone: string): boolean => {
      // Valid US area codes start with 2-9
      const cleaned = phone.replace(/\D/g, '');
      if (cleaned.length === 10) {
        const areaCode = cleaned.substring(0, 3);
        return /^[2-9]\d{2}$/.test(areaCode);
      }
      if (cleaned.length === 11 && cleaned.startsWith('1')) {
        const areaCode = cleaned.substring(1, 4);
        return /^[2-9]\d{2}$/.test(areaCode);
      }
      return false;
    };

    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
    console.log(`Normalized phone: ${phoneNumber} -> ${normalizedPhoneNumber}`);

    // Validate before calling Twilio
    if (!isValidUSPhone(phoneNumber)) {
      throw new Error(`Invalid phone number: "${phoneNumber}". US phone numbers must have a valid area code (starting with 2-9) and be 10 digits. Please update the contact's phone number.`);
    }

    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio credentials not configured');
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const isVoicemailDrop = Boolean(voicemailText || voicemailDropId);

    // Resolve From number — workspace's BYO Twilio number, else platform sandbox (capped)
    const resolved = await resolveFromNumber(workspaceId, isVoicemailDrop ? "voicemail" : "call");
    if (!resolved.ok) {
      return new Response(
        JSON.stringify({ success: false, error: resolved.error, code: resolved.code, used: resolved.used, cap: resolved.cap }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const fromNumber = resolved.fromNumber;
    const isSandbox = resolved.isSandbox;
    const shouldCaptureInput = !isVoicemailDrop && Boolean(gatherKeypresses || gatherSpeech);
    let callLogId: string | null = null;

    if (voicemailText || shouldCaptureInput || objectiveId || objectiveText || voicemailDropId) {
      const { data: callLogRow, error: preLogError } = await supabase
        .from('call_logs')
        .insert({
          workspace_id: workspaceId,
          lead_id: leadId || null,
          contact_id: contactId || null,
          phone_number: phoneNumber,
          template_id: templateId || null,
          agent_id: agentId || null,
          voicemail_drop_id: voicemailDropId || null,
          objective_id: objectiveId || null,
          objective_text: objectiveText || null,
          status: 'initiated',
        })
        .select('id')
        .single();

      if (preLogError) {
        console.error('Error pre-logging call:', preLogError);
      } else {
        callLogId = callLogRow?.id || null;
      }
    }

    const twimlParams = new URLSearchParams();
    if (templateId) twimlParams.set('templateId', templateId);
    if (leadId) twimlParams.set('leadId', leadId);
    if (contactId) twimlParams.set('contactId', contactId);
    if (callLogId) twimlParams.set('callLogId', callLogId);
    if (voicemailDropId) twimlParams.set('voicemailDropId', voicemailDropId);
    if (voicemailText) twimlParams.set('broadcastText', voicemailText);
    if (!isVoicemailDrop && gatherKeypresses) twimlParams.set('gatherKeys', '1');
    if (!isVoicemailDrop && gatherSpeech) twimlParams.set('gatherSpeech', '1');

    const queryString = twimlParams.toString();
    const twimlUrl = `${SUPABASE_URL}/functions/v1/twilio-twiml${queryString ? `?${queryString}` : ''}`;

    // Status callback URL for Twilio to update call status
    const statusCallbackUrl = `${SUPABASE_URL}/functions/v1/twilio-status-callback`;

    // Make call via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;
    const twilioAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const formData = new URLSearchParams();
    formData.append('From', fromNumber);
    formData.append('To', normalizedPhoneNumber);
    formData.append('Url', twimlUrl);
    if (isVoicemailDrop) {
      formData.append('MachineDetection', 'DetectMessageEnd');
      formData.append('MachineDetectionTimeout', '30');
      formData.append('Record', 'true');
    }
    formData.append('StatusCallback', statusCallbackUrl);
    formData.append('StatusCallbackEvent', 'initiated,ringing,answered,completed');
    formData.append('StatusCallbackMethod', 'POST');

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!twilioResponse.ok) {
      const errorText = await twilioResponse.text();
      console.error('Twilio error:', errorText);
      throw new Error(`Twilio API error: ${errorText}`);
    }

    const callData = await twilioResponse.json();

    const logPayload = {
      workspace_id: workspaceId,
      lead_id: leadId || null,
      contact_id: contactId || null,
      phone_number: phoneNumber,
      template_id: templateId || null,
      agent_id: agentId || null,
      call_sid: callData.sid,
      status: callData.status,
      voicemail_drop_id: voicemailDropId || null,
      objective_id: objectiveId || null,
      objective_text: objectiveText || null,
    };

    const { error: logError } = callLogId
      ? await supabase.from('call_logs').update({ call_sid: callData.sid, status: callData.status }).eq('id', callLogId)
      : await supabase.from('call_logs').insert(logPayload);

    if (logError) {
      console.error('Error logging call:', logError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        callSid: callData.sid,
        callLogId,
        status: callData.status 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error making call:', error);
    // Return 200 with success:false for business/validation errors
    // This prevents Lovable's platform error modal from intercepting
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});