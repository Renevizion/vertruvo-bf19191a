import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAuth, unauthorizedResponse } from "../_shared/auth.ts";
import { checkUsageGate, usageLimitResponse, getWorkspaceForUser } from "../_shared/usage-gate.ts";

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
    console.log(`[ElevenLabs Audio] Authenticated: ${auth.userId}`);

    // USAGE GATE: Check voice session limits
    const wsId = await getWorkspaceForUser(auth.userId);
    if (wsId) {
      const usageCheck = await checkUsageGate(wsId, 'voice_sessions', auth.userId);
      if (!usageCheck.allowed) return usageLimitResponse(corsHeaders, usageCheck);
    }

    const { text, voiceId = '9BWtsMINqrJLrRacOk9x' } = await req.json(); // Default to Aria

    if (!text) {
      throw new Error('Text is required');
    }

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');

    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
    }

    // Generate speech using ElevenLabs
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs error:', errorText);
      throw new Error(`ElevenLabs API error: ${errorText}`);
    }

    // Convert audio buffer to base64
    const arrayBuffer = await response.arrayBuffer();
    const base64Audio = btoa(
      String.fromCharCode(...new Uint8Array(arrayBuffer))
    );

    return new Response(
      JSON.stringify({ 
        success: true,
        audioContent: base64Audio,
        format: 'mp3' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating audio:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});