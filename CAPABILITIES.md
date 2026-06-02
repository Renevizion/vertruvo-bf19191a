# Kiruvo — Capability Manifest

> **The principle:** Kiruvo is not an app. It is a **capability core** that any shell (SaaS, Widget, Kiosk, Extension, Agent, API) can render. Every capability listed here is available in **every shell**, gated only by tier + workspace permissions — never by surface.

A shell's job is to choose **what to show first**, not what's available. The user can always pivot from the entry capability into the full workspace.

---

## Capability Anatomy

Every capability has:

| Field | Meaning |
|---|---|
| **Key** | Stable machine ID (`crm.leads`, `voice.outbound`) |
| **Tier** | `free` / `starter` / `pro` / `enterprise` |
| **API** | Backing edge functions + tables |
| **Entry Component** | The minimum-viable embeddable React entry |
| **Full View** | The SaaS-grade full surface |
| **Shell Defaults** | Which shells expose it by default vs on-demand |
| **Dependencies** | Other capabilities required (e.g. voice depends on Twilio config) |

---

## The Capability Tree

### 1. Identity & Workspace (`identity.*`)
| Capability | Key | Tier | Default-on Shells |
|---|---|---|---|
| Auth (email + Google) | `identity.auth` | free | all |
| Workspace switching | `identity.workspace` | free | SaaS, Extension |
| Role/permission resolution | `identity.permissions` | free | all (internal) |
| Customer portal | `identity.portal` | free | SaaS, Widget, Kiosk |

### 2. CRM (`crm.*`)
| Capability | Key | Tier | Default-on Shells |
|---|---|---|---|
| Lead capture | `crm.capture` | free | **all** |
| Lead pipeline (Kanban) | `crm.pipeline` | starter | SaaS, Extension |
| Contact dedup + bulk lookup | `crm.contacts` | starter | SaaS |
| Lead scoring rules | `crm.scoring` | pro | SaaS |
| Bulk AI outreach | `crm.bulk_outreach` | pro | SaaS, Agent |
| Lead → customer promotion | `crm.promotion` | starter | SaaS, Kiosk |

### 3. Booking (`booking.*`)
| Capability | Key | Tier | Default-on Shells |
|---|---|---|---|
| Public booking page | `booking.public` | free | Widget, Kiosk |
| Booking sheet (daily ops) | `booking.sheet` | starter | SaaS |
| Group programs | `booking.programs` | starter | SaaS, Widget, Kiosk |
| Renewal automation | `booking.renewals` | pro | SaaS |
| Per-class roster | `booking.roster` | starter | SaaS |

### 4. Payments (`pay.*`)
| Capability | Key | Tier | Default-on Shells |
|---|---|---|---|
| Stripe Connect onboarding | `pay.connect` | starter | SaaS |
| POS + SetupIntent vaulting | `pay.pos` | starter | SaaS, Kiosk |
| Service bundles | `pay.bundles` | starter | SaaS, Widget |
| Subscriptions / memberships | `pay.subs` | pro | SaaS |
| Receipts | `pay.receipts` | free | all |

### 5. AI Agents (`agent.*`)
| Capability | Key | Tier | Default-on Shells |
|---|---|---|---|
| Conversational agent runtime | `agent.chat` | starter | **all** |
| Voice agent (WebRTC) | `agent.voice` | pro | SaaS, Widget, Kiosk, Agent |
| Agent memory | `agent.memory` | pro | all (transparent) |
| Tool calling (CRM/booking/POS) | `agent.tools` | pro | all (transparent) |
| Human handoff protocol | `agent.handoff` | pro | all |
| Form auto-response | `agent.autoresponse` | starter | SaaS |

### 6. Voice & SMS (`comms.*`)
| Capability | Key | Tier | Default-on Shells |
|---|---|---|---|
| Outbound voice (sandbox pool) | `comms.voice` | pro | SaaS, Agent |
| Outbound SMS | `comms.sms` | pro | SaaS, Agent |
| Voicemail drops | `comms.vm` | pro | SaaS |
| Voice broadcasts | `comms.broadcast` | enterprise | SaaS |
| Call transcription | `comms.transcribe` | pro | all |

### 7. Email (`email.*`)
| Capability | Key | Tier | Default-on Shells |
|---|---|---|---|
| Transactional (15 templates) | `email.transactional` | free | all (transparent) |
| Campaigns + scheduling | `email.campaigns` | starter | SaaS |
| Lists & subscribers | `email.lists` | starter | SaaS |
| Drip onboarding | `email.drip` | starter | SaaS (transparent) |
| Deliverability monitor | `email.deliverability` | admin | Admin only |

### 8. Content & Social (`content.*`)
| Capability | Key | Tier | Default-on Shells |
|---|---|---|---|
| Content Hub | `content.hub` | starter | SaaS |
| Flyer builder | `content.flyer` | starter | SaaS |
| Social media unified | `content.social` | pro | SaaS, Extension |
| Brand kits | `content.brand` | starter | all (transparent) |
| Instagram inbox/comments | `content.ig_inbox` | pro | SaaS |

### 9. Forms (`forms.*`)
| Capability | Key | Tier | Default-on Shells |
|---|---|---|---|
| Form builder | `forms.builder` | starter | SaaS |
| Embeddable form | `forms.embed` | free | Widget |
| A/B testing | `forms.ab` | pro | SaaS |
| Analytics | `forms.analytics` | starter | SaaS |

### 10. Automations (`auto.*`)
| Capability | Key | Tier | Default-on Shells |
|---|---|---|---|
| Workflow builder | `auto.workflows` | pro | SaaS |
| Triggers (form/lead/time) | `auto.triggers` | pro | SaaS |
| Webhooks | `auto.webhooks` | pro | SaaS, API |

### 11. Discovery (SEO/AEO/GEO/AIO) (`disco.*`)
| Capability | Key | Tier | Default-on Shells |
|---|---|---|---|
| Schema injection | `disco.schema` | starter | all (transparent) |
| AEO question/answer surfaces | `disco.aeo` | starter | SaaS, Widget |
| GEO local pack data | `disco.geo` | pro | SaaS |
| AI discovery (llms.txt etc) | `disco.aio` | pro | all (transparent) |

### 12. Analytics & Insights (`insights.*`)
| Capability | Key | Tier | Default-on Shells |
|---|---|---|---|
| Dashboard KPIs | `insights.kpi` | starter | SaaS, Kiosk |
| Pipeline visualizations | `insights.pipeline` | starter | SaaS |
| AI insights generation | `insights.ai` | pro | SaaS, Agent |
| Subscription analytics | `insights.subs` | admin | Admin only |

### 13. Admin (`admin.*`)
| Capability | Key | Tier | Default-on Shells |
|---|---|---|---|
| Platform config | `admin.config` | admin | Admin only |
| Feature flags | `admin.flags` | admin | Admin only |
| Audit logs | `admin.audit` | admin | Admin only |
| Backups / exports | `admin.backups` | admin | Admin only |

---

## The Universal Rule

> **Any capability in this table can be invoked from any shell** via the Core Contract (see `CORE_CONTRACT.md`), subject only to:
> 1. Tier gate (`useUsageLimits`)
> 2. Workspace permission (RLS)
> 3. Hard admin lock (platform owner only)

A "Widget" that starts on `booking.public` can — with a single user gesture — reveal `crm.pipeline`, `agent.chat`, `pay.pos`, or any other capability the workspace is entitled to. **The shell is a lens, not a cage.**

---

## Adding a New Capability

1. Add row to this table.
2. Implement under `src/capabilities/<key>/` with `entry.tsx` + `full.tsx` exports.
3. Register in `src/capabilities/registry.ts`.
4. Define edge function under `supabase/functions/cap-<key>/` (if backend needed).
5. Add tier entry to `plan_features`.
6. Every shell automatically picks it up.

That is the leverage.
