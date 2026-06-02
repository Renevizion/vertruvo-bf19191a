import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveVerticalId, VERTICAL_PRESETS, type VerticalId } from "@/lib/vertical-presets";

/**
 * useWorkspaceShape — derives "shape" + "size" signals so the UI can
 * progressively reveal complexity. The glove-fits-the-hand mechanism.
 *
 * - vertical: from business_settings.business_category (preset-driven defaults)
 * - size: 'solo' (1 seat) | 'small' (2–4) | 'team' (5+)
 * - activity: 'new' (<5 leads) | 'light' (<25) | 'active' (25+)
 *
 * The Sidebar uses these to decide which advanced groups start collapsed.
 * NOTE: This is purely presentational — it never gates feature access.
 */

export type WorkspaceSize = "solo" | "small" | "team";
export type WorkspaceActivity = "new" | "light" | "active";

export interface WorkspaceShape {
  workspaceId: string | null;
  vertical: VerticalId;
  scheduleHeavy: boolean;
  size: WorkspaceSize;
  activity: WorkspaceActivity;
  seatCount: number;
  leadCount: number;
}

const DEFAULT_SHAPE: WorkspaceShape = {
  workspaceId: null,
  vertical: "professional_services",
  scheduleHeavy: false,
  size: "solo",
  activity: "new",
  seatCount: 1,
  leadCount: 0,
};

export const useWorkspaceShape = () => {
  return useQuery({
    queryKey: ["workspace-shape"],
    queryFn: async (): Promise<WorkspaceShape> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return DEFAULT_SHAPE;

      // Find any workspace the user belongs to (owner OR member)
      const { data: ownedWs } = await supabase
        .from("workspaces")
        .select("id")
        .eq("owner_id", user.id)
        .limit(1)
        .maybeSingle();

      let workspaceId = ownedWs?.id ?? null;
      if (!workspaceId) {
        const { data: member } = await supabase
          .from("workspace_members")
          .select("workspace_id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();
        workspaceId = member?.workspace_id ?? null;
      }
      if (!workspaceId) return DEFAULT_SHAPE;

      const [{ data: settings }, seatRes, leadRes] = await Promise.all([
        supabase
          .from("business_settings")
          .select("business_category")
          .eq("workspace_id", workspaceId)
          .maybeSingle(),
        supabase
          .from("workspace_members")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId),
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId),
      ]);

      const seatCount = seatRes.count ?? 1;
      const leadCount = leadRes.count ?? 0;
      const vertical = resolveVerticalId(settings?.business_category);
      const preset = VERTICAL_PRESETS[vertical];

      const size: WorkspaceSize = seatCount >= 5 ? "team" : seatCount >= 2 ? "small" : "solo";
      const activity: WorkspaceActivity = leadCount >= 25 ? "active" : leadCount >= 5 ? "light" : "new";

      return {
        workspaceId,
        vertical,
        scheduleHeavy: preset.scheduleHeavy,
        size,
        activity,
        seatCount,
        leadCount,
      };
    },
    staleTime: 60 * 1000,
  });
};
