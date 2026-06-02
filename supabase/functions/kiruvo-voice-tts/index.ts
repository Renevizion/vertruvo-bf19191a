import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAuth, unauthorizedResponse } from "../_shared/auth.ts";
import { checkUsageGate, usageLimitResponse, getWorkspaceForUser } from "../_shared/usage-gate.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await verifyAuth(req);
    if (!auth) return unauthorizedResponse(corsHeaders);
    console.log(`[Voice TTS] Authenticated: ${auth.userId}`);

    // USAGE GATE: Check voice session limits
    const wsId = await getWorkspaceForUser(auth.userId);
    if (wsId) {
      const usageCheck = await checkUsageGate(wsId, 'voice_sessions', auth.userId);
      if (!usageCheck.allowed) return usageLimitResponse(corsHeaders, usageCheck);
    }

    const { text, voiceId } = await req.json();
    
    if (!text || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'No text provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: 'ElevenLabs not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Default to "River" voice - warm, professional
    const selectedVoice = voiceId || 'SAz9YHcvj6GT2YYXdXww';

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.slice(0, 3000), // Cap at 3000 chars for voice
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
            speed: 1.05,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TTS] ElevenLabs error:', response.status, errorText);
      throw new Error(`TTS failed: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
      },
    });

  } catch (error) {
    console.error('[TTS] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'An error occurred generating audio. Please try again.' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
