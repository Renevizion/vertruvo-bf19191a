import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AgentTool {
  id: string;
  name: string;
  display_name: string;
  description: string;
  executor_type: string;
  executor_config: Record<string, any>;
  parameters_schema: Record<string, any>;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
}

export interface RecommendedTool {
  name: string;
  display_name: string;
  description: string;
  reasoning?: string;
  suggested_parameters?: Record<string, any>;
  suggested_executor_type?: string;
  suggested_integration?: string;
  capability_category?: string;
  integration_capability?: string;
  implementation_notes?: string;
}

export function useAgentTools() {
  const queryClient = useQueryClient();

  const { data: tools, isLoading } = useQuery({
    queryKey: ['agent-tools'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_tools')
        .select('*')
        .eq('is_active', true)
        .order('is_system', { ascending: false })
        .order('name');

      if (error) throw error;
      return data as AgentTool[];
    }
  });

  const approveTool = useMutation({
    mutationFn: async (tool: RecommendedTool) => {
      const { data, error } = await supabase
        .from('agent_tools')
        .insert({
          name: tool.name.toLowerCase().replace(/\s+/g, '_'),
          display_name: tool.display_name,
          description: tool.description,
          executor_type: tool.suggested_executor_type || 'internal',
          parameters_schema: tool.suggested_parameters || {},
          is_system: false,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agent-tools'] });
      toast.success(`Tool "${data.display_name}" has been added to the system`);
    },
    onError: (error: Error) => {
      toast.error('Failed to add tool', { description: error.message });
    }
  });

  const deactivateTool = useMutation({
    mutationFn: async (toolId: string) => {
      const { error } = await supabase
        .from('agent_tools')
        .update({ is_active: false })
        .eq('id', toolId)
        .eq('is_system', false); // Can't deactivate system tools

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-tools'] });
      toast.success('Tool deactivated');
    }
  });

  return {
    tools: tools || [],
    isLoading,
    approveTool,
    deactivateTool
  };
}
