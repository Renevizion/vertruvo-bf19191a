import type { ComponentType, LazyExoticComponent } from "react";
import { lazy } from "react";

/**
 * Capability Registry — single source of truth for what Thermi can do.
 * Every shell (SaaS, Widget, Kiosk, Extension, Agent, API) reads from this.
 *
 * See CAPABILITIES.md, SHELLS.md, CORE_CONTRACT.md at project root.
 */

export type ShellKey = "saas" | "widget" | "kiosk" | "extension" | "agent" | "api" | "wl";
export type Tier = "free" | "starter" | "pro" | "enterprise" | "admin";
export type CapabilityGroup =
  | "identity" | "crm" | "booking" | "pay" | "agent" | "comms"
  | "email" | "content" | "forms" | "auto" | "disco" | "insights" | "admin";

export type CapabilityProps = {
  shell: ShellKey;
  workspaceId: string;
  viewerRole: "owner" | "admin" | "staff" | "customer" | "anon";
  mode: "entry" | "full";
  context?: Record<string, unknown>;
  onExpand?: () => void;
  onInvoke?: (capabilityKey: string) => void;
};

export type Capability = {
  key: string;
  group: CapabilityGroup;
  tier: Tier;
  label: string;
  description: string;
  /** Lazy SaaS route path when applicable. Shells use this for handoff. */
  saasPath?: string;
  /**
   * Public, embeddable path for anon viewers. May contain `:workspaceSlug`
   * which the ShellRenderer substitutes at runtime. When set, the capability
   * renders inside the shell (sheet/iframe) instead of bouncing to the SaaS app.
   */
  publicPath?: string;
  /** Which shells expose this on first paint. Others can still reach it via CapabilityBrowser. */
  shellDefaults: ShellKey[];
  dependsOn?: string[];
  requiresIntegration?: string[];
  /** Optional lazy entry/full views. Phase A registers metadata; components attached as built. */
  entry?: LazyExoticComponent<ComponentType<CapabilityProps>>;
  full?: LazyExoticComponent<ComponentType<CapabilityProps>>;
};

const TIER_RANK: Record<Tier, number> = {
  free: 0, starter: 1, pro: 2, enterprise: 3, admin: 99,
};

export function tierIncludes(planTier: Tier, requiredTier: Tier): boolean {
  if (requiredTier === "admin") return planTier === "admin";
  return TIER_RANK[planTier] >= TIER_RANK[requiredTier];
}

/**
 * Phase A: metadata-first registry. Wire entry/full lazy imports as components are
 * extracted from existing pages into src/capabilities/<key>/{entry,full}.tsx.
 */
export const CAPABILITIES: Record<string, Capability> = {
  // Identity
  "identity.auth":       { key: "identity.auth", group: "identity", tier: "free", label: "Sign in", description: "Email + Google auth", saasPath: "/auth", shellDefaults: ["saas", "widget", "kiosk", "extension", "agent", "wl"] },
  "identity.workspace":  { key: "identity.workspace", group: "identity", tier: "free", label: "Workspace", description: "Switch workspaces", saasPath: "/settings", shellDefaults: ["saas", "extension", "wl"] },
  "identity.portal":     { key: "identity.portal", group: "identity", tier: "free", label: "Customer Portal", description: "Self-service for clients", saasPath: "/portal", publicPath: "/portal/login/:workspaceSlug", shellDefaults: ["saas", "widget", "kiosk", "wl"] },

  // CRM
  "crm.capture":         { key: "crm.capture", group: "crm", tier: "free", label: "Sign Up / Leave a Note", description: "Capture a lead with name, contact, and message", saasPath: "/leads", publicPath: "/book/:workspaceSlug?intent=capture", shellDefaults: ["saas", "widget", "kiosk", "extension", "agent", "wl"] },
  "crm.pipeline":        { key: "crm.pipeline", group: "crm", tier: "starter", label: "Pipeline", description: "Kanban lead board", saasPath: "/leads", shellDefaults: ["saas", "extension", "wl"] },
  "crm.contacts":        { key: "crm.contacts", group: "crm", tier: "starter", label: "Contacts", description: "Contact directory with dedup", saasPath: "/contacts", shellDefaults: ["saas", "wl"] },
  "crm.scoring":         { key: "crm.scoring", group: "crm", tier: "pro", label: "Lead Scoring", description: "Rule-based scoring", saasPath: "/leads", shellDefaults: ["saas", "wl"] },
  "crm.bulk_outreach":   { key: "crm.bulk_outreach", group: "crm", tier: "pro", label: "Bulk Outreach", description: "AI-tailored outreach to many leads", saasPath: "/outreach", shellDefaults: ["saas", "agent", "wl"] },
  "crm.promotion":       { key: "crm.promotion", group: "crm", tier: "starter", label: "Promote to Customer", description: "Lead → customer account", saasPath: "/customers", shellDefaults: ["saas", "kiosk", "wl"] },

  // Booking
  "booking.public":      { key: "booking.public", group: "booking", tier: "free", label: "Book a Time", description: "Public booking page", saasPath: "/book", publicPath: "/book/:workspaceSlug", shellDefaults: ["widget", "kiosk", "agent", "wl"] },
  "booking.sheet":       { key: "booking.sheet", group: "booking", tier: "starter", label: "Booking Sheet", description: "Daily ops view", saasPath: "/booking-sheet", shellDefaults: ["saas", "wl"] },
  "booking.programs":    { key: "booking.programs", group: "booking", tier: "starter", label: "Programs", description: "Group programs & enrollment", saasPath: "/customers", publicPath: "/book/:workspaceSlug?type=program", shellDefaults: ["saas", "widget", "kiosk", "wl"] },
  "booking.renewals":    { key: "booking.renewals", group: "booking", tier: "pro", label: "Renewals", description: "Proactive renewal automation", saasPath: "/renewals", shellDefaults: ["saas", "wl"] },
  "booking.roster":      { key: "booking.roster", group: "booking", tier: "starter", label: "Rosters", description: "Per-class renewal roster", saasPath: "/renewals", shellDefaults: ["saas", "wl"] },

  // Payments
  "pay.connect":         { key: "pay.connect", group: "pay", tier: "starter", label: "Stripe Connect", description: "Onboard payouts", saasPath: "/settings", requiresIntegration: ["stripe_connect"], shellDefaults: ["saas", "wl"] },
  "pay.pos":             { key: "pay.pos", group: "pay", tier: "starter", label: "Point of Sale", description: "Charge cards in person", saasPath: "/customers", requiresIntegration: ["stripe_connect"], shellDefaults: ["saas", "kiosk", "wl"] },
  "pay.bundles":         { key: "pay.bundles", group: "pay", tier: "starter", label: "Bundles", description: "Multi-session packages", saasPath: "/customers", shellDefaults: ["saas", "widget", "wl"] },
  "pay.subs":            { key: "pay.subs", group: "pay", tier: "pro", label: "Memberships", description: "Recurring subscriptions", saasPath: "/customers", shellDefaults: ["saas", "wl"] },
  "pay.receipts":        { key: "pay.receipts", group: "pay", tier: "free", label: "Receipts", description: "Itemized receipts", shellDefaults: ["saas", "widget", "kiosk", "extension", "agent", "wl"] },

  // AI Agents
  "agent.chat":          { key: "agent.chat", group: "agent", tier: "starter", label: "Ask the Agent", description: "Chat with our AI assistant 24/7", saasPath: "/ai-agents", shellDefaults: ["saas", "widget", "kiosk", "extension", "agent", "wl"] },
  "agent.voice":         { key: "agent.voice", group: "agent", tier: "pro", label: "Voice Agent", description: "WebRTC voice receptionist", saasPath: "/voice-campaigns", requiresIntegration: ["twilio", "elevenlabs"], shellDefaults: ["saas", "widget", "kiosk", "agent", "wl"] },
  "agent.autoresponse":  { key: "agent.autoresponse", group: "agent", tier: "starter", label: "Form Auto-Response", description: "AI or template replies", saasPath: "/forms", shellDefaults: ["saas", "wl"] },

  // Comms
  "comms.voice":         { key: "comms.voice", group: "comms", tier: "pro", label: "Outbound Calls", description: "Sandbox or BYO Twilio", saasPath: "/call-analytics", requiresIntegration: ["twilio"], shellDefaults: ["saas", "agent", "wl"] },
  "comms.sms":           { key: "comms.sms", group: "comms", tier: "pro", label: "SMS", description: "Outbound SMS", requiresIntegration: ["twilio"], shellDefaults: ["saas", "agent", "wl"] },
  "comms.broadcast":     { key: "comms.broadcast", group: "comms", tier: "enterprise", label: "Voice Broadcast", description: "Bulk voice campaigns", saasPath: "/voice-campaigns", requiresIntegration: ["twilio"], shellDefaults: ["saas", "wl"] },

  // Email
  "email.campaigns":     { key: "email.campaigns", group: "email", tier: "starter", label: "Email Campaigns", description: "Visual scheduler", saasPath: "/email-campaigns", shellDefaults: ["saas", "wl"] },
  "email.lists":         { key: "email.lists", group: "email", tier: "starter", label: "Email Lists", description: "Subscriber management", saasPath: "/email-lists", shellDefaults: ["saas", "wl"] },

  // Content & Social
  "content.hub":         { key: "content.hub", group: "content", tier: "starter", label: "Content Hub", description: "Class & announcement distribution", saasPath: "/content", shellDefaults: ["saas", "wl"] },
  "content.flyer":       { key: "content.flyer", group: "content", tier: "starter", label: "Flyers", description: "Canva-style printable builder", saasPath: "/content", shellDefaults: ["saas", "wl"] },
  "content.social":      { key: "content.social", group: "content", tier: "pro", label: "Social Media", description: "Unified social interface", saasPath: "/social-media", shellDefaults: ["saas", "extension", "wl"] },

  // Forms
  "forms.builder":       { key: "forms.builder", group: "forms", tier: "starter", label: "Form Builder", description: "Drag-and-drop forms", saasPath: "/forms", shellDefaults: ["saas", "wl"] },
  "forms.embed":         { key: "forms.embed", group: "forms", tier: "free", label: "Embeddable Form", description: "Drop-in form for any site", shellDefaults: ["widget", "kiosk", "wl"] },
  "forms.ab":            { key: "forms.ab", group: "forms", tier: "pro", label: "Form A/B", description: "Variant testing", saasPath: "/forms", shellDefaults: ["saas", "wl"] },

  // Automations
  "auto.workflows":      { key: "auto.workflows", group: "auto", tier: "pro", label: "Workflows", description: "Trigger-based automation", saasPath: "/automations", shellDefaults: ["saas", "wl"] },
  "auto.webhooks":       { key: "auto.webhooks", group: "auto", tier: "pro", label: "Webhooks", description: "Outbound webhook subs", saasPath: "/settings", shellDefaults: ["saas", "api", "wl"] },

  // Discovery
  "disco.schema":        { key: "disco.schema", group: "disco", tier: "starter", label: "Schema", description: "JSON-LD injection", shellDefaults: ["saas", "widget", "kiosk", "agent", "wl"] },
  "disco.aeo":           { key: "disco.aeo", group: "disco", tier: "starter", label: "AEO", description: "Answer-engine surfaces", shellDefaults: ["saas", "widget", "wl"] },

  // Insights
  "insights.kpi":        { key: "insights.kpi", group: "insights", tier: "starter", label: "Dashboard", description: "KPI dashboard", saasPath: "/dashboard", shellDefaults: ["saas", "kiosk", "wl"] },
  "insights.pipeline":   { key: "insights.pipeline", group: "insights", tier: "starter", label: "Pipeline Insights", description: "Pipeline visualizations", saasPath: "/dashboard", shellDefaults: ["saas", "wl"] },
  "insights.ai":         { key: "insights.ai", group: "insights", tier: "pro", label: "AI Insights", description: "Generated patterns & next actions", saasPath: "/insights", shellDefaults: ["saas", "agent", "wl"] },

  // Admin (platform owner only)
  "admin.config":        { key: "admin.config", group: "admin", tier: "admin", label: "Platform Config", description: "Platform-wide settings", saasPath: "/admin", shellDefaults: ["saas"] },
};

export function listCapabilitiesFor(shell: ShellKey, planTier: Tier): Capability[] {
  return Object.values(CAPABILITIES).filter(c => tierIncludes(planTier, c.tier));
}

export function defaultCapabilitiesFor(shell: ShellKey, planTier: Tier): Capability[] {
  return listCapabilitiesFor(shell, planTier).filter(c => c.shellDefaults.includes(shell));
}
