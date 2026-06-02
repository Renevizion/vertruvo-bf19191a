# FOUNDATION — Portable Agent Stack

> **What this is:** a single, drop-in doctrine + scaffolding doc to spin up the same "Ultimate Scope Capable AI Agent" stack inside any other app you own. Copy this file into the other project, follow the order, and you have the same spine.

This document encodes everything decided in the Kiruvo build so far so you can replicate it without re-reasoning from scratch.

---

## 1. The three-layer doctrine

```text
┌──────────────────────────────────────────────────────────┐
│  Shells       (SaaS, Widget, Kiosk, Extension,           │
│                Agent, API, White-Label)                  │
│   — the *lens*, never the cage                           │
├──────────────────────────────────────────────────────────┤
│  Skills       (.agents/skills/* + src/skills/registry)   │
│   — packaged playbooks that orchestrate capabilities     │
├──────────────────────────────────────────────────────────┤
│  Capabilities (src/capabilities/registry.ts)             │
│   — single source of truth for every platform verb       │
├──────────────────────────────────────────────────────────┤
│  Identity + Entitlements (src/lib/viewer.ts, can.ts)     │
│   — every call gated, same gate everywhere               │
└──────────────────────────────────────────────────────────┘
```

**Rules that are non-negotiable across all apps:**

1. **One Core, Many Shells.** Every shell renders every entitled capability. Default entry differs by shell; reachability does not.
2. **Capabilities are verbs. Skills are recipes.** Never duplicate logic into a skill that belongs in a capability, and never inline a multi-step recipe inside a single capability.
3. **Entitlements run server-side.** The LLM only ever sees the tool list it can call.
4. **No shell bypass.** Even kiosks and widgets go through `can()`. The shell is the lens, not the bouncer.
5. **Audit everything.** Every capability invocation is logged with workspace, viewer, args, result, latency.

---

## 2. Drop-in file scaffolding

Create these files in the target project. Names matter — keep them consistent across apps so the spine is recognizable.

### `src/capabilities/registry.ts`
The capability manifest. Each entry is:
```ts
type Capability = {
  key: string;                     // dot.namespaced (e.g. "crm.capture")
  group: CapabilityGroup;          // for UI grouping
  tier: "free" | "starter" | "pro" | "enterprise" | "admin";
  label: string;
  description: string;
  saasPath?: string;               // route in the SaaS shell
  shellDefaults: ShellKey[];       // which shells show it on first paint
  dependsOn?: string[];
  requiresIntegration?: string[];  // e.g. ["stripe_connect", "twilio"]
  agentTool?: AgentToolSpec;       // optional: makes it callable by the agent
};
```

### `src/lib/viewer.ts`
Universal identity resolver. Returns a `Viewer`:
```ts
type Viewer = {
  userId: string | null;
  workspaceId: string;
  role: "owner" | "admin" | "staff" | "customer" | "anon";
  shell: ShellKey;
  allowedCapabilities?: string[];  // embed-token narrowing
};
```

### `src/lib/can.ts`
The single entitlement function:
```ts
can(viewer, capabilityKey, planTier) => boolean
```
Order of checks: platform-owner override → admin-tier gate → tier gate → role gate (customer/anon allowlist) → embed allowlist. Same function on client and server.

### `src/capabilities/saas-nav.ts`
The SaaS sidebar is a **lens over the registry**, not a hardcoded list. It references capability keys; labels/paths resolve from the registry. Add a capability → it can appear in nav without touching nav code twice.

### `src/skills/types.ts` + `src/skills/registry.ts` + `src/skills/runner.ts`
Skills compose capabilities. Each skill `run()` calls `invoke(capabilityKey, payload)` — the runner gates each call through `can()`. Skills cannot escalate.

### `.agents/skills/<name>/SKILL.md`
The file-mirror of each skill — Anthropic-compatible frontmatter so external AI tooling (Claude, Cursor, OpenAI agents) can load the same playbooks.

### `supabase/functions/agent-runtime/index.ts`
JWT-verified edge function. Resolves viewer, filters capability tools by `can()`, streams completion via the AI gateway (`LOVABLE_API_KEY` or equivalent), dispatches tool calls to handlers, audits every invocation. Same shape regardless of app domain.

### Database tables
- `agent_invocations` — workspace_id, viewer_user_id, capability_key, params, result, status, latency_ms, created_at. Strict RLS by workspace.
- `agent_conversations` + `agent_messages` — full conversation memory; messages include tool_calls + tool_results.

---

## 3. The build order — copy this sequence

1. Migration: `agent_invocations`, `agent_conversations`, `agent_messages`. RLS on all three.
2. `src/lib/viewer.ts` + `src/lib/can.ts` (entitlement spine).
3. `src/capabilities/registry.ts` (start with the verbs your app already has; add `agentTool` definitions as you go).
4. `src/capabilities/saas-nav.ts` + refactor existing sidebar to read from it.
5. `src/skills/types.ts` + `registry.ts` + `runner.ts`. Seed with the 3–4 most common workflows in the app.
6. `.agents/skills/*/SKILL.md` mirror files (so external tooling sees the same skills).
7. `supabase/functions/agent-runtime/` (or platform equivalent) with full dispatch coverage.
8. `src/pages/Agent.tsx` + `src/components/agent-shell/*` — the universal chat UI that every shell will reuse.
9. Docs: copy `CAPABILITIES.md`, `SHELLS.md`, `CORE_CONTRACT.md`, `SKILLS.md`, and this `FOUNDATION.md` into the new project. Update names; keep the structure.
10. Memory file (`mem://architecture/one-core-many-shells`) so future agent sessions enforce the doctrine automatically.

---

## 4. Pitch language (for stakeholders / future you)

- **Capabilities** = "Every verb the platform can do, in one registry, gated once."
- **Skills** = "Playbooks the agent can run end-to-end, made of capability calls."
- **Shells** = "Every surface (SaaS, widget, kiosk, extension, agent, API, white-label) renders every entitled capability — the shell is a lens, not a cage."
- **Why it compounds** = "Add a capability once → every shell, every skill, every future surface inherits it. Add a skill once → it's portable to other apps you own."

---

## 5. What you carry to the other app

A reusable bundle:

| Bring | From | Why |
|---|---|---|
| `src/capabilities/registry.ts` shape | this project | The verb manifest pattern |
| `src/lib/viewer.ts` + `can.ts` | this project | Universal identity + entitlements |
| `src/capabilities/saas-nav.ts` pattern | this project | Nav reads registry, not hardcoded |
| `src/skills/*` + `.agents/skills/*` | this project | Playbook layer + portable file mirror |
| `supabase/functions/agent-runtime/` | this project | The dispatcher contract |
| `CAPABILITIES.md`, `SHELLS.md`, `CORE_CONTRACT.md`, `SKILLS.md`, `FOUNDATION.md` | this project | The doctrine docs |
| Memory rule "One Core, Many Shells" | `mem://architecture/one-core-many-shells` | Keeps future sessions aligned |

Drop these in. Replace the registry verbs with the new app's verbs. Replace the dispatch handlers. The spine is identical.

---

## 6. What changes per app, what stays

| Stays the same | Changes per app |
|---|---|
| 4-layer doctrine | The list of capabilities (the app's verbs) |
| `can()` signature + order of checks | Which tiers exist + their gates |
| `SkillSpec` shape | Which skills you seed |
| `agent-runtime` request/response shape | The dispatch table contents |
| Shell taxonomy (SaaS/Widget/Kiosk/…) | Which shells you actually ship |
| Audit/Memory tables | Domain-specific tables they reference |

That's the whole foundation. Anything else is decoration.
