import type { SkillSpec, SkillResult, SkillStepResult } from "./types";
import { recordShellEvent } from "@/lib/shell-health";

/**
 * Skill registry. Each entry mirrors a SKILL.md under .agents/skills/.
 * Skills compose capabilities — they do not bypass entitlements.
 *
 * Every step emits one telemetry row tagged `metadata.kind="skill_step"`
 * so the Shell Health dashboard can show which playbooks actually run
 * end-to-end. (EMERGENCE.md §IV.30 — Skill-level telemetry.)
 */

const helper = {
  async runStep(
    invoke: (cap: string, payload: Record<string, unknown>) => Promise<unknown>,
    capability: string,
    payload: Record<string, unknown>,
    optional = false,
    skillKey?: string,
  ): Promise<SkillStepResult> {
    const t0 = performance.now();
    try {
      const output = await invoke(capability, payload);
      void recordShellEvent({
        shell: "agent",
        capabilityKey: capability,
        status: "ok",
        latencyMs: Math.round(performance.now() - t0),
        metadata: { kind: "skill_step", skill: skillKey, optional },
      });
      return { capability, status: "ok", output };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status: SkillStepResult["status"] = message.includes("entitlement")
        ? "skipped_entitlement"
        : optional
        ? "skipped_optional"
        : "error";
      void recordShellEvent({
        shell: "agent",
        capabilityKey: capability,
        status: status === "error" ? "error" : "skipped",
        latencyMs: Math.round(performance.now() - t0),
        error: status === "error" ? message : undefined,
        metadata: { kind: "skill_step", skill: skillKey, optional, outcome: status },
      });
      return { capability, status, error: message };
    }
  },
  summarize(skill: string, steps: SkillStepResult[]): SkillResult {
    const hasError = steps.some((s) => s.status === "error");
    const allOk = steps.every((s) => s.status === "ok");
    const status: SkillResult["status"] = hasError ? "blocked" : allOk ? "completed" : "partial";
    const summary = steps
      .map((s) => `${s.capability}: ${s.status}${s.error ? ` (${s.error})` : ""}`)
      .join(" → ");
    return { skill, status, steps, summary };
  },
};

export const SKILLS: Record<string, SkillSpec> = {
  "convert-lead-to-customer": {
    key: "convert-lead-to-customer",
    name: "Convert lead to customer",
    description: "Take a qualified lead, dedupe the contact, promote to a paying customer account, and email a receipt for the first purchase.",
    triggers: ["promote lead", "convert to customer", "ready to book", "sign them up"],
    capabilities: ["crm.contacts", "crm.promotion", "pay.bundles", "pay.receipts"],
    tier: "starter",
    docPath: ".agents/skills/convert-lead-to-customer/SKILL.md",
    async run({ invoke, args }) {
      const steps: SkillStepResult[] = [];
      steps.push(await helper.runStep(invoke, "crm.contacts", { action: "upsert", lead_id: args.leadId }));
      steps.push(await helper.runStep(invoke, "crm.promotion", { lead_id: args.leadId }));
      if (args.bundleId) {
        steps.push(await helper.runStep(invoke, "pay.bundles", { action: "sell", bundle_id: args.bundleId, customer_lead_id: args.leadId }));
        steps.push(await helper.runStep(invoke, "pay.receipts", { action: "email", lead_id: args.leadId }, true));
      }
      return helper.summarize("convert-lead-to-customer", steps);
    },
  },

  "weekly-renewal-sweep": {
    key: "weekly-renewal-sweep",
    name: "Weekly renewal sweep",
    description: "Find programs ending in the next 14 days, sync the roster, and queue renewal outreach to clients flagged Pending.",
    triggers: ["weekly renewals", "renewal sweep", "who needs to renew"],
    capabilities: ["booking.renewals", "booking.roster", "crm.bulk_outreach", "email.campaigns"],
    tier: "pro",
    docPath: ".agents/skills/weekly-renewal-sweep/SKILL.md",
    async run({ invoke, args }) {
      const steps: SkillStepResult[] = [];
      steps.push(await helper.runStep(invoke, "booking.renewals", { window_days: 14 }));
      steps.push(await helper.runStep(invoke, "booking.roster", { action: "sync", item_id: args.itemId, period_label: args.periodLabel }));
      steps.push(await helper.runStep(invoke, "crm.bulk_outreach", { audience: "renewal_pending", item_id: args.itemId }, true));
      steps.push(await helper.runStep(invoke, "email.campaigns", { action: "schedule", template: "renewal_reminder", audience: "renewal_pending" }, true));
      return helper.summarize("weekly-renewal-sweep", steps);
    },
  },

  "publish-weekly-content": {
    key: "publish-weekly-content",
    name: "Publish weekly content",
    description: "Draft a weekly announcement, generate a matching flyer, schedule the social post, and queue the email broadcast — all from one brief.",
    triggers: ["weekly content", "announce this week", "publish update"],
    capabilities: ["content.hub", "content.flyer", "content.social", "email.campaigns"],
    tier: "pro",
    docPath: ".agents/skills/publish-weekly-content/SKILL.md",
    async run({ invoke, args }) {
      const steps: SkillStepResult[] = [];
      steps.push(await helper.runStep(invoke, "content.hub", { action: "create_announcement", brief: args.brief }));
      steps.push(await helper.runStep(invoke, "content.flyer", { action: "create_draft", brief: args.brief }, true));
      steps.push(await helper.runStep(invoke, "content.social", { action: "create_draft", brief: args.brief }, true));
      steps.push(await helper.runStep(invoke, "email.campaigns", { action: "schedule", brief: args.brief }, true));
      return helper.summarize("publish-weekly-content", steps);
    },
  },

  "new-client-intake": {
    key: "new-client-intake",
    name: "New client intake",
    description: "Capture a lead from a public form, score them, book their intro slot, and trigger the welcome auto-response.",
    triggers: ["new client", "intake", "new inquiry"],
    capabilities: ["crm.capture", "crm.scoring", "booking.public", "agent.autoresponse"],
    tier: "starter",
    docPath: ".agents/skills/new-client-intake/SKILL.md",
    async run({ invoke, args }) {
      const steps: SkillStepResult[] = [];
      steps.push(await helper.runStep(invoke, "crm.capture", { ...args }));
      steps.push(await helper.runStep(invoke, "crm.scoring", { lead_id: "$last" }, true));
      if (args.bookingSlot) {
        steps.push(await helper.runStep(invoke, "booking.public", { action: "create", lead_id: "$last", slot: args.bookingSlot }));
      }
      steps.push(await helper.runStep(invoke, "agent.autoresponse", { action: "send_welcome", lead_id: "$last" }, true));
      return helper.summarize("new-client-intake", steps);
    },
  },

  "white-glove-discovery": {
    key: "white-glove-discovery",
    name: "White Glove Discovery audit",
    description: "Audit a surface across all four discovery layers (SEO, AEO, GEO, AIO), produce the gap report, deploy schema + FAQ + llms.txt fixes, and re-validate.",
    triggers: ["white glove", "discovery audit", "geo audit", "aeo audit", "ai discovery", "schema audit", "make me citable", "rank audit"],
    capabilities: ["disco.schema", "disco.aeo", "content.hub"],
    tier: "starter",
    docPath: ".agents/skills/white-glove-discovery/SKILL.md",
    async run({ invoke, args }) {
      const steps: SkillStepResult[] = [];
      steps.push(await helper.runStep(invoke, "disco.schema", { action: "audit", target: args.target ?? "site" }));
      steps.push(await helper.runStep(invoke, "disco.aeo", { action: "audit", target: args.target ?? "site" }, true));
      steps.push(await helper.runStep(invoke, "disco.schema", { action: "deploy", surfaces: ["organization", "faqpage", "softwareapplication"] }, true));
      steps.push(await helper.runStep(invoke, "disco.aeo", { action: "deploy", surfaces: ["llms.txt", "faq_block"] }, true));
      steps.push(await helper.runStep(invoke, "content.hub", { action: "create_announcement", brief: { topic: "discovery_audit_results", target: args.target } }, true));
      return helper.summarize("white-glove-discovery", steps);
    },
  },
};

export function listSkillsForTier(planTier: string): SkillSpec[] {
  const order = ["free", "starter", "pro", "enterprise", "admin"];
  const rank = order.indexOf(planTier);
  return Object.values(SKILLS).filter((s) => order.indexOf(s.tier) <= rank);
}

export function matchSkillByIntent(text: string): SkillSpec | null {
  const lower = text.toLowerCase();
  for (const skill of Object.values(SKILLS)) {
    if (skill.triggers.some((t) => lower.includes(t.toLowerCase()))) return skill;
  }
  return null;
}
