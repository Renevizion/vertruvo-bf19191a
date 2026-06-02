import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calculateConversionRate, getWonStageIds } from "@/lib/analytics-helpers";

export const useDashboardMetrics = () => {
  return useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      // Fetch leads data
      const { data: leads } = await supabase
        .from('leads')
        .select('value, created_at, stage_id');

      // Fetch stages data (with position for future-proof logic)
      const { data: stages } = await supabase
        .from('pipeline_stages')
        .select('id, name, position, pipeline_id')
        .order('position');

      // Calculate total opportunity value
      const totalValue = leads?.reduce((sum, lead) => sum + (lead.value || 0), 0) || 0;

      // Count new leads today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const newLeadsToday = leads?.filter(lead => 
        new Date(lead.created_at) >= today
      ).length || 0;

      // Get total leads
      const totalLeads = leads?.length || 0;

      // Find first-stage IDs (position 0 or lowest) — these are "New Inquiries"
      const firstStageIds = new Set<string>();
      if (stages && stages.length > 0) {
        // Group by pipeline, find lowest position per pipeline
        const pipelineMinPos = new Map<string, number>();
        for (const s of stages) {
          const current = pipelineMinPos.get(s.pipeline_id);
          if (current === undefined || s.position < current) {
            pipelineMinPos.set(s.pipeline_id, s.position);
          }
        }
        for (const s of stages) {
          if (s.position === pipelineMinPos.get(s.pipeline_id)) {
            firstStageIds.add(s.id);
          }
        }
      }
      const newInquiries = leads?.filter(l => l.stage_id && firstStageIds.has(l.stage_id)).length || 0;

      // Calculate conversion rate using helper
      const wonStageIds = stages ? getWonStageIds(stages) : [];
      const conversionRate = (leads && stages) 
        ? calculateConversionRate(leads, wonStageIds).toFixed(1) 
        : "0";

      // Count contacts
      const { count: contactsCount } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true });

      // Count active tasks
      const { count: activeTasksCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'in_progress']);

      // Bookings today (start..end of day)
      const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
      const { data: bookingsTodayData } = await supabase
        .from('bookings')
        .select('id, sale_id, status')
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString());

      const bookingsToday = bookingsTodayData?.length || 0;
      // Open balance = bookings today without a linked sale (not yet captured)
      const openBalance = (bookingsTodayData || []).filter((b: any) => !b.sale_id).length;

      // Hot opportunities — created in last 48h or value above median heuristic
      const cutoff48h = new Date(Date.now() - 48 * 3600 * 1000);
      const hotLeadsCount = leads?.filter((l: any) => new Date(l.created_at) >= cutoff48h).length || 0;

      // Agent activity in last hour
      const cutoff1h = new Date(Date.now() - 3600 * 1000).toISOString();
      const { count: agentActivityHour } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', cutoff1h);

      // Unread inbox — best-effort from conversations table
      let unreadInbox = 0;
      try {
        const { count } = await supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'open');
        unreadInbox = count || 0;
      } catch { /* table may not exist on all tiers */ }

      return {
        totalValue,
        totalLeads,
        newInquiries,
        newLeadsToday,
        conversionRate,
        contactsCount: contactsCount || 0,
        activeTasksCount: activeTasksCount || 0,
        bookingsToday,
        openBalance,
        hotLeadsCount,
        agentActivityHour: agentActivityHour || 0,
        unreadInbox,
      };
    },
    refetchInterval: 30000,
  });
};
