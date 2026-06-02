import { CAPABILITIES, type Tier } from "@/capabilities/registry";
import { can } from "@/lib/can";
import type { Viewer } from "@/lib/viewer";
import { SKILLS } from "./registry";
import type { SkillResult } from "./types";

/**
 * Entitlement-aware skill executor.
 * `invokeCapability` is the host-supplied dispatcher (Agent runtime edge fn,
 * or a client-side stub for SaaS shell experimentation).
 */
export async function runSkill(opts: {
  skillKey: string;
  viewer: Viewer;
  planTier: Tier;
  workspaceId: string;
  args?: Record<string, unknown>;
  invokeCapability: (capabilityKey: string, payload: Record<string, unknown>) => Promise<unknown>;
}): Promise<SkillResult> {
  const skill = SKILLS[opts.skillKey];
  if (!skill) {
    return {
      skill: opts.skillKey,
      status: "blocked",
      steps: [],
      summary: `Unknown skill: ${opts.skillKey}`,
    };
  }

  const gatedInvoke = async (capabilityKey: string, payload: Record<string, unknown>) => {
    if (!CAPABILITIES[capabilityKey]) throw new Error(`Unknown capability: ${capabilityKey}`);
    if (!can(opts.viewer, capabilityKey, opts.planTier)) {
      throw new Error(`entitlement denied: ${capabilityKey}`);
    }
    return opts.invokeCapability(capabilityKey, payload);
  };

  return skill.run({
    viewer: opts.viewer,
    planTier: opts.planTier,
    workspaceId: opts.workspaceId,
    args: opts.args ?? {},
    invoke: gatedInvoke,
  });
}
