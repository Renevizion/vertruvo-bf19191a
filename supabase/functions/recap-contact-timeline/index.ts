import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface Event {
  occurred_at: string;
  source: string;
  title: string;
  summary?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { events } = (await req.json()) as { events: Event[] };
    if (!Array.isArray(events) || events.length === 0) {
      return new Response(JSON.stringify({ recap: "No history yet." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lines = events
      .slice(0, 30)
      .map((e) => `- [${new Date(e.occurred_at).toISOString().slice(0, 10)}] (${e.source}) ${e.title}${e.summary ? ` — ${e.summary}` : ""}`)
      .join("\n");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You summarize a contact's recent history into exactly 3 bullets. Plain text. Each bullet starts with '• '. No preamble. Focus on what the human needs to know before responding next." },
          { role: "user", content: `Recent history:\n${lines}` },
        ],
      }),
    });

    if (res.status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (res.status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!res.ok) throw new Error(`AI gateway error ${res.status}`);

    const json = await res.json();
    const recap = json?.choices?.[0]?.message?.content ?? "Unable to summarize.";
    return new Response(JSON.stringify({ recap }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("recap error", err);
    return new Response(JSON.stringify({ error: "Recap failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
