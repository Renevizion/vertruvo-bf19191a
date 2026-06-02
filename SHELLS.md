# Kiruvo — Shell Architecture

> **One Core, Many Shells.** Every shell ships the **full capability set** from `CAPABILITIES.md`. The shell only decides chrome, default entry, and expansion behavior — never what's reachable.

---

## Shell Spec Template

Each shell defines:

| Field                  | Meaning                                                                       |
| ---------------------- | ----------------------------------------------------------------------------- |
| **Surface**            | Where it runs (browser tab, iframe, popup, fullscreen, native, headless)      |
| **Auth Model**         | How identity arrives (cookie session, signed embed token, kiosk PIN, API key) |
| **Default Entry**      | The capability shown first                                                    |
| **Expansion**          | How the user reaches other capabilities                                       |
| **Chrome Constraints** | What UI is locked / hidden / mandatory                                        |
| **Persistence**        | Session lifetime, storage scope                                               |

---

## 1. SaaS Shell (`shell.saas`)

Current `kiruvo.com` web app.

- **Surface:** Full browser tab, responsive.
- **Auth:** Supabase session (email/Google), `localStorage` persistence with Remember Me.
- **Default Entry:** `/` → smart redirect to `/dashboard` or onboarding.
- **Expansion:** Full sidebar + command palette → every capability the tier allows.
- **Chrome:** Header, sidebar, page chrome. Admin chrome hidden unless platform owner.
- **Persistence:** Long session, full workspace switching.

## 2. Widget Shell (`shell.widget`)

Embeddable `<script src="https://kiruvo.com/widget.js" data-workspace="slug">` for any third-party site.

- **Surface:** Floating bubble bottom-right; expands to drawer; "Open full workspace" launches SaaS in new tab.
- **Auth:** Anonymous by default for capture flows (`crm.capture`, `forms.embed`, `booking.public`, `agent.chat`). Authenticated upgrade via signed embed token → unlocks customer portal capabilities (`identity.portal`, `pay.subs`, `booking.programs`).
- **Default Entry:** Configurable per embed — usually `agent.chat` or `booking.public`.
- **Expansion:** "More" menu inside the drawer surfaces **every capability the host workspace + viewer is entitled to**, not just the default. A logged-in customer in the widget can pay an invoice, view their bookings, message the agent, browse content — without leaving the host site.
- **Chrome:** Bubble + drawer. No global sidebar. Brand kit applied automatically.
- **Persistence:** `kiruvo_widget_session` cookie scoped to host domain.

## 3. Kiosk Shell (`shell.kiosk`)

Single-tenant, locked, touch-first. iPad in a salon, lobby tablet, trade-show booth.

- **Surface:** Fullscreen PWA. No browser chrome. Auto-relaunch on idle.
- **Auth:** Kiosk PIN unlocks staff mode; default mode is anonymous customer.
- **Default Entry:** Configurable — `booking.public`, `forms.embed`, `agent.chat`, or rotating content (`content.flyer`).
- **Expansion:** Customer mode can pivot between booking, forms, payment, chat. Staff PIN reveals `booking.sheet`, `pay.pos`, `crm.capture` for walk-ins.
- **Chrome:** Large tap targets, no scrolling chrome, idle timeout returns to default entry.
- **Persistence:** Per-session only (resets on idle). Staff PIN session caps at 15 min.

## 4. Extension Shell (`shell.extension`)

Chrome MV3 extension. Popup for quick capture, side panel for full workspace.

- **Surface:** Toolbar popup (400×600) + side panel (full app).
- **Auth:** Same Supabase session as SaaS via `chrome.storage.local`.
- **Default Entry:** Popup → `crm.capture` quick-add (autofill from active tab's selection/URL). Side panel → full SaaS shell.
- **Expansion:** Popup "Open full" → side panel. Side panel = SaaS shell with extension-specific context (page URL, selection) injected as agent context.
- **Chrome:** Popup is single-screen, no nav. Side panel = SaaS chrome.
- **Persistence:** Extension storage, syncs with SaaS session.

## 5. Agent Shell (`shell.agent`)

Standalone conversational front door — voice or chat. Lives at `agent.kiruvo.com/<workspace-slug>` or as a phone number.

- **Surface:** Single chat/voice UI. No app chrome.
- **Auth:** Anonymous → authenticated mid-conversation if the user wants to take action requiring identity (book, pay, view portal).
- **Default Entry:** `agent.chat` or `agent.voice`.
- **Expansion:** The agent itself invokes any capability via tool calls. User can also say "show me my bookings" → renders inline card backed by `booking.public`. "I want to pay" → renders POS inline.
- **Chrome:** Conversation only. Inline capability cards rendered as needed.
- **Persistence:** Conversation memory per `agent.memory` tier rules.

## 6. API Shell (`shell.api`)

No UI. Pure programmatic access.

- **Surface:** REST + Realtime + Webhooks.
- **Auth:** Workspace API key (see `/api-docs`).
- **Default Entry:** N/A — caller specifies endpoint.
- **Expansion:** Every capability with a backing edge function is callable.
- **Chrome:** None.
- **Persistence:** Per-request.

## 7. White-Label Shell (`shell.wl`)

SaaS shell rebranded per division (Tech / Apparel / Fragrance) or per agency reseller. Same capabilities, different paint.

- **Surface:** Custom domain, custom brand kit, custom marketing pages.
- **Auth:** Same as SaaS shell; tenant-scoped branding loaded from `business_settings`.
- **Default Entry:** Same as SaaS but landing/login pages swapped.
- **Expansion:** Identical to SaaS.
- **Chrome:** Brand colors, logo, sender name, domain — all theme-driven.
- **Persistence:** Identical to SaaS.

---

## Cross-Shell Guarantees

These hold for **every** shell:

1. **Full capability reachability** — every entitled capability is reachable in at most 2 gestures from the default entry.
2. **Identical auth model** — one Supabase session, one role table, one RLS policy set. Embed tokens and API keys are scoped derivatives, not parallel systems.
3. **Identical data** — no shell ever sees a "lite" version of a workspace. The same `leads`, `bookings`, `items`, `messages` everywhere.
4. **Tier gating happens once** — in `useUsageLimits` / edge function `checkUsageGate`. Shells do not reimplement gating.
5. **Brand kit applied automatically** — every shell reads `business_settings` + `brand_kits` and themes itself.
6. **Mobile-first** — every shell tested at 360px wide. Zero horizontal scroll.

---

## Shell ≠ Product

Each shell is a **distribution channel**, not a product line. A workspace that pays for Pro gets:

- SaaS at kiruvo.com
- Embeddable widget for their website
- Kiosk PWA for their lobby
- Chrome extension for their staff
- Standalone agent URL for their landing pages
- API access for their devs

**All from one subscription. All the same capabilities.** That is the moat.

---

## Build Order (recommended)

1. **Refactor SaaS shell** to consume `src/capabilities/registry.ts` (proves the contract works on the surface we already ship).
2. **Widget shell** — biggest leverage; turns every customer's website into a Kiruvo distribution surface.
3. **Agent shell** — second-biggest; the AI-first front door other tools don't have.
4. **Kiosk shell** — physical-world surface, premium tier upsell.
5. **Extension shell** — staff productivity multiplier.
6. **White-label shell** — once 2–4 are stable.

---

## CLAUDES SUPER POWERED WHITE GLOVE. PLEASE UTILIZE -

PROJECT
WHITE GLOVE
FRAMEWORK

Drop into any new or existing project. Architecture doctrine, capability and skills registry, agent runtime, shell model, data integrity standards, and cross-app portability.

Built by and for the Micro-Conglomerate Architect.
Tech Division · Apparel Division · Fragrance Division

One Core, Many Shells. Every shell renders every entitled capability. The shell is a lens, not a cage.

2026

 
The Doctrine
These rules are non-negotiable across every project. They do not change per app, per domain, or per client. They are the spine.

The Four-Layer Stack
LAYER NAME WHAT IT IS RULE
Shells SaaS, Widget, Kiosk, Extension, Agent, API, White-Label The surface — how users interact. Never the source of truth. A lens not a cage. Edit a shell → only that shell changes.
Skills .agents/skills/\* + src/skills/registry.ts Packaged playbooks that orchestrate multiple capabilities for a specific job. Skills compose capabilities. Never duplicate capability logic inside a skill.
Capabilities src/capabilities/registry.ts Single source of truth for every verb the platform can execute. One registry. Every shell reads it. Adding one capability surfaces it everywhere.
Identity + Entitlements src/lib/viewer.ts + can.ts Universal identity resolver and single entitlement gate. Every call gated. Same gate everywhere. LLM only sees tools it can call.

NON-NEGOTIABLE RULES — LOCKED ACROSS ALL APPS
▸ One Core, Many Shells — every shell reads capabilities/registry.ts. Never hardcode a shell feature list.
▸ Capabilities are verbs. Skills are recipes. Never blur this line.
▸ Entitlements run server-side. The LLM only ever sees the tool list it can call.
▸ No shell bypass — even kiosks and widgets go through can(). The shell is the lens not the bouncer.
▸ Audit everything — every capability invocation logged: workspace, viewer, args, result, latency.
▸ No fabricated data — any field without a live source must be tagged [PLACEHOLDER]. No exceptions.
▸ Revenue translation on every capability — technical problems always have a business-language version.
▸ Coverage is complete now. Not over time.

Capability vs Skill
CAPABILITY SKILL
What it is A single verb the platform can do A multi-step playbook calling multiple capabilities
Example crm.capture, booking.create, seo.injectSchema convert-lead, weekly-renewal-sweep, run-site-audit
Lives in src/capabilities/registry.ts .agents/skills/\*/SKILL.md + src/skills/registry.ts
Agent-callable? Yes — if agentTool is defined Yes — runner gates each step through can()
AAA equivalent Tool / Function Skill (Anthropic pattern)
Hard rule Never inline multi-step logic Never duplicate logic that belongs in a capability

 
Drop-In File Scaffold
Create these files in this exact order in any new project. Order matters — each depends on the one above.

BUILD ORDER — NON-NEGOTIABLE
▸ 1. supabase/migrations/ — agent_invocations, agent_conversations, agent_messages + RLS on all three
▸ 2. src/lib/viewer.ts — universal identity resolver
▸ 3. src/lib/can.ts — single entitlement function, identical on client and server
▸ 4. src/capabilities/registry.ts — capability manifest with this app's verbs
▸ 5. src/capabilities/saas-nav.ts — sidebar reads registry, never hardcoded
▸ 6. src/skills/types.ts + registry.ts + runner.ts — skill executor layer
▸ 7. .agents/skills/_/SKILL.md — Anthropic-compatible file mirror per skill
▸ 8. supabase/functions/agent-runtime/index.ts — JWT-verified edge function dispatcher
▸ 9. src/pages/Agent.tsx + src/components/agent-shell/_ — universal chat UI reused by all shells
▸ 10. CAPABILITIES.md + SHELLS.md + CORE_CONTRACT.md + SKILLS.md + this doc — doctrine in project root

Capability Type Shape
type Capability = {
key: string; // dot.namespaced — e.g. crm.capture
group: CapabilityGroup;
tier: free|starter|pro|enterprise|admin;
label: string; // under 4 words, title case
description: string; // one sentence, non-technical reader
saasPath?: string;
shellDefaults: ShellKey[];
dependsOn?: string[];
requiresIntegration?: string[];
agentTool?: AgentToolSpec; // makes it callable by the agent
revenueTranslation: string; // THE SIXTH FIELD — always required
};

Viewer Type Shape
type Viewer = {
userId: string | null;
workspaceId: string;
role: owner|admin|staff|customer|anon;
shell: ShellKey;
allowedCapabilities?: string[]; // embed-token narrowing
};

can() — Entitlement Check Order
Same function on client and server. Never duplicated. Never bypassed.
• 1. Platform-owner override
• 2. Admin-tier gate
• 3. Plan tier gate
• 4. Role gate — customer/anon allowlist
• 5. Embed allowlist — token narrowing

## SKILL.md — Anthropic-Compatible Shape

name: skill-name
description: One sentence — what job this skill does end to end
capabilities: [cap.key1, cap.key2, cap.key3]
tier: pro

---

## Steps

1. Call cap.key1 with {param}
2. If result.status === ok, call cap.key2

## Edge cases

- If step 1 fails: [defined behavior — never silent]

AGENT-RUNTIME EDGE FUNCTION — REQUIRED BEHAVIOR
▸ Verify JWT — reject unauthenticated requests before anything else
▸ Resolve viewer via resolveViewerFromSession()
▸ Filter tool list through can() — LLM never sees tools it cannot call
▸ Stream completion via AI gateway
▸ Dispatch tool calls to capability handlers
▸ Log every invocation to agent_invocations — no silent runs
▸ Return structured result — never raw LLM output without validation

 
Capability Data Model Standard
Every capability must be complete before it is considered live. Partial entries produce fabricated outputs, bad pitch data, and broken agent behavior.

The Six Required Fields
FIELD REQUIRED STANDARD
key Yes dot.namespaced. Group first: seo.injectSchema, crm.capture, booking.create
label Yes Human-readable. Title case. Under 4 words.
description Yes One sentence. What it does, not how. Written for a non-technical reader.
tier Yes Lowest plan tier that can access this. Default: starter.
agentTool If agent-callable Full AgentToolSpec. If missing, capability is UI-only.
revenueTranslation Always Business-language version. What a non-technical owner understands this means for their money. Never skip.

Revenue Translation Examples
CAPABILITY KEY REVENUE TRANSLATION
seo.injectSchema AI engines cannot find or recommend you without this. Competitors who have it are getting your bookings.
seo.fixMetaTitle Your digital storefront is frozen in the past. This is the first thing a customer sees when they search for you.
booking.embedWidget Every time someone tries to book after hours, that revenue is gone permanently. This captures it automatically.
aeo.buildFAQ Your biggest selling point is invisible to Siri and ChatGPT right now. This surfaces it.
reviews.requestSMS You are not in the AI recommendation conversation until you hit 50+ reviews. This gets you there.
audit.runSiteAudit Shows the owner exactly where their money is leaking before you ask them to pay you to fix it.

DATA INTEGRITY RULE — NO EXCEPTIONS
▸ LIVE: field populated from a live scrape or API call. Display as-is.
▸ MANUAL: field manually entered by operator. Acceptable — document the source date.
▸ [PLACEHOLDER]: field generated without a live source. Never present as real data. Trigger live scrape.
▸ UNAVAILABLE: scrape attempted but failed. Show Run audit to populate. Never substitute a guess.
▸ The lesson: 11 fabricated reviews vs 85 real reviews destroyed the analysis entirely. This rule exists because of that.

 
Agent Runtime Spec
The agent is an execution engine that runs capabilities and skills on behalf of a verified viewer. Every project gets the same agent architecture.

What the Agent Is and Is Not
THE AGENT IS THE AGENT IS NOT
A capability dispatcher that runs verified tools A freeform chatbot with unrestricted access
Gated by can() on every tool call Able to call capabilities the viewer cannot access
An executor of skills and capabilities A source of fabricated data or hallucinated outputs
Audited on every invocation Running silently without a log trail
A surface every shell reuses A standalone app outside the core architecture

The Site Audit Skill — Build This First in B2B Context
This skill replaces manually entered and fabricated data with live scraped truth. It is what makes the prospect dossier accurate.
RUN-SITE-AUDIT — EXECUTION SEQUENCE
▸ Step 1 — OSINT scrape: HTTP to target URL, extract title tag, meta description, check for application/ld+json in head
▸ Step 2 — GBP lookup: Google Business Profile API — real rating, real review count, real response rate
▸ Step 3 — Schema validation: parse found JSON-LD against Schema.org spec, log all errors
▸ Step 4 — Conversion audit: scan anchor tags and CTAs, flag phone-only or in-person-only intake
▸ Step 5 — Stale content scan: regex match for outdated operational language
▸ Step 6 — Output: structured JSON with every field tagged LIVE, MANUAL, or [PLACEHOLDER]
▸ Step 7 — Dossier population: map to prospect card data model. Never overwrite LIVE data with generated data.

Emergent Metrics — Calculated Not Entered
METRIC FORMULA INPUTS WHAT IT DRIVES
Opportunity Score Issue severity + leak density + maturity gap + review gap Walk-in priority. High = this week. Low = next quarter.
Displacement Risk Missing schema + no mobile + low reviews + stale metadata Urgency framing. You are actively losing bookings right now.
Revenue Recovery Est. (criticals x $400) + (highs x $200) + (leaks x $150) x +-40% Justifies your fee. $2K/mo lost makes $249/mo invisible.
Client Archetype Maturity + review count + opportunity count Pitch register — Easy Close vs ROI-Proof vs Sophisticated Buyer.

Agent Memory Tables
agent_invocations: workspace_id, viewer_user_id, capability_key,
params (jsonb), result (jsonb), status, latency_ms, shell, created_at
RLS: strict by workspace_id

agent_conversations: id, workspace_id, viewer_user_id, shell, title, created_at

agent_messages: id, conversation_id, role (user|assistant|tool),
content, tool_calls (jsonb), tool_results (jsonb), capability_key, created_at

 
Shell Model
Seven shells. One core. The shell determines how capabilities are presented and which are shown by default — not which exist. The registry decides what exists.

SHELL AUTH DEFAULT ENTRY PRIMARY USE SHIP PRIORITY
SaaS Full JWT Dashboard sidebar Primary product — full platform for paying users 1st
Agent JWT or API key Chat + tool dispatch AI execution surface — runs skills and capabilities via language 2nd
Widget Embed token Single capability Embeds on client sites — booking, audit, intake form 3rd
API API key + HMAC REST endpoints Developer and integration access — powers white-label 4th
Extension Browser auth Active tab context Browser-based audit — audits open page, injects fixes 5th
Kiosk No auth / PIN Locked single flow Physical or public-facing — check-in, registration 6th
White-Label Tenant JWT Branded SaaS shell Resell under client brand — same core, different chrome 7th

Shell Update Rules
ACTION SCOPE
Edit SaaS shell UI — sidebar, pages, layout Only SaaS shell. All others unaffected.
Add capability to registry.ts Every shell can surface it. Zero additional work.
Fix bug in edge function Every shell calling that function fixed simultaneously.
Add skill to skills/registry.ts Agent shell can run it. Portable to other apps immediately.
Tighten RLS policy Every shell respects it. Security is universal not per-shell.
Edit Widget embed bundle Only Widget shell. SaaS and others unaffected.

SHELL HEALTH MONITORING
▸ Liveness: last successful render timestamp + heartbeat ping every 5 minutes
▸ Capability coverage: % of registry capabilities reachable by this shell viewer tier
▸ Error rate: client JS errors + edge function 5xx filtered by x-shell-id header
▸ Smoke test: last run timestamp + pass/fail per canonical capability invocation
▸ Core contract version: git SHA the shell was last built against
▸ Cross-app: post heartbeats to shared shell_telemetry table — one meta-dashboard reads all

 
Cross-App Portability Kit
What you carry between apps. What you change. What never moves.

What to Carry
FILE / PATTERN FROM WHY
src/capabilities/registry.ts shape Any existing app The verb manifest pattern — replace verbs, keep structure
src/lib/viewer.ts + can.ts Any existing app Universal identity + entitlements — identical across all apps
saas-nav.ts pattern Any existing app Nav reads registry — never hardcoded
src/skills/_ + .agents/skills/_ Any existing app Playbook layer — replace skill content, keep runner shape
supabase/functions/agent-runtime/ Any existing app Dispatcher contract — replace handlers, keep shape
Both white glove docs This session The complete spine — drop into root of every project
mem://architecture/one-core-many-shells Kiruvo build Memory rule — keeps future AI sessions aligned to doctrine

What Changes Per App vs What Stays
STAYS THE SAME CHANGES PER APP
Four-layer doctrine The list of capabilities — the app's specific verbs
can() signature and order of checks Which tiers exist and what they gate
SkillSpec shape and runner Which skills you seed — domain-specific playbooks
agent-runtime request/response contract The dispatch table contents and handlers
Shell taxonomy — 7 shells Which shells you actually ship in this app
Audit and memory table schema Domain-specific tables they reference
Revenue translation field on capabilities The actual translation text — domain-specific language

Cold-Start Paste — For Any AI Agent Session
Paste this verbatim at the top of any new AI agent session on a project using this architecture:

PASTE INTO AGENT SESSION — START OF EVERY NEW THREAD
▸ This project uses the One Core, Many Shells doctrine.
▸ All capabilities live in src/capabilities/registry.ts. Never hardcode a feature list in a shell.
▸ All entitlement checks run through src/lib/can(). Same function client and server.
▸ Every capability has a revenueTranslation field. Use it in all client-facing output.
▸ No data is fabricated. If a field has no live source, tag it [PLACEHOLDER].
▸ Skills compose capabilities. Never put multi-step logic inside a single capability.
▸ Audit every invocation. Log to agent_invocations: workspace, viewer, args, result, latency.
▸ The shell is a lens not a cage. Edit a shell — only that shell changes.
▸ Before adding any feature: does a capability for this exist? If yes, use it. If no, add to registry first.
▸ Coverage is complete now. Not over time.

 
Monitoring and Testing Standard
You cannot trust a shell you cannot observe. Every project gets this monitoring spine from day one.

Registry-Driven Test Runner
One test file covers every capability across every shell. Add a capability — it gets tested automatically in every shell.
// src/capabilities/**tests**/shell-coverage.test.ts
// For each capability in registry:
// For each shell in SHELLS:
// Assert: capability reachable by entitled viewer
// Assert: permission gate denies unentitled viewer
// Assert: server handler returns expected shape
// Assert: agentTool (if defined) returns structured result

One file. Every capability. Every shell. Runs on every deploy. No manual QA required.

Cross-App Telemetry
shell_telemetry: app_id, shell_key, status, error_count, last_ping,
capability_coverage_pct, core_contract_version, created_at

Every app posts to this table. One meta-dashboard reads from all. Alert: error_count > 5 in 10 min OR last_ping > 15 min.

 
Quick Reference
Before You Build Anything
RUN THIS CHECK — EVERY TIME
▸ Does a capability for this already exist in registry.ts? If yes, use it.
▸ Is this a capability (single verb) or a skill (multi-step playbook)? Do not blur the line.
▸ Which shell surfaces this? Add it to the registry — do not build it into the shell.
▸ Is there a live data source for this field, or am I about to fabricate a placeholder?
▸ What is the revenue translation? Write it before you build the capability.
▸ Does the agent need to call this? Define agentTool before writing the handler.
▸ Is can() gating this server-side? If not, it is a security hole.
▸ Coverage is complete now. Not over time.

Pitch Language — Always Translate
NEVER SAY THIS SAY THIS INSTEAD
Your H3 tags appear before H1 Your site structure is confusing AI and Google. They are ranking competitors above you because of it.
You are missing JSON-LD schema AI engines cannot find or recommend you. Competitors who have this are getting your customers right now.
Your meta description is empty Google is writing your ad copy for you. And it is bad.
Your contact form has no handler People are trying to reach you and hitting a dead end. That is lost revenue every day.
No mobile responsiveness Over 60% of people searching for you right now are on mobile. Your site breaks for every one of them.
Low review count ChatGPT recommends businesses with 50+ reviews. You have fewer. You are not in the conversation.

Data Integrity at a Glance
TAG SOURCE RULE
LIVE Scraped from target URL or API Display as-is. This is real.
MANUAL Entered by operator Acceptable. Document the source date.
[PLACEHOLDER] Generated without live source Tag it. Never present as real. Trigger live scrape.
UNAVAILABLE Scrape attempted and failed Show: Run audit to populate. Never substitute a guess.

This document + white-glove-framework.docx = your complete operating system.
Drop both into every project root. Update the capability verbs. Keep the spine.

## One Core. Many Shells. Every entitled capability. Coverage complete now.
