import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateMemoryParams {
  agentId: string;
  workspaceId: string;
  content: string;
  memoryType: 'conversation' | 'preference' | 'insight' | 'fact' | 'behavior';
  context?: any;
  importanceScore?: number;
}

export const useAgentMemory = (agentId: string, workspaceId: string) => {
  const queryClient = useQueryClient();

  const { data: memories, isLoading } = useQuery({
    queryKey: ['agent-memory', agentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_memory')
        .select('*')
        .eq('agent_id', agentId)
        .eq('workspace_id', workspaceId)
        .order('last_accessed_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!agentId && !!workspaceId,
  });

  const createMemory = useMutation({
    mutationFn: async (params: CreateMemoryParams) => {
      const { data, error } = await supabase
        .from('agent_memory')
        .insert({
          agent_id: params.agentId,
          workspace_id: params.workspaceId,
          content: params.content,
          memory_type: params.memoryType,
          context: params.context || {},
          importance_score: params.importanceScore || 5,
          access_count: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-memory', agentId] });
      toast.success('Memory stored successfully');
    },
    onError: () => {
      toast.error('Failed to store memory');
    },
  });

  const accessMemory = useMutation({
    mutationFn: async (memoryId: string) => {
      // First get current access count
      const { data: current } = await supabase
        .from('agent_memory')
        .select('access_count')
        .eq('id', memoryId)
        .single();
      
      const { data, error } = await supabase
        .from('agent_memory')
        .update({
          access_count: (current?.access_count || 0) + 1,
          last_accessed_at: new Date().toISOString(),
        })
        .eq('id', memoryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-memory', agentId] });
    },
  });

  return {
    memories,
    isLoading,
    createMemory: createMemory.mutate,
    accessMemory: accessMemory.mutate,
    isCreating: createMemory.isPending,
  };
};