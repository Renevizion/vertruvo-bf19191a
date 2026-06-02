import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  groupLeadsBySource, 
  calculateSourcePercentages, 
  buildConversionFunnel 
} from "@/lib/analytics-helpers";

export const useAnalyticsData = () => {
  return useQuery({
    queryKey: ['analytics-data'],
    queryFn: async () => {
      const { data: leads } = await supabase
        .from('leads')
        .select('source, stage_id');

      const { data: stages } = await supabase
        .from('pipeline_stages')
        .select('id, name, position, pipeline_id')
        .order('position');

      if (!leads || !stages) {
        return {
          leadSources: [],
          conversionFunnel: {
            total: 0,
            byStage: [],
          },
        };
      }

      // Calculate lead sources using helper
      const sourceCounts = groupLeadsBySource(leads);
      const leadSources = calculateSourcePercentages(sourceCounts, leads.length);

      // Calculate conversion funnel using helper
      const funnelByStage = buildConversionFunnel(leads, stages);

      return {
        leadSources,
        conversionFunnel: {
          total: leads.length,
          byStage: funnelByStage,
        },
      };
    },
    refetchInterval: 30000,
  });
};
