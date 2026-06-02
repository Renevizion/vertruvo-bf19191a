import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, subDays, format } from "date-fns";
import { getWonStageIds } from "@/lib/analytics-helpers";

export const usePerformanceData = () => {
  return useQuery({
    queryKey: ['performance-data'],
    queryFn: async () => {
      const { data: leads } = await supabase
        .from('leads')
        .select('created_at, stage_id');

      const { data: stages } = await supabase
        .from('pipeline_stages')
        .select('id, name, position, pipeline_id')
        .order('position');

      // If no data, return empty data - no fake numbers
      if (!leads || leads.length === 0 || !stages || stages.length === 0) {
        return [];
      }

      // Get won stage IDs using helper (future-proof)
      const wonStageIds = getWonStageIds(stages);

      // Get last 30 days
      const days = Array.from({ length: 30 }, (_, i) => {
        const date = subDays(new Date(), 29 - i);
        return {
          date: startOfDay(date),
          label: format(date, 'MMM d'),
        };
      });

      return days.map(({ date, label }) => {
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        const dayLeads = leads.filter(lead => {
          const leadDate = new Date(lead.created_at);
          return leadDate >= date && leadDate < nextDay;
        });

        const conversions = dayLeads.filter(lead => 
          lead.stage_id && wonStageIds.includes(lead.stage_id)
        ).length;

        return {
          month: label,
          leads: dayLeads.length,
          conversions,
        };
      });
    },
    refetchInterval: 30000,
  });
};

// Generate sample data for empty database or showcase
function generateSampleData() {
  const days = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(new Date(), 29 - i);
    const baseLeads = 3 + Math.floor(Math.random() * 5);
    const conversionRate = 0.2 + Math.random() * 0.15;
    
    return {
      month: format(date, 'MMM d'),
      leads: baseLeads,
      conversions: Math.floor(baseLeads * conversionRate),
    };
  });
  
  return days;
}
