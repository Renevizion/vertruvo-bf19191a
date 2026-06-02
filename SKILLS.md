# Skills — the procedural layer on top of Capabilities

> Industry pattern (Anthropic, OpenAI Agent Builder, Cursor): **Skills** are packaged know-how the agent loads on demand. We adopt this pattern directly. Skills sit **above** the Capability registry — capabilities are *verbs*, skills are *playbooks* that chain those verbs into outcomes.

---

## Capability vs Skill — the one-line difference

| | Capability | Skill |
|---|---|---|
| **What it is** | A single platform verb | A multi-step playbook |
| **Source of truth** | `src/capabilities/registry.ts` | `src/skills/registry.ts` + `.agents/skills/<name>/` |
| **Granularity** | "Create a lead" | "Convert a website inquiry into a paying customer" |
| **Loaded** | Always — listed by `can()` | On demand — surfaced by retrieval/intent match |
| **Composed of** | Direct DB/edge-fn call | A sequence of capability calls + optional bundled docs/scripts |
| **Entitlement gate** | Tier + role via `can()` | Inherits — runs only the steps the viewer can call |

A skill is *not* a substitute for a capability. A skill is **how you do a job well** using capabilities.

---

## Skill anatomy (Anthropic-compatible)

```
.agents/skills/<skill-name>/
├── SKILL.md            # required — frontmatter + body
├── references/         # optional — long-form docs loaded on demand
│   └── *.md
├── scripts/            # optional — runnable helpers
│   └── *.{sh,py,ts}
└── assets/             # optional — templates, fixtures
```

**SKILL.md frontmatter:**

```yaml
---
name: convert-lead-to-customer
description: When a qualified lead is ready to book, capture payment intent and promote them to a customer account.
capabilities: [crm.contacts, crm.promotion, booking.public, pay.bundles, pay.receipts]
triggers: ["promote lead", "convert to customer", "ready to book"]
tier: starter
---
```

Body = the playbook the agent reads when the skill activates.

---

## In-code registry (mirror of the file format)

`src/skills/registry.ts` exposes the same skills as TypeScript objects so the Agent shell can list and execute them with type safety:

```ts
type SkillSpec = {
  key: string;
  name: string;
  description: string;
  triggers: string[];
  capabilities: string[];          // capability keys this skill calls
  tier: Tier;
  run: (ctx: SkillContext) => Promise<SkillResult>;
};
```

Why both the file and the registry? The file is the *portable, AI-readable* version (copy to another app, drop into Claude/Cursor). The registry is the *runtime executable* version (invokable from the Agent shell). Same intent, two surfaces.

---

## Skills do not bypass entitlements

A skill calls capabilities. Every capability call still runs through `can(viewer, capabilityKey, planTier)`. If a viewer is on Starter and the skill's third step is a Pro capability, that step is skipped (or the skill aborts) — no privilege escalation through composition.

---

## When to write a Skill vs a Capability

Write a **Capability** when:
- The platform gains a new verb (a new table action, a new edge function, a new integration).
- It should be callable directly from any shell.

Write a **Skill** when:
- You're encoding a *workflow* the team does repeatedly.
- You want the agent to remember the *right order* of calls.
- You want bundled templates, scripts, or reference docs to ship with the playbook.

Rule of thumb: if it's one verb, capability. If it's a recipe, skill.

---

## Adoption status

- `src/skills/types.ts` — SkillSpec contract
- `src/skills/registry.ts` — seeded with the first set of skills, composed from existing capabilities
- `src/skills/runner.ts` — entitlement-aware executor
- `.agents/skills/` — file mirror for portability and external AI tooling (Claude, Cursor)
- Agent shell will read both surfaces; capability calls remain the audit-logged primitive.

See also: `CAPABILITIES.md`, `CORE_CONTRACT.md`, `SHELLS.md`, `FOUNDATION.md`.
