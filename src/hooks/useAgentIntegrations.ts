import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to fetch agent integration configurations
 * Returns the stored integration configs for a specific agent
 */
export const useAgentIntegrations = (agentId: string | undefined) => {
  return useQuery({
    queryKey: ['agent-integrations', agentId],
    enabled: !!agentId,
    queryFn: async () => {
      if (!agentId) return null;
      
      const { data, error } = await supabase
        .from('ai_agents')
        .select('integration_configs')
        .eq('id', agentId)
        .single();
      
      if (error) throw error;
      return data?.integration_configs as Record<string, Record<string, string>> | null;
    }
  });
};

/**
 * Helper to get a specific integration config value
 */
export const getIntegrationValue = (
  configs: Record<string, Record<string, string>> | null | undefined,
  integrationId: string,
  fieldName: string
): string | undefined => {
  if (!configs) return undefined;
  return configs[integrationId]?.[fieldName];
};
