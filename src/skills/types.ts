import type { Tier } from "@/capabilities/registry";
import type { Viewer } from "@/lib/viewer";

/**
 * Skills — packaged procedural knowledge layered on top of Capabilities.
 * See SKILLS.md for the doctrine.
 */

export type SkillContext = {
  viewer: Viewer;
  planTier: Tier;
  workspaceId: string;
  args: Record<string, unknown>;
  /** Capability invoker — runs through can() and audit logging. */
  invoke: (capabilityKey: string, payload: Record<string, unknown>) => Promise<unknown>;
};

export type SkillStepResult = {
  capability: string;
  status: "ok" | "skipped_entitlement" | "skipped_optional" | "error";
  output?: unknown;
  error?: string;
};

export type SkillResult = {
  skill: string;
  status: "completed" | "partial" | "blocked";
  steps: SkillStepResult[];
  summary: string;
};

export type SkillSpec = {
  key: string;
  name: string;
  description: string;
  /** Natural-language phrases that should trigger this skill in the Agent shell. */
  triggers: string[];
  /** Capability keys this skill may call. Used for surface display + retrieval. */
  capabilities: string[];
  tier: Tier;
  /** Optional file-system reference (mirrors .agents/skills/<key>/SKILL.md). */
  docPath?: string;
  run: (ctx: SkillContext) => Promise<SkillResult>;
};
