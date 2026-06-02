import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ModuleId = 'crm' | 'outreach' | 'content' | 'intelligence';

export interface ModuleOption {
  id: ModuleId;
  label: string;
  description: string;
  icon: string; // lucide icon name
  examples: string[];
  alwaysOn?: boolean;
}

export const MODULE_OPTIONS: ModuleOption[] = [
  {
    id: 'crm',
    label: 'Lead & Client Management',
    description: 'Track opportunities, contacts, tasks, calendar, and bookings',
    icon: 'Users',
    examples: ['Opportunities', 'Contacts', 'Tasks', 'Calendar', 'Booking Sheet'],
    alwaysOn: true,
  },
  {
    id: 'outreach',
    label: 'Outreach & Campaigns',
    description: 'AI calling agents, call templates, email campaigns, and lists',
    icon: 'Phone',
    examples: ['AI Agents', 'Call Templates', 'Campaigns', 'Email Lists'],
  },
  {
    id: 'content',
    label: 'Content & Social',
    description: 'Social media management, forms, and lead capture',
    icon: 'Palette',
    examples: ['Social Media', 'Forms'],
  },
  {
    id: 'intelligence',
    label: 'Analytics & Automations',
    description: 'Insights, analytics dashboards, and workflow automations',
    icon: 'Lightbulb',
    examples: ['Insights', 'Analytics', 'Automations'],
  },
];

const ALL_MODULES: ModuleId[] = ['crm', 'outreach', 'content', 'intelligence'];

export const useEnabledModules = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['enabled-modules'],
    queryFn: async (): Promise<ModuleId[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return ALL_MODULES;

      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle();

      if (!workspace) {
        // Try as member
        const { data: member } = await supabase
          .from('workspace_members')
          .select('workspace_id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();
        
        if (!member) return ALL_MODULES;

        const { data: settings } = await supabase
          .from('business_settings')
          .select('enabled_modules')
          .eq('workspace_id', member.workspace_id)
          .maybeSingle();

        return (settings?.enabled_modules as ModuleId[]) || ALL_MODULES;
      }

      const { data: settings } = await supabase
        .from('business_settings')
        .select('enabled_modules')
        .eq('workspace_id', workspace.id)
        .maybeSingle();

      return (settings?.enabled_modules as ModuleId[]) || ALL_MODULES;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (modules: ModuleId[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle();

      if (!workspace) throw new Error('Workspace not found');

      // Ensure CRM is always included
      const withCrm = modules.includes('crm') ? modules : ['crm', ...modules];

      const { error } = await supabase
        .from('business_settings')
        .update({ enabled_modules: withCrm })
        .eq('workspace_id', workspace.id);

      if (error) throw error;
      return withCrm;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enabled-modules'] });
    },
  });

  return {
    enabledModules: query.data || ALL_MODULES,
    isLoading: query.isLoading,
    updateModules: updateMutation.mutateAsync,
  };
};
