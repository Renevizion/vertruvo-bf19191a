## Goal

Two kinds of agents, cleanly separated:

1. **Personal agents** — you build them in your workspace, only your workspace sees and uses them. (This already works.)
2. **Platform agents (blueprints)** — you (as platform admin) publish a master agent. Every workspace can install it, and each install becomes their **own private editable instance**. Edits never leak to other workspaces, and the blueprint stays untouched.

Today there's a partial templates flow stored as JSON in `platform_config`. It's brittle and doesn't give admins a real management UI or instance tracking. We'll replace it with a proper system.

---

## What you'll see

**As platform admin (you):**
- New page `/admin/agent-blueprints` — list, create, edit, publish/unpublish, archive blueprints.
- Each blueprint has: name, description, type (voice/chat), category, greeting, instructions, voice, suggested tools, featured flag.
- "Installed by" count on each blueprint so you know adoption.

**As any workspace user:**
- New "Marketplace" tab on `/ai-agents` listing published blueprints.
- "Install" button → creates a private agent in their workspace, prefilled from the blueprint, linked back by `blueprint_id`.
- After install they edit it like any other agent — name, instructions, voice, knowledge base, phone number, status. None of those edits touch the blueprint or any other workspace's instance.
- Small "From blueprint: X" badge on the agent card so they know its origin. They can "Detach" to make it fully independent, or "Reset to blueprint" to pull the latest published version.

**Admin-published updates:**
- When you edit a blueprint, existing installs are NOT auto-overwritten (no surprise changes). Installed workspaces get a soft "Update available" badge and can opt to pull the new version.

---

## Technical section

### Database

New table `public.agent_blueprints`:
- `name`, `description`, `category`, `type` (voice|chat), `voice`, `greeting`, `instructions`
- `suggested_tools jsonb`, `default_integrations jsonb`
- `is_published boolean`, `is_featured boolean`
- `version int` (bumped on publish), `published_at`, `created_by`
- RLS: SELECT to authenticated where `is_published = true`; full CRUD only via `is_platform_admin(auth.uid())`.
- GRANTs: SELECT to authenticated, ALL to service_role.

Extend `public.ai_agents`:
- Add `blueprint_id uuid references agent_blueprints(id) on delete set null`
- Add `blueprint_version int` (snapshot of version at install/reset time)
- (Existing workspace RLS already isolates instances per workspace — no change needed.)

Migrate existing JSON templates in `platform_config.agent_templates` into rows in `agent_blueprints` (one-off seed in the migration).

### Frontend

- `src/pages/admin/AgentBlueprints.tsx` — admin CRUD UI, gated by `useIsAdmin`.
- `src/components/ai-agents/AgentMarketplace.tsx` — replaces the install path in current `AgentTemplates.tsx`; reads from `agent_blueprints`.
- `AIAgents.tsx` tabs: keep "My Agents", rename "Templates" → "Marketplace", point at new component.
- `AgentCard.tsx` — show "From blueprint" badge + "Update available" hint when `blueprint_version < blueprints.version`.
- Install action: `insert` into `ai_agents` with `workspace_id = current`, copy fields from blueprint, set `blueprint_id` + `blueprint_version`.
- "Reset to blueprint" / "Detach" actions in the agent dropdown.

### What stays out of scope
- No shared knowledge bases across workspaces (each install can attach its own KB).
- No telemetry rollups across instances yet — only adoption count via `select count(*) … where blueprint_id = …`.
- No paid/locked blueprints — that can come later as a tier gate on `is_featured` blueprints.

---

Want me to build this?