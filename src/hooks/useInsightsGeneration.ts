import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useInsightsGeneration = (workspaceId: string) => {
  const queryClient = useQueryClient();

  const generateInsights = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-insights', {
        body: { workspaceId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insights', workspaceId] });
      toast.success('New insights generated successfully');
    },
    onError: (error: any) => {
      if (error?.message?.includes('429') || error?.message?.includes('Rate limit')) {
        toast.error('Rate limit exceeded. Please try again later.');
      } else if (error?.message?.includes('402') || error?.message?.includes('Payment')) {
        toast.error('Payment required. Please add funds to your workspace.');
      } else {
        toast.error('Failed to generate insights');
      }
    },
  });

  return {
    generateInsights: generateInsights.mutate,
    isGenerating: generateInsights.isPending,
  };
};