import type { Tier } from "@/capabilities/registry";
import type { SubscriptionTier } from "@/hooks/useSubscriptionTier";

/**
 * Map the subscription store's tier name into the capability registry's
 * canonical Tier vocabulary. (`professional` → `pro`.)
 */
export function toRegistryTier(tier: SubscriptionTier | string | null | undefined): Tier {
  switch (tier) {
    case "starter": return "starter";
    case "professional":
    case "pro":
      return "pro";
    case "enterprise": return "enterprise";
    case "admin": return "admin";
    default: return "free";
  }
}
