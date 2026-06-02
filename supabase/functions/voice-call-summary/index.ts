import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { call_id, recording_url } = await req.json();
    if (!call_id) {
      return new Response(JSON.stringify({ error: "call_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: "ElevenLabs not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the call log
    const { data: callLog } = await serviceClient
      .from("call_logs")
      .select("*")
      .eq("id", call_id)
      .single();

    if (!callLog) {
      return new Response(JSON.stringify({ error: "Call not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audioUrl = recording_url || callLog.recording_url;
    if (!audioUrl) {
      return new Response(JSON.stringify({ error: "No recording available for this call" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download audio
    const audioResp = await fetch(audioUrl);
    if (!audioResp.ok) {
      return new Response(JSON.stringify({ error: "Failed to download recording" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audioBlob = await audioResp.blob();

    // Transcribe with ElevenLabs Scribe
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.mp3");
    formData.append("model_id", "scribe_v2");
    formData.append("diarize", "true");
    formData.append("tag_audio_events", "false");

    const transcribeResp = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": ELEVENLABS_API_KEY },
      body: formData,
    });

    if (!transcribeResp.ok) {
      const errText = await transcribeResp.text();
      console.error("Transcription failed:", errText);
      return new Response(JSON.stringify({ error: "Transcription failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const transcription = await transcribeResp.json();
    const transcript = transcription.text || "";

    // Summarize with Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let summary = "";

    if (LOVABLE_API_KEY && transcript) {
      try {
        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: "You are a call summary assistant. Summarize the following phone call transcript in 2-4 bullet points. Focus on: key topics discussed, action items, decisions made, and next steps. Be concise."
              },
              { role: "user", content: `Call transcript:\n\n${transcript}` }
            ],
            max_tokens: 500,
          }),
        });

        if (aiResp.ok) {
          const aiData = await aiResp.json();
          summary = aiData.choices?.[0]?.message?.content || "";
        }
      } catch (e) {
        console.error("AI summary error:", e);
      }
    }

    // Update call log with transcript and summary
    await serviceClient
      .from("call_logs")
      .update({ transcript, summary })
      .eq("id", call_id);

    return new Response(
      JSON.stringify({ transcript, summary, call_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[CALL-SUMMARY] Error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred generating the call summary" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
