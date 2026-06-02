import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Platform admin - only YOU (the Thermi platform owner)
export const useIsAdmin = () => {
  return useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .rpc("has_role", { _user_id: user.id, _role: "admin" });
      
      if (error) {
        console.error("Error checking admin status:", error);
        return false;
      }

      return data || false;
    },
  });
};

// Workspace owner - customers who own their workspace (NOT platform admin)
export const useIsOwner = () => {
  return useQuery({
    queryKey: ["is-owner"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .rpc("has_role", { _user_id: user.id, _role: "owner" });
      
      if (error) {
        console.error("Error checking owner status:", error);
        return false;
      }

      return data || false;
    },
  });
};

// Platform admin check - ONLY checks for 'admin' role (you)
// Do NOT use this to grant customers elevated privileges
export const useIsPlatformAdmin = () => {
  const { data: isAdmin, isLoading } = useIsAdmin();
  return { isPlatformAdmin: isAdmin || false, isLoading };
};
