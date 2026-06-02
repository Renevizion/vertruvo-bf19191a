// Sandbox pool helper: lets eligible workspaces try Twilio voice/SMS on the
// platform's number with a hard cap before they BYO Twilio. Falls back to BYO when present.
//
// Tier model:
//  - Starter: no voice access at all (gated upstream too).
//  - Pro: gets a small sandbox pool to experience the feature, then BYO themselves.
//  - Enterprise: larger pool + white-glove BYO/subaccount setup (manual for now).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

export const SANDBOX_CAPS_BY_TIER: Record<string, { call: number; sms: number; voicemail: number }> = {
  free:         { call: 0,   sms: 0,   voicemail: 0 },
  starter:      { call: 0,   sms: 0,   voicemail: 0 },
  professional: { call: 10,  sms: 10,  voicemail: 10 },
  enterprise:   { call: 100, sms: 100, voicemail: 100 },
};

export type SandboxKind = "call" | "sms" | "voicemail";

export interface FromNumberResult {
  ok: true;
  fromNumber: string;
  isSandbox: boolean;
  used?: number;
  cap?: number;
  tier?: string;
}
export interface FromNumberError {
  ok: false;
  error: string;
  code: "NO_NUMBER" | "SANDBOX_CAP_REACHED" | "TIER_NOT_ALLOWED";
  used?: number;
  cap?: number;
  tier?: string;
}

const PLATFORM_OWNER_ID = "1c391eff-d1bf-415c-ac43-1e64697220eb";

async function getWorkspaceTier(admin: ReturnType<typeof createClient>, workspaceId: string): Promise<string> {
  const { data: ws } = await admin.from("workspaces").select("owner_id").eq("id", workspaceId).maybeSingle();
  if ((ws as any)?.owner_id === PLATFORM_OWNER_ID) return "enterprise"; // admin bypass
  const { data: sub } = await admin
    .from("subscriptions")
    .select("plan_id, status")
    .eq("workspace_id", workspaceId)
    .in("status", ["active", "trial"])
    .maybeSingle();
  return ((sub as any)?.plan_id as string) || "free";
}

/**
 * Resolve which Twilio "From" number to use for a workspace.
 *  1. If the workspace has its own active Twilio number → use it (no sandbox limits).
 *  2. Else, if their tier allows sandbox AND platform sandbox number is configured →
 *     atomically increment usage; allow if under cap.
 */
export async function resolveFromNumber(
  workspaceId: string,
  kind: SandboxKind,
): Promise<FromNumberResult | FromNumberError> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: byo } = await admin
    .from("twilio_phone_numbers")
    .select("phone_number")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if ((byo as any)?.phone_number) {
    return { ok: true, fromNumber: (byo as any).phone_number, isSandbox: false };
  }

  const tier = await getWorkspaceTier(admin, workspaceId);
  const caps = SANDBOX_CAPS_BY_TIER[tier] || SANDBOX_CAPS_BY_TIER.free;
  const cap = caps[kind];

  if (cap <= 0) {
    return {
      ok: false,
      code: "TIER_NOT_ALLOWED",
      tier,
      error: "Voice & SMS are available on the Pro plan and above. Upgrade to start a sandbox trial, or connect your own Twilio number.",
    };
  }

  const sandboxNumber = Deno.env.get("TWILIO_SANDBOX_FROM_NUMBER");
  if (!sandboxNumber) {
    return {
      ok: false,
      error: "No Twilio number is connected for this workspace. Add your Twilio number in Settings → Twilio.",
      code: "NO_NUMBER",
      tier,
    };
  }

  const { data, error } = await admin.rpc("increment_sandbox_usage", {
    _workspace_id: workspaceId,
    _kind: kind,
    _cap: cap,
  });
  if (error) {
    console.error("[sandbox] increment failed", error);
    return { ok: false, error: "Sandbox usage check failed.", code: "NO_NUMBER", tier };
  }
  const allowed = (data as any)?.allowed === true;
  const used = (data as any)?.used ?? 0;
  if (!allowed) {
    return {
      ok: false,
      code: "SANDBOX_CAP_REACHED",
      used,
      cap,
      tier,
      error: `You've used your ${cap} free sandbox ${kind === "sms" ? "messages" : kind + "s"}. Connect your own Twilio number in Settings → Twilio to keep going.`,
    };
  }

  return { ok: true, fromNumber: sandboxNumber, isSandbox: true, used, cap, tier };
}
