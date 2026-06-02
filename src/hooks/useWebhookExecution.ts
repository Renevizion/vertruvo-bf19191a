import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExecuteWebhookParams {
  webhookId: string;
  payload: any;
  workflowRunId?: string;
}

export const useWebhookExecution = () => {
  const executeWebhook = useMutation({
    mutationFn: async ({ webhookId, payload, workflowRunId }: ExecuteWebhookParams) => {
      const { data, error } = await supabase.functions.invoke('execute-webhook', {
        body: { webhookId, payload, workflowRunId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Webhook delivered (attempt ${data.attempt})`);
      } else {
        toast.error('Webhook delivery failed after retries');
      }
    },
    onError: () => {
      toast.error('Failed to execute webhook');
    },
  });

  return {
    executeWebhook: executeWebhook.mutate,
    isExecuting: executeWebhook.isPending,
  };
};