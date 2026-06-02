# Kiruvo — Core Contract

> The technical contract between the **Core** (capabilities, data, auth, billing) and any **Shell** (SaaS, Widget, Kiosk, Extension, Agent, API).
>
> If this contract holds, adding a new shell is a weekend. If it breaks, every shell drifts.

---

## 1. Capability Registry

Single source of truth: `src/capabilities/registry.ts`.

```ts
export type Capability = {
  key: string;                          // e.g. "crm.pipeline"
  group: "identity" | "crm" | "booking" | "pay" | "agent" | "comms"
       | "email" | "content" | "forms" | "auto" | "disco" | "insights" | "admin";
  tier: "free" | "starter" | "pro" | "enterprise" | "admin";
  label: string;
  description: string;
  icon: LucideIcon;
  entry: () => Promise<{ default: ComponentType<CapabilityProps> }>;   // small embeddable
  full:  () => Promise<{ default: ComponentType<CapabilityProps> }>;   // full SaaS view
  shellDefaults: ShellKey[];            // which shells show it on entry
  dependsOn?: string[];                 // other capability keys
  requiresIntegration?: string[];       // e.g. ["twilio"], ["stripe_connect"]
};

export const CAPABILITIES: Record<string, Capability> = { /* … */ };
```

Every shell consumes this registry. **No shell hardcodes capability lists.**

### `CapabilityProps`

```ts
type CapabilityProps = {
  shell: ShellKey;             // "saas" | "widget" | "kiosk" | "extension" | "agent" | "api" | "wl"
  workspaceId: string;
  viewer: Viewer;              // resolved identity
  mode: "entry" | "full";      // which view to render
  context?: Record<string, unknown>;  // shell-injected context (page URL, kiosk PIN, etc)
  onExpand?: () => void;       // call to switch from entry → full
  onInvoke?: (cap: string) => void;   // call to navigate to another capability
};
```

---

## 2. Universal Identity Token

One token format, scoped derivatives.

| Token | Issued by | Scope | Used by shells |
|---|---|---|---|
| **Supabase JWT** | Supabase Auth | full user, all workspaces they belong to | SaaS, Extension, Kiosk (staff), WL |
| **Embed Token** | `issue-embed-token` edge fn | one workspace, one viewer, capability allowlist, TTL | Widget |
| **Kiosk Token** | `issue-kiosk-token` edge fn | one workspace, customer-anon role, no PII writes outside booking/form/POS | Kiosk (customer mode) |
| **API Key** | `/api-docs` key manager | one workspace, machine identity, full capability set per tier | API |
| **Anon** | none | public capabilities only (`crm.capture`, `booking.public`, `forms.embed`) | Widget, Kiosk, Agent |

All tokens resolve through one function:

```ts
// src/lib/viewer.ts
export async function resolveViewer(req: Request): Promise<Viewer> { /* … */ }

type Viewer = {
  kind: "user" | "embed" | "kiosk" | "api" | "anon";
  userId?: string;
  workspaceId?: string;
  role?: "owner" | "admin" | "staff" | "customer" | "anon";
  allowedCapabilities?: string[];   // null = all entitled
};
```

Every edge function calls `resolveViewer` first. RLS still enforces — viewer is a **convenience layer**, not the security boundary.

---

## 3. Entitlement Check (one function, every shell)

```ts
// src/lib/can.ts
export function can(viewer: Viewer, capability: string, tier: Tier): boolean {
  // 1. Admin override
  if (viewer.userId === PLATFORM_OWNER_ID) return true;
  // 2. Tier gate
  if (!tierIncludes(tier, CAPABILITIES[capability].tier)) return false;
  // 3. Role gate
  if (!roleAllows(viewer.role, capability)) return false;
  // 4. Embed allowlist
  if (viewer.allowedCapabilities && !viewer.allowedCapabilities.includes(capability)) return false;
  return true;
}
```

Used identically in SaaS, Widget, Kiosk, Extension, Agent. Edge functions enforce via existing `checkUsageGate`.

---

## 4. Progressive Expansion Protocol

How a shell goes from "small entry" to "full workspace" without breaking context.

```
[Entry Component]
   │  user gesture: "More" / "Expand" / "Open full"
   ▼
[Shell calls onExpand()]
   │
   ▼
[Shell mounts <CapabilityBrowser /> with viewer + workspace]
   │  CapabilityBrowser lists every capability where can(viewer, key, tier) === true
   │  Filtered by group, searchable, grouped by frequency-of-use
   ▼
[User picks capability X]
   │
   ▼
[Shell mounts CAPABILITIES[X].full() with same viewer/workspace/context]
```

Implementation: `src/capabilities/CapabilityBrowser.tsx` — one component, every shell uses it.

For shells where "open full SaaS in new tab" makes sense (Widget, Extension popup), the browser also offers a "Launch full workspace" action that:
1. Mints a short-lived session-handoff token.
2. Opens `kiruvo.com/handoff?token=…` in a new tab.
3. SaaS shell consumes the token, establishes Supabase session, redirects to the capability the user was on.

---

## 5. Shell Adapter Interface

Each shell is a package (or folder) that exports:

```ts
export type ShellAdapter = {
  key: ShellKey;
  mount: (root: HTMLElement, config: ShellConfig) => Promise<ShellInstance>;
  defaultEntry: (workspace: Workspace) => string;   // capability key
  chrome: ChromeConfig;                              // header? sidebar? branding?
  auth: AuthStrategy;                                // how to resolve viewer
};
```

Folders:

```
src/shells/
├── saas/           # current app, wraps src/App.tsx
├── widget/         # embed.js entrypoint + drawer UI
├── kiosk/          # PWA manifest + idle/PIN logic
├── extension/      # MV3 popup + side panel
├── agent/          # standalone chat/voice
├── api/            # OpenAPI doc generator (no UI)
└── wl/             # white-label theming wrapper around saas
```

---

## 6. Data & Security Invariants

These cannot be violated by any shell:

1. **RLS is the only security boundary.** Viewer/can() are convenience. Every table has policies tied to `is_workspace_member` or `has_role`.
2. **No client-side admin checks.** `is_platform_admin` is server-only.
3. **Edge functions always re-verify** JWT/embed/kiosk/API tokens. They do not trust client-supplied workspace IDs.
4. **No money path bypasses Stripe Connect.** Every charge in every shell flows through the same `stripe-*` edge functions.
5. **Workspace-scoped storage paths** in `assets/` and `email-assets/`.
6. **Realtime channels carry workspace_id filters** at subscription time, validated by RLS.
7. **Tier gating happens server-side** in `checkUsageGate`. Client gating is UX, not security.

---

## 7. Implementation Phases

### Phase A — Foundation (week 1)
- [ ] `src/capabilities/registry.ts` with the full table from `CAPABILITIES.md` (start with current SaaS capabilities; entry/full pointing to existing components).
- [ ] `src/lib/viewer.ts` + `src/lib/can.ts`.
- [ ] `src/capabilities/CapabilityBrowser.tsx`.
- [ ] Refactor current SaaS sidebar to read from registry (proves the contract on what we already ship).

### Phase B — First Non-SaaS Shell (week 2)
- [ ] Widget shell + `embed.js` + `issue-embed-token` edge function + handoff flow.
- [ ] Drawer UI with default entry + "More" → CapabilityBrowser.
- [ ] Documentation page at `/embed-docs`.

### Phase C — Agent Shell (week 3)
- [ ] Standalone agent at `agent.kiruvo.com/<slug>`.
- [ ] Inline capability cards (booking, POS, portal) the agent can render mid-conversation.

### Phase D — Kiosk + Extension (week 4–5)
- [ ] PWA manifest, idle/PIN, kiosk token.
- [ ] Chrome MV3 popup + side panel + extension auth bridge.

### Phase E — White-Label + API polish (week 6)
- [ ] Theme adapter, custom domain wiring.
- [ ] OpenAPI doc generator from registry.

---

## 8. The Test

The contract works if and only if:

> **A capability added to `registry.ts` appears in every entitled shell on next deploy, with zero per-shell code changes.**

If that's not true, the contract is broken. Fix it before shipping more capabilities.
