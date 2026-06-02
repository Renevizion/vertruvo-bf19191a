import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { initializeFeatureTracking, autoDetectCompletedFeatures, getFeatureStatus, markFeatureComplete } from "@/lib/feature-tracking";

export function useFeatureTracking() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Get workspace ID
  useEffect(() => {
    const getWorkspace = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: workspaces } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1);

      if (workspaces?.[0]) {
        setWorkspaceId(workspaces[0].id);
      }
    };

    getWorkspace();
  }, []);

  // Query feature status
  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ['feature-status', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      return await getFeatureStatus(workspaceId);
    },
    enabled: !!workspaceId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Initialize tracking
  const initializeMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error('No workspace ID');
      return await initializeFeatureTracking(workspaceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-status', workspaceId] });
    },
  });

  // Auto-detect completed features
  const autoDetectMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error('No workspace ID');
      return await autoDetectCompletedFeatures(workspaceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-status', workspaceId] });
    },
  });

  // Mark feature complete
  const markCompleteMutation = useMutation({
    mutationFn: async (featureName: string) => {
      if (!workspaceId) throw new Error('No workspace ID');
      return await markFeatureComplete(workspaceId, featureName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-status', workspaceId] });
    },
  });

  return {
    workspaceId,
    status: status?.data || [],
    stats: status?.stats || { total: 0, completed: 0, percentage: 0 },
    isLoading,
    initialize: initializeMutation.mutate,
    autoDetect: autoDetectMutation.mutate,
    markComplete: markCompleteMutation.mutate,
    refetch,
  };
}
