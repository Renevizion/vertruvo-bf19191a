import { useUsageLimits } from "./useUsageLimits";

type UsageResource = "leads" | "pipelines" | "workflows" | "forms" | "staff" | "agents";

interface LimitAlert {
  resource: UsageResource;
  usage: number;
  limit: number;
  limitHit: boolean;
}

/**
 * Returns the first resource that has hit or is near its limit.
 * Used to auto-trigger UpgradeDialog contextually.
 */
export function useUsageLimitAlert(): LimitAlert | null {
  const { canCreate, getUsage, getLimit, tier, isLoading, isPlatformAdmin } = useUsageLimits();

  if (isLoading || isPlatformAdmin || tier === "enterprise") return null;

  const resources: UsageResource[] = ["leads", "workflows", "forms", "agents", "staff"];

  for (const resource of resources) {
    const limit = getLimit(resource);
    const usage = getUsage(resource);
    if (limit === -1) continue;

    if (usage >= limit) {
      return { resource, usage, limit, limitHit: true };
    }
    // Alert at 90%+
    if (limit > 0 && usage >= limit * 0.9) {
      return { resource, usage, limit, limitHit: false };
    }
  }

  return null;
}
