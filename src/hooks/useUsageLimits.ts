import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSubscriptionTier } from "./useSubscriptionTier";
import { useIsPlatformAdmin } from "./useIsAdmin";

// Tier-based limits
const TIER_LIMITS: Record<string, Record<string, number>> = {
  free: { leads: 25, pipelines: 1, workflows: 2, forms: 2, staff: 2, agents: 1 },
  starter: { leads: 500, pipelines: 1, workflows: 5, forms: 5, staff: 2, agents: 3 },
  professional: { leads: 2500, pipelines: -1, workflows: 25, forms: 25, staff: 11, agents: 10 },
  enterprise: { leads: -1, pipelines: -1, workflows: -1, forms: -1, staff: -1, agents: -1 },
};

interface UsageData {
  leads: number;
  pipelines: number;
  workflows: number;
  forms: number;
  staff: number;
  agents: number;
}

export const useUsageLimits = () => {
  const { data: subscription, isLoading: subLoading } = useSubscriptionTier();
  const { isPlatformAdmin, isLoading: adminLoading } = useIsPlatformAdmin();
  const tier = subscription?.tier || 'free';
  const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;

  const { data: usage, isLoading } = useQuery({
    queryKey: ['usage-counts', tier],
    queryFn: async (): Promise<UsageData> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { leads: 0, pipelines: 0, workflows: 0, forms: 0, staff: 0, agents: 0 };

      const { data: ws } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (!ws) return { leads: 0, pipelines: 0, workflows: 0, forms: 0, staff: 0, agents: 0 };

      const wid = ws.workspace_id;

      const [leads, pipelines, workflows, forms, staff, agents] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('workspace_id', wid),
        supabase.from('pipelines').select('id', { count: 'exact', head: true }).eq('workspace_id', wid),
        supabase.from('workflows').select('id', { count: 'exact', head: true }).eq('workspace_id', wid),
        supabase.from('forms').select('id', { count: 'exact', head: true }).eq('workspace_id', wid),
        supabase.from('workspace_members').select('id', { count: 'exact', head: true }).eq('workspace_id', wid),
        supabase.from('ai_agents').select('id', { count: 'exact', head: true }).eq('workspace_id', wid),
      ]);

      return {
        leads: leads.count || 0,
        pipelines: pipelines.count || 0,
        workflows: workflows.count || 0,
        forms: forms.count || 0,
        staff: staff.count || 0,
        agents: agents.count || 0,
      };
    },
    staleTime: 30 * 1000,
  });

  const canCreate = (resource: keyof UsageData): boolean => {
    if (isPlatformAdmin) return true; // Admin bypasses all limits
    if (!usage) return true;
    const limit = limits[resource];
    if (limit === -1) return true;
    return usage[resource] < limit;
  };

  const getLimit = (resource: keyof UsageData): number => {
    if (isPlatformAdmin) return -1;
    return limits[resource] ?? 0;
  };
  const getUsage = (resource: keyof UsageData): number => usage?.[resource] ?? 0;
  const isNearLimit = (resource: keyof UsageData): boolean => {
    if (isPlatformAdmin) return false;
    const limit = limits[resource];
    if (limit === -1) return false;
    const current = usage?.[resource] ?? 0;
    return current >= limit * 0.8;
  };

  return { canCreate, getLimit, getUsage, isNearLimit, tier, limits, usage, isLoading: isLoading || subLoading || adminLoading, isPlatformAdmin };
};
