import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { call_log_id } = await req.json();
    if (!call_log_id) {
      return new Response(JSON.stringify({ error: "call_log_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: call } = await supabase
      .from("call_logs")
      .select("id, transcript, summary, recording_url, keypress_log, speech_responses, objective_id, objective_text, call_objectives(name, success_criteria, expected_keypresses)")
      .eq("id", call_log_id)
      .single();

    if (!call) {
      return new Response(JSON.stringify({ error: "Call not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Transcribe if we have a recording but no transcript
    let transcript = call.transcript || "";
    if (!transcript && call.recording_url) {
      const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
      if (ELEVENLABS_API_KEY) {
        try {
          const audioResp = await fetch(call.recording_url + ".mp3");
          if (audioResp.ok) {
            const audioBlob = await audioResp.blob();
            const fd = new FormData();
            fd.append("file", audioBlob, "rec.mp3");
            fd.append("model_id", "scribe_v2");
            fd.append("diarize", "true");
            const tResp = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
              method: "POST",
              headers: { "xi-api-key": ELEVENLABS_API_KEY },
              body: fd,
            });
            if (tResp.ok) {
              const tData = await tResp.json();
              transcript = tData.text || "";
            }
          }
        } catch (e) { console.error("Transcribe error:", e); }
      }
    }

    const objective = (call as any).call_objectives;
    const objectiveName = objective?.name || "Custom objective";
    const successCriteria = objective?.success_criteria || call.objective_text || "Determine if the call achieved its goal.";
    const expectedKeys = objective?.expected_keypresses || {};

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let objectiveMet: boolean | null = null;
    let reasoning = "";
    let summary = "";

    if (LOVABLE_API_KEY) {
      const userPayload = {
        objective: objectiveName,
        success_criteria: successCriteria,
        expected_keypresses: expectedKeys,
        keypresses_received: call.keypress_log || [],
        speech_responses: call.speech_responses || [],
        full_transcript: transcript,
      };

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You evaluate phone call outcomes. Decide if the call's objective was met based on transcript, keypresses, and spoken responses. Be strict but fair." },
            { role: "user", content: `Evaluate this call:\n\n${JSON.stringify(userPayload, null, 2)}` },
          ],
          tools: [{
            type: "function",
            function: {
              name: "report_outcome",
              description: "Report whether the objective was met.",
              parameters: {
                type: "object",
                properties: {
                  objective_met: { type: "boolean" },
                  reasoning: { type: "string", description: "1-2 sentences explaining the verdict." },
                  summary: { type: "string", description: "2-3 sentence call summary." },
                },
                required: ["objective_met", "reasoning", "summary"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "report_outcome" } },
        }),
      });

      if (aiResp.ok) {
        const aiData = await aiResp.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall) {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            objectiveMet = args.objective_met;
            reasoning = args.reasoning || "";
            summary = args.summary || "";
          } catch (e) { console.error("Parse tool call:", e); }
        }
      } else {
        console.error("AI eval failed:", aiResp.status, await aiResp.text());
      }
    }

    await supabase
      .from("call_logs")
      .update({
        transcript: transcript || call.transcript,
        summary: summary || call.summary,
        objective_met: objectiveMet,
        objective_reasoning: reasoning,
      })
      .eq("id", call_log_id);

    return new Response(
      JSON.stringify({ success: true, objective_met: objectiveMet, reasoning, summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[OBJECTIVE-EVAL]", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
