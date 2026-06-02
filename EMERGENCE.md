# Kiruvo — 50 Emergent Properties

A running list of capabilities that *fall out* of the current architecture (One Core, Many Shells + Capability registry + Skills + Multi-tenant identity) without us building new features. Each one is a thing we can light up by writing a small skill or surfacing an existing capability — not a thing we have to engineer from scratch.

> Use this when sales asks "can it also…" or when a vertical preset needs a hook.

## I. Cross-shell ergonomics (1–10)

1. **Same workspace, every surface** — every shell (SaaS / Widget / Kiosk / Extension / Agent / API) renders the same data with the same RLS.
2. **Capability-as-URL** — any capability key can be deep-linked into any shell (`/widget#cap=crm.capture`).
3. **Embed allowlist** — `viewer.allowedCapabilities` already lets us issue scoped widgets per client without code changes.
4. **Kiosk fallback** — KioskShell can host *any* capability the plan entitles, so the front-desk iPad is feature-complete for free.
5. **Extension shell** — Chrome extension reuses the registry; a contact pulled from Gmail can route through `crm.capture` instantly.
6. **AgentShell on a screen** — voice/chat agents render their own UI when invoked from any shell, no separate page needed.
7. **API shell parity** — anything in the registry can be exposed via API without a custom edge function.
8. **One telemetry pipe** — `shell_telemetry` already collects heartbeats from every shell; admin can see who's stuck *where*.
9. **Capability invocation analytics** — `withTelemetry` gives us per-capability adoption metrics for free.
10. **Per-shell theming** — the same capability can render with a kiosk theme, white-label theme, or widget theme via `ShellChrome`.

## II. Identity & access (11–18)

11. **Global identity** — a user can belong to multiple workspaces with a single login; useful for agencies and consultants.
12. **Customer portal isolation** — same auth system, different role flag, totally separate surface.
13. **Anonymous capture** — booking and form capabilities work for unauthenticated visitors with the same RLS guarantees.
14. **Platform-owner override** — admin role hard-locked to one UID bypasses every limit; safe demos and incident response.
15. **Workspace seat math excludes owner** — invites and billing already match how teams actually think.
16. **Role-aware capability gating** — `can()` enforces customer/anon/staff/owner per capability without per-route code.
17. **Connector OAuth-per-user-ready** — current connector model lets us add per-user OAuth on top without rewriting.
18. **Per-tenant Stripe customer IDs** — one user across two workspaces never crosses billing wires.

## III. White Glove discovery (19–24)

19. **SEO/AEO/GEO/AIO four-layer hard gate** — every public surface (booking pages, customer portals, widgets) inherits structured data without builders thinking about it.
20. **Schema-driven previews** — link unfurls (FB, Twitter, LinkedIn) work the same for every workspace's booking page.
21. **GEO answerability** — public pages already answer "where, when, how much" in machine-readable form for ChatGPT/Perplexity.
22. **AIO indexability** — `/llms.txt` and sitemap are wired; every new tenant inherits AI-search exposure.
23. **Per-workspace canonical domain enforcement** — `kiruvo.com/<slug>` cannot be hijacked by preview hostnames.
24. **Generative engine optimization** — answers to common business questions live in HTML, not JS, on every public page.

## IV. Skills & composition (25–32)

25. **Skill runner is procedural glue** — any new workflow can be composed from existing capabilities in a `SKILL.md`.
26. **Anthropic-compatible skill mirror** — `.agents/skills/<name>/SKILL.md` doubles as portable knowledge for external agents.
27. **Skill catalog as marketplace** — every vertical preset is just a bundle of skills + enabled capabilities.
28. **Self-improving onboarding** — `white-glove-discovery` skill runs on first publish; future skills can run on first invite, first lead, first invoice.
29. **AI agent + skill composability** — an AI agent can invoke skills as tools, not just respond conversationally.
30. **Skill-level telemetry** — every skill step emits an invocation event, so we know which playbooks actually run end-to-end.
31. **Workflow templates ≈ skills** — the workflow library could be regenerated from skills, removing duplication.
32. **One core, many languages** — skills can be authored by humans or AI; the runner doesn't care.

## V. Money & lifecycle (33–40)

33. **Vaulted card → any surface** — once a customer has a `setup_intent`, POS, bookings, bundles, and group programs all reuse it.
34. **Bundle is just a counter** — multi-session packs decrement from one place; new "products" don't need new schema.
35. **Group program enrollment ≈ booking + bundle** — no separate billing path, fewer bugs.
36. **Proactive renewal scan** — daily job over bookings ending in 14 days already exists; can drive SMS, email, voice, or task with no new code.
37. **Per-class roster is the ledger of truth** — moves, waitlists, and renewals roll into one CSV per program.
38. **Lead → customer promotion** — single function generates an auth account with `customer` role on first booking.
39. **Customer-facing portal self-service** — schedules, cards, group programs all read from the same RLS-protected tables.
40. **Stripe Connect Express** — tenants take payment under their own account; platform fee enforced server-side, not client-trusted.

## VI. AI & outreach (41–46)

41. **Workspace-scoped AI agents** — every agent has its own memory, tools, and RLS; cannot leak across tenants.
42. **Bulk AI outreach** — multi-lead selection composes one prompt per lead with per-lead variables; reuses the same agent runtime.
43. **Form auto-response (AI or Template)** — Strict mode is the default; reply quality is a config, not a separate feature.
44. **Voice sandbox pool** — 10 free trial calls on platform Twilio number for Pro users; Enterprise gets white-glove BYO setup.
45. **Real-time agent querying** — voice agents can pull live items and promotions during a call without polling.
46. **Human handoff protocol** — `HANDOFF_REQUEST` is a contract every agent already speaks.

## VII. Trust & operations (47–50)

47. **Workspace-aware everything** — there is no "global state" UI element in the SaaS shell; everything queries by workspace_id.
48. **Search-path-pinned functions** — every SECURITY DEFINER function has `set search_path = public`; can't be hijacked.
49. **Edge function error sanitization** — clients see safe messages; full traces go to server logs only.
50. **Capability-coverage script** — `scripts/shell-coverage-check.ts` proves every entitled capability renders in every shell, before ship.

---

Each row above is a *fact about the current architecture*, not a roadmap. When a customer asks for X, check this list first — odds are it already exists, one skill or one surfaced capability away.
