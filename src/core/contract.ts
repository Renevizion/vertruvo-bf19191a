/**
 * Thermi Core Contract
 *
 * The universal grammar every shell speaks:
 *   viewer + workspace + capability + shell + intent + constraints + telemetry
 *
 * This file is the single source of truth for that sentence. It does NOT
 * hold UI. Shells/skills/agents/api all funnel capability calls through
 * `invokeCapability` here, which enforces:
 *   1. Capability exists in the registry
 *   2. `can()` says the viewer is entitled
 *   3. `withTelemetry()` emits a structured event to `shell_telemetry`
 *
 * If it cannot be expressed as
 *   capability + shell translation + permission + telemetry
 * then it is not ready to ship. (KIRUVO_DELIVERY_ENGINE.md §7)
 */
import { CAPABILITIES, type ShellKey, type Tier } from "@/capabilities/registry";
import { can } from "@/lib/can";
import type { Viewer } from "@/lib/viewer";
import { withTelemetry, recordShellEvent } from "@/lib/shell-health";

export type Intent =
  | "view" | "create" | "update" | "delete"
  | "send" | "schedule" | "charge" | "refund"
  | "invoke" | "deeplink" | "skill_step" | "audit";

export type CapabilityCall = {
  viewer: Viewer;
  workspaceId: string;
  capabilityKey: string;
  shell: ShellKey;
  intent: Intent;
  planTier: Tier;
  payload?: Record<string, unknown>;
  /** Free-form metadata appended to telemetry. */
  meta?: Record<string, unknown>;
};

export type CapabilityResult<T = unknown> =
  | { ok: true; value: T }
  | { ok: false; reason: "unknown_capability" | "denied" | "error"; message: string };

/**
 * The one entry point every shell uses.
 *
 * Pass `executor` to actually do work; if omitted the call is a no-op that
 * still records intent + entitlement to telemetry. That makes idle shells
 * legible in `/admin/shells` and feeds the "what shell actually uses X"
 * adoption graph.
 */
export async function invokeCapability<T = unknown>(
  call: CapabilityCall,
  executor?: () => Promise<T>,
): Promise<CapabilityResult<T>> {
  const cap = CAPABILITIES[call.capabilityKey];
  if (!cap) {
    void recordShellEvent({
      shell: call.shell, workspaceId: call.workspaceId, viewerRole: call.viewer.role,
      capabilityKey: call.capabilityKey, status: "error", error: "unknown_capability",
      metadata: { intent: call.intent, ...(call.meta ?? {}) },
    });
    return { ok: false, reason: "unknown_capability", message: `Unknown capability: ${call.capabilityKey}` };
  }

  if (!can(call.viewer, call.capabilityKey, call.planTier)) {
    void recordShellEvent({
      shell: call.shell, workspaceId: call.workspaceId, viewerRole: call.viewer.role,
      capabilityKey: call.capabilityKey, status: "denied",
      metadata: { intent: call.intent, tier: call.planTier, capTier: cap.tier, ...(call.meta ?? {}) },
    });
    return { ok: false, reason: "denied", message: `Not entitled: ${call.capabilityKey}` };
  }

  if (!executor) {
    void recordShellEvent({
      shell: call.shell, workspaceId: call.workspaceId, viewerRole: call.viewer.role,
      capabilityKey: call.capabilityKey, status: "ok",
      metadata: { intent: call.intent, kind: "intent_only", ...(call.meta ?? {}) },
    });
    return { ok: true, value: undefined as unknown as T };
  }

  try {
    const value = await withTelemetry(
      {
        shell: call.shell,
        workspaceId: call.workspaceId,
        viewerRole: call.viewer.role,
        capabilityKey: call.capabilityKey,
        metadata: { intent: call.intent, ...(call.meta ?? {}) },
      },
      executor,
    );
    return { ok: true, value };
  } catch (err) {
    return { ok: false, reason: "error", message: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Convenience: build a bound invoker for a shell + viewer + workspace + tier.
 * Useful inside shells / skills so they don't have to repeat the context.
 */
export function boundInvoker(args: { shell: ShellKey; viewer: Viewer; workspaceId: string; planTier: Tier }) {
  return async <T = unknown>(capabilityKey: string, intent: Intent, executor?: () => Promise<T>, meta?: Record<string, unknown>) =>
    invokeCapability<T>({ ...args, capabilityKey, intent, meta }, executor);
}
