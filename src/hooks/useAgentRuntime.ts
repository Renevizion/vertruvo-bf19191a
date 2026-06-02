import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ExecuteAgentParams {
  agentId: string;
  input: string;
  context?: Record<string, any>;
}

interface AgentRuntimeResponse {
  success: boolean;
  result?: {
    response: string;
    type: string;
    usage?: any;
  };
  error?: string;
}

export const useAgentRuntime = () => {
  return useMutation({
    mutationFn: async ({ agentId, input, context }: ExecuteAgentParams) => {
      console.log('[Agent Runtime Hook] Executing agent:', agentId);
      
      const { data, error } = await supabase.functions.invoke<AgentRuntimeResponse>('agent-runtime', {
        body: { agentId, input, context }
      });

      if (error) {
        console.error('[Agent Runtime Hook] Error:', error);
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Agent execution failed');
      }

      console.log('[Agent Runtime Hook] Agent executed successfully');
      return data.result;
    },
    onError: (error: Error) => {
      console.error('[Agent Runtime Hook] Mutation error:', error);
      toast.error('Agent execution failed', {
        description: error.message
      });
    },
  });
};
