// Multi-agent orchestration: plan → judge → handoff chain.
// AAA Scaffold: hard counter MAX 5 on the loop, stripper context, registry-validated tools.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_STEPS = 5;
const MODEL = "google/gemini-2.5-flash";

// Whitelist of capability tools the orchestrator can hand off to.
const TOOL_REGISTRY = new Set([
  "crm.capture", "crm.bulk_outreach", "comms.email", "comms.sms",
  "agent.voice_call", "booking.public", "content.publish", "handoff.human",
]);

async function aiCall(messages: any[], jsonOnly = true) {
  const apiKey = Deno.env.get("LOVABLE_API_KEY")!;
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      messages,
      ...(jsonOnly ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!r.ok) throw new Error(`AI ${r.status}: ${await r.text()}`);
  const j = await r.json();
  const c = j?.choices?.[0]?.message?.content ?? "{}";
  try { return JSON.parse(c); } catch { return { raw: c }; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const body = await req.json();
    const goal: string = String(body?.goal ?? "").slice(0, 4000);
    const workspaceId: string = body?.workspaceId;
    const context: Record<string, unknown> = body?.context ?? {};
    if (!goal || !workspaceId) {
      return new Response(JSON.stringify({ error: "goal and workspaceId required" }), { status: 400, headers: corsHeaders });
    }

    const { data: member } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!member) return new Response(JSON.stringify({ error: "Not a workspace member" }), { status: 403, headers: corsHeaders });

    // Create orchestration row
    const { data: orch, error: orchErr } = await supabase
      .from("agent_orchestrations")
      .insert({
        workspace_id: workspaceId,
        user_id: user.id,
        goal,
        status: "planning",
        context: context as any,
      })
      .select().single();
    if (orchErr || !orch) throw new Error(orchErr?.message || "Could not create orchestration");

    const trace: any[] = [];
    let plan: any = null;
    let judgement: any = null;
    let handoff: any = null;
    let stepCount = 0;
    let lastError: string | null = null;

    try {
      while (stepCount < MAX_STEPS) {
        stepCount++;

        // 1) PLAN
        if (!plan) {
          plan = await aiCall([
            { role: "system", content: `You are the PLANNER. Produce JSON: { "steps": [{ "tool": string, "reason": string, "params": object }], "final_response": string }. ONLY use tools from this registry: ${[...TOOL_REGISTRY].join(", ")}. Max 4 steps.` },
            { role: "user", content: `Goal: ${goal}\nContext: ${JSON.stringify(context).slice(0, 2000)}` },
          ]);
          // Validate tools against registry
          const steps = Array.isArray(plan?.steps) ? plan.steps : [];
          const invalid = steps.filter((s: any) => !TOOL_REGISTRY.has(s?.tool));
          if (invalid.length) {
            plan.invalid_tools = invalid.map((s: any) => s.tool);
            plan.steps = steps.filter((s: any) => TOOL_REGISTRY.has(s?.tool));
          }
          trace.push({ step: stepCount, kind: "plan", plan });
          await supabase.from("agent_orchestrations").update({ status: "judging", plan, step_count: stepCount }).eq("id", orch.id);
          continue;
        }

        // 2) JUDGE
        if (!judgement) {
          judgement = await aiCall([
            { role: "system", content: `You are the JUDGE. Critique the plan strictly. Produce JSON: { "verdict": "approve"|"revise"|"reject", "score": 0-10, "issues": string[], "needs_human": boolean, "reasoning": string }.` },
            { role: "user", content: `Goal: ${goal}\nPlan: ${JSON.stringify(plan)}` },
          ]);
          trace.push({ step: stepCount, kind: "judge", judgement });
          await supabase.from("agent_orchestrations").update({ status: "handoff", judgement, step_count: stepCount }).eq("id", orch.id);

          // Revise loop
          if (judgement?.verdict === "revise" && stepCount < MAX_STEPS - 1) {
            plan = null;
            continue;
          }
          if (judgement?.verdict === "reject") {
            lastError = "Plan rejected by judge";
            break;
          }
          continue;
        }

        // 3) HANDOFF
        handoff = await aiCall([
          { role: "system", content: `You are the HANDOFF agent. Decide who executes each approved step. Produce JSON: { "assignments": [{ "tool": string, "assignee": "agent"|"human", "queue_to": string, "payload": object }], "human_required": boolean, "summary": string }.` },
          { role: "user", content: `Plan: ${JSON.stringify(plan)}\nJudgement: ${JSON.stringify(judgement)}` },
        ]);
        trace.push({ step: stepCount, kind: "handoff", handoff });
        break;
      }

      await supabase.from("agent_orchestrations").update({
        status: lastError ? "failed" : "completed",
        plan, judgement, handoff,
        result: { trace, final_response: plan?.final_response ?? null },
        step_count: stepCount,
        error: lastError,
      }).eq("id", orch.id);

      return new Response(JSON.stringify({
        orchestrationId: orch.id, plan, judgement, handoff, trace, stepCount, error: lastError,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (loopErr) {
      const msg = loopErr instanceof Error ? loopErr.message : String(loopErr);
      await supabase.from("agent_orchestrations").update({
        status: "failed", error: msg, step_count: stepCount, result: { trace },
      }).eq("id", orch.id);
      return new Response(JSON.stringify({ error: msg, orchestrationId: orch.id, trace }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("orchestrate-agents error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
