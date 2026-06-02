import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";

const PlanSchema = z.object({
  channel: z.enum(["email", "sms", "voice"]),
  segment: z.object({
    description: z.string(),
    filters: z.record(z.any()).optional(),
    estimated_count: z.number().int().nonnegative().optional(),
  }),
  copy: z.object({
    subject: z.string().optional(),
    body: z.string().min(1),
    variants: z.array(z.string()).optional(),
  }),
  schedule: z.object({
    when: z.enum(["now", "scheduled"]),
    iso: z.string().optional(),
  }),
  rationale: z.string(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const Body = z.object({
      prompt: z.string().min(3).max(2000),
      workspace_id: z.string().uuid(),
    });
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { prompt, workspace_id } = parsed.data;

    // Verify workspace membership
    const { data: isMember } = await supabase.rpc("is_workspace_member", { _workspace_id: workspace_id, _user_id: userRes.user.id });
    if (!isMember) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pull business context so the AI signs as the real business — no [Your Business Name] leaks.
    const { data: settings } = await supabase
      .from("business_settings")
      .select("business_name, business_phone, business_email, owner_name")
      .eq("workspace_id", workspace_id)
      .maybeSingle();
    const businessName = settings?.business_name || "our team";
    const signoff = settings?.owner_name ? `${settings.owner_name}\n${businessName}` : businessName;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("AI not configured");

    const sys = `You are a campaign planner for a service-business OS.
Business context (use literally — never output placeholders like [Your Business Name]):
- Business name: ${businessName}
- Sign every message as: ${signoff}
- Reply-to: ${settings?.business_email ?? "(omit if not provided)"}

Given a free-text intent, return a SINGLE JSON object matching this exact shape:
{
  "channel": "email" | "sms" | "voice",
  "segment": { "description": string, "filters": object?, "estimated_count": number? },
  "copy": { "subject": string?, "body": string, "variants": string[]? },
  "schedule": { "when": "now" | "scheduled", "iso": string? },
  "rationale": string
}
Rules: pick the cheapest channel that fits intent. Keep SMS under 320 chars. Email body in plain text. No markdown, no square-bracket placeholders, no [Your Business Name] — always use the literal business name above. No commentary outside JSON.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (aiRes.status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!aiRes.ok) throw new Error(`AI gateway error ${aiRes.status}`);

    const aiJson = await aiRes.json();
    const rawContent = aiJson?.choices?.[0]?.message?.content ?? "{}";
    let parsedPlan;
    try {
      parsedPlan = JSON.parse(rawContent);
    } catch {
      throw new Error("AI returned invalid JSON");
    }
    const planResult = PlanSchema.safeParse(parsedPlan);
    if (!planResult.success) {
      return new Response(JSON.stringify({ error: "Plan validation failed", details: planResult.error.flatten() }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ plan: planResult.data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("plan-and-launch error", err);
    return new Response(JSON.stringify({ error: "Plan failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
