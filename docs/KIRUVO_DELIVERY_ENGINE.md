# Kiruvo — Product Delivery Engine

Kiruvo is delivered as one product, not a pile of disconnected apps.

The SaaS app is the primary cockpit. Everything else — widget, kiosk, extension, agent, API, white-label surface, and future local or foreign shells — is a translated expression of the same core language.

## 1. The product shape

| Layer | Purpose | User effort |
|---|---|---|
| **Core Engine** | Owns identity, workspace scope, capability contracts, data access, automation, payments, agents, and telemetry. | Design the rules once. |
| **SaaS Cockpit** | The main app where the operator monitors, designs, reviews, and controls the business. | Primary daily focus. |
| **Shells** | Different surfaces that present the same capabilities in the right form for the moment. | Monitor health, not rebuild features. |
| **Skills** | Procedural playbooks that compose capabilities into workflows. | Refine behavior and language. |
| **Telemetry** | Heartbeats and invocation data showing which shell is alive, idle, broken, or being used. | Watch the system breathe. |

The goal is not to spend energy manually maintaining every medium. The goal is to keep the foundation coherent so every medium inherits the same product truth.

## 2. Current delivery shells

| Shell | Current state | Role in delivery |
|---|---:|---|
| **SaaS** | Primary app | Main cockpit for monitoring, design, configuration, CRM, tasks, campaigns, automations, billing, and admin. |
| **Widget** | Active | Embeddable customer-facing entry point for booking, capture, chat, payments, and focused workflows. |
| **Kiosk** | Active | Front-desk / shared-device surface for intake, booking, POS, rosters, and lightweight operations. |
| **Extension** | Idle | Browser-side assistant for bringing CRM, capture, contact actions, and contextual tools into other websites. |
| **Agent** | Active | Conversational/voice surface that can query and operate capabilities using workspace-safe tools. |
| **API** | Idle | Programmatic delivery layer for partners, custom clients, and external systems. |
| **White label** | Idle | Branded external expression of the same core for tenants or partner-owned presentation. |

Idle does not mean absent. It means the shell has no recent heartbeat or traffic. The capability contract still defines what it is allowed to become.

## 3. Capability families we deliver

| Family | Capabilities | SaaS role | Shell translation |
|---|---|---|---|
| **Identity & workspace** | Auth, workspace membership, roles, permissions, portal access. | Configure and govern access. | Every shell resolves the same viewer, workspace, plan, and role. |
| **CRM** | Leads, contacts, dedupe, stages, bulk lookup, lead-to-customer promotion. | Manage relationships and pipeline. | Widget captures; extension imports; agent summarizes; API syncs. |
| **Tasks & operations** | Tasks, calendar, booking sheet, renewals, rosters. | Daily operator workflow. | Kiosk and agent surface only the relevant operational slice. |
| **Booking** | Public booking, programs, renewals, roster exports, customer scheduling. | Build and review services/programs. | Widget/kiosk/customer portal let clients act without exposing the cockpit. |
| **Payments** | Stripe Connect, POS, card vaulting, subscriptions, bundles, receipts. | Configure money flows and audit outcomes. | Kiosk/POS collect; booking charges; portal self-serves; API reports. |
| **AI agents** | Chat, voice, memory, tools, handoff, auto-response. | Design behavior, monitor output, approve critical flows. | Agent shell becomes the spoken/written race of the same engine. |
| **Voice/SMS/outreach** | Sandbox pool, BYO Twilio, campaigns, broadcasts, transcriptions. | Compose and monitor campaigns. | Agent and phone channels execute workspace-scoped communication. |
| **Email** | Campaigns, lists, transactional templates, onboarding drips, deliverability. | Create and schedule communication. | Public/client shells trigger transactional sends from the same queue. |
| **Content & social** | Content hub, flyers, brand kits, social planning, Instagram interfaces. | Design assets and campaigns. | Shells reuse brand/content primitives instead of inventing copy. |
| **Forms** | Form builder, embeds, submissions, analytics, auto-response. | Design intake and review submissions. | Widget/API/landing surfaces collect while the cockpit governs. |
| **Automations** | Workflows, triggers, webhooks, connector actions. | Design playbooks. | Any shell can invoke the same workflow contract. |
| **Discovery** | SEO, AEO, GEO, AIO, schema, canonical domain rules, llms surfaces. | Govern public truth. | Public shells speak answerable, indexable language automatically. |
| **Insights & analytics** | KPIs, pipeline charts, AI reports, subscription analytics, shell health. | Monitor and decide. | Every shell emits telemetry back into one operational view. |
| **Admin** | Feature flags, tier enforcement, audit, usage, shell health. | Protect the platform. | Admin stays hard-locked and invisible to normal tenants. |

## 4. The universal language

Every capability should be described with the same grammar:

```txt
viewer + workspace + capability + shell + intent + constraints + telemetry
```

- **Viewer**: who is acting — owner, staff, customer, anonymous visitor, platform admin, agent.
- **Workspace**: which tenant owns the data and rules.
- **Capability**: the stable thing being invoked, such as `crm.pipeline` or `email.campaigns`.
- **Shell**: the body presenting it — SaaS, widget, kiosk, extension, agent, API, white label.
- **Intent**: what the viewer is trying to do now.
- **Constraints**: tier, role, safety, RLS, usage limits, channel requirements.
- **Telemetry**: heartbeat, success, failure, latency, adoption, and error context.

This is the translation layer. A local shell, foreign shell, future app, or partner interface should not invent a new product. It should translate this same sentence into its native body.

## 5. How to prevent splintering

1. **One registry**: capabilities live in the registry before they become navigation or shell UI.
2. **One contract**: every shell receives viewer/workspace/capability context the same way.
3. **One permission model**: tier and role checks happen consistently across surfaces.
4. **One telemetry stream**: shells report health and capability use into the same dashboard.
5. **One skill grammar**: workflows compose capabilities instead of duplicating business logic.
6. **One brand language**: Kiruvo terms stay generic, premium, and business-neutral.
7. **One public truth**: discovery surfaces inherit schema and answerability from the foundation.

## 6. Operator focus

The operator should spend the most effort on:

- Monitoring shell health and usage.
- Designing workflows, automations, offers, content, and agent behavior.
- Reviewing reports and exceptions.
- Improving the universal language when a new shell exposes a gap.

The operator should not spend the most effort on:

- Rebuilding the same feature for every shell.
- Manually synchronizing labels, permissions, or routes.
- Guessing whether a shell has drifted.
- Copying business logic between mediums.

## 7. Delivery rule

If a new idea cannot be expressed as:

```txt
capability + shell translation + permission + telemetry
```

then it is not ready to ship.

If it can be expressed that way, SaaS should remain the cockpit, and every other shell should become a clean translation of the same engine.
