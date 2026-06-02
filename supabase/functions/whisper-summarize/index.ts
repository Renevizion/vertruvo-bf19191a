// Whisper mode summarizer: takes a raw transcript and returns a private summary,
// key points, action items, and sentiment. Transcript stays hidden by default.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const transcript: string = String(body?.transcript ?? "").slice(0, 60_000);
    const mode: string = body?.mode === "listening" ? "listening" : "whisper";
    const channel: string = body?.channel ?? "voice";
    const contactId: string | null = body?.contactId ?? null;
    const leadId: string | null = body?.leadId ?? null;
    const workspaceId: string | undefined = body?.workspaceId;
    const durationSeconds: number | null = body?.durationSeconds ?? null;
    const title: string | null = body?.title ?? null;

    if (!workspaceId || !transcript) {
      return new Response(JSON.stringify({ error: "workspaceId and transcript required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify membership
    const { data: member } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!member) {
      return new Response(JSON.stringify({ error: "Not a workspace member" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Lovable AI Gateway
    const apiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: `You are a private call/message assistant in ${mode} mode. Produce ONLY valid JSON: { "title": string, "summary": string (max 3 sentences), "key_points": string[] (max 5), "action_items": string[] (max 5), "sentiment": "positive"|"neutral"|"negative" }. Do not expose raw transcript content verbatim. Stay concise.` },
          { role: "user", content: `Channel: ${channel}\n\nTranscript:\n${transcript}` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, errText);
      return new Response(JSON.stringify({ error: "Summarization failed" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const raw = aiJson?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = { summary: String(raw).slice(0, 1000) }; }

    const { data: inserted, error: insertErr } = await supabase
      .from("whisper_sessions")
      .insert({
        workspace_id: workspaceId,
        user_id: user.id,
        contact_id: contactId,
        lead_id: leadId,
        mode,
        channel,
        title: parsed.title ?? title ?? "Whisper session",
        summary: parsed.summary ?? null,
        key_points: parsed.key_points ?? [],
        action_items: parsed.action_items ?? [],
        sentiment: parsed.sentiment ?? null,
        duration_seconds: durationSeconds,
        transcript,
        transcript_hidden: true,
        status: "completed",
        ended_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Insert error:", insertErr);
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Strip transcript from response
    const { transcript: _t, ...safe } = inserted as any;
    return new Response(JSON.stringify({ session: safe }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("whisper-summarize error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
