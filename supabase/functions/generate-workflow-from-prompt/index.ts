// Natural-language workflow generator. Takes a plain-English prompt and emits
// a structured workflow JSON the existing automation engine understands.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyAuth, unauthorizedResponse } from "../_shared/auth.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Body = { workspace_id: string; prompt: string };

const SYSTEM = `You translate plain-English automation requests into Kiruvo workflow JSON.

Allowed trigger types: "lead_created", "lead_stage_changed", "form_submitted", "booking_created", "booking_cancelled", "no_reply", "tag_added".
Allowed action types: "send_sms", "send_email", "wait", "move_stage", "add_tag", "remove_tag", "assign_user", "create_task", "ai_agent_respond", "webhook".
Wait actions use { type:"wait", duration_minutes:<n> } or { duration_days:<n> }.

Respond ONLY with JSON of shape:
{
  "name": "<short workflow name>",
  "description": "<one sentence>",
  "trigger": { "type": "<trigger>", "config": { ...filters } },
  "steps": [ { "type": "<action>", "config": { ... } }, ... ]
}
No markdown, no preamble.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await verifyAuth(req);
  if (!auth) return unauthorizedResponse(corsHeaders);

  let body: Body;
  try { body = await req.json(); } catch { return j(400, { error: "Invalid JSON" }); }
  if (!body.workspace_id || !body.prompt?.trim()) {
    return j(400, { error: "workspace_id and prompt required" });
  }
  if (body.prompt.length > 2000) {
    return j(400, { error: "Prompt too long (max 2000 chars)" });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: isMember } = await admin.rpc("is_workspace_member", {
    _workspace_id: body.workspace_id, _user_id: auth.userId,
  });
  if (!isMember) return j(403, { error: "Not a workspace member" });

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: body.prompt.trim() },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (res.status === 429) return j(429, { error: "Rate limit. Try again in a moment." });
  if (res.status === 402) return j(402, { error: "Out of AI credits. Add credits in workspace settings." });
  if (!res.ok) {
    console.error("[nl-workflow] gateway", res.status, await res.text());
    return j(502, { error: "Workflow generator unavailable" });
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content ?? "{}";
  let workflow: unknown;
  try { workflow = JSON.parse(raw); } catch {
    return j(502, { error: "Generator returned malformed output" });
  }

  return j(200, { workflow });
});

function j(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
