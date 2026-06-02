import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ShellKey } from "@/capabilities/registry";
import type { Viewer } from "./viewer";

/**
 * Shell health telemetry — fire-and-forget heartbeats from any shell.
 * Records to `shell_telemetry` for the admin Shell Health dashboard.
 *
 * See SHELLS.md §"Monitoring & telemetry" and CORE_CONTRACT.md §6.
 */

export type TelemetryEvent = {
  shell: ShellKey;
  workspaceId?: string | null;
  viewerRole?: string;
  capabilityKey?: string;
  status?: "ok" | "error" | "denied" | "skipped";
  latencyMs?: number;
  error?: string;
  metadata?: Record<string, unknown>;
};

export async function recordShellEvent(evt: TelemetryEvent): Promise<void> {
  try {
    // RLS requires a workspace_id; skip anonymous/no-workspace events to avoid 403 spam.
    if (!evt.workspaceId) return;
    const row = {
      shell: evt.shell,
      workspace_id: evt.workspaceId,
      viewer_role: evt.viewerRole ?? null,
      capability_key: evt.capabilityKey ?? null,
      status: evt.status ?? "ok",
      latency_ms: evt.latencyMs ?? null,
      error: evt.error ?? null,
      metadata: (evt.metadata ?? {}) as Record<string, unknown>,
    };
    await (supabase.from("shell_telemetry") as unknown as { insert: (r: unknown) => Promise<unknown> }).insert(row);
  } catch {
    // Telemetry must never break the shell.
  }
}

/** Hook: emits a single "shell mounted" heartbeat per session for the given shell. */
export function useShellHeartbeat(shell: ShellKey, viewer: Viewer | null) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void recordShellEvent({
      shell,
      workspaceId: viewer?.workspaceId ?? null,
      viewerRole: viewer?.role ?? "anon",
      status: "ok",
      metadata: { kind: "heartbeat" },
    });
  }, [shell, viewer?.workspaceId, viewer?.role]);
}

/** Wrap a capability invocation so latency + status are auto-recorded. */
export async function withTelemetry<T>(
  evt: Omit<TelemetryEvent, "status" | "latencyMs" | "error">,
  fn: () => Promise<T>,
): Promise<T> {
  const t0 = performance.now();
  try {
    const out = await fn();
    void recordShellEvent({ ...evt, status: "ok", latencyMs: Math.round(performance.now() - t0) });
    return out;
  } catch (err) {
    void recordShellEvent({
      ...evt,
      status: "error",
      latencyMs: Math.round(performance.now() - t0),
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
