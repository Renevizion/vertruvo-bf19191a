import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreateLeadParams {
  name: string;
  source: string;
  attribution_source: string;
  attribution_id?: string;
  notes?: string;
  email?: string;
  phone?: string;
}

export function useCreateLeadFromSocial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateLeadParams) => {
      const { data: profile } = await supabase.from('profiles').select('id').single();
      if (!profile) throw new Error("Not authenticated");

      const { data: workspace } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', profile.id)
        .single();
      if (!workspace) throw new Error("No workspace found");

      // Get default pipeline and first stage
      const { data: pipeline } = await supabase
        .from('pipelines')
        .select('id')
        .eq('workspace_id', workspace.workspace_id)
        .order('created_at')
        .limit(1)
        .single();

      let stageId: string | null = null;
      if (pipeline) {
        const { data: stage } = await supabase
          .from('pipeline_stages')
          .select('id')
          .eq('pipeline_id', pipeline.id)
          .order('position')
          .limit(1)
          .single();
        stageId = stage?.id || null;
      }

      const { data: lead, error } = await supabase
        .from('leads')
        .insert({
          name: params.name,
          source: params.source,
          value: 0,
          workspace_id: workspace.workspace_id,
          pipeline_id: pipeline?.id || null,
          stage_id: stageId,
          notes: params.notes || null,
          email: params.email || null,
          phone: params.phone || null,
          attribution_source: params.attribution_source,
          attribution_id: params.attribution_id || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase.from('activities').insert({
        lead_id: lead.id,
        type: 'social',
        title: `Lead created from ${params.source}`,
        description: params.notes || `Auto-created from ${params.attribution_source}`,
        created_by: profile.id,
        workspace_id: workspace.workspace_id,
      });

      return lead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      toast.success("Lead created from social engagement!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create lead");
    },
  });
}
