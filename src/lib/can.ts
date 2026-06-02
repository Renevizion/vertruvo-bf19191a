import { CAPABILITIES, tierIncludes, type Tier } from "@/capabilities/registry";
import type { Viewer } from "./viewer";

const PLATFORM_OWNER_ID = "1c391eff-d1bf-415c-ac43-1e64697220eb";

/**
 * The one entitlement check. Used by every shell.
 * Server-side enforcement still happens via RLS + checkUsageGate.
 *
 * See CORE_CONTRACT.md §3.
 */
export function can(viewer: Viewer, capabilityKey: string, planTier: Tier): boolean {
  const cap = CAPABILITIES[capabilityKey];
  if (!cap) return false;

  // 1. Platform owner override
  if (viewer.userId === PLATFORM_OWNER_ID) return true;

  // 2. Admin-only capabilities
  if (cap.tier === "admin") return false;

  // 3. Tier gate
  if (!tierIncludes(planTier, cap.tier)) return false;

  // 4. Role gate — customers can only reach a defined subset
  if (viewer.role === "customer") {
    const customerAllowed = new Set([
      "identity.portal", "booking.public", "booking.programs",
      "pay.receipts", "pay.bundles", "pay.subs",
      "agent.chat", "forms.embed",
    ]);
    if (!customerAllowed.has(capabilityKey)) return false;
  }

  // 5. Anonymous viewers — public capture surfaces only
  if (viewer.role === "anon") {
    const anonAllowed = new Set([
      "crm.capture", "booking.public", "forms.embed",
      "agent.chat", "identity.auth",
    ]);
    if (!anonAllowed.has(capabilityKey)) return false;
  }

  // 6. Embed allowlist
  if (viewer.allowedCapabilities && !viewer.allowedCapabilities.includes(capabilityKey)) return false;

  return true;
}
