import { supabase } from "@/integrations/supabase/client";

export type ViewerKind = "user" | "embed" | "kiosk" | "api" | "anon";
export type ViewerRole = "owner" | "admin" | "staff" | "customer" | "anon";

export type Viewer = {
  kind: ViewerKind;
  userId?: string;
  workspaceId?: string;
  role: ViewerRole;
  /** If set, only these capability keys are reachable (used by embed tokens). null = all entitled. */
  allowedCapabilities?: string[] | null;
};

/**
 * Resolve the current viewer from the active Supabase session.
 * Shells that use embed/kiosk/API tokens should call their own resolver
 * that calls the corresponding edge function.
 *
 * See CORE_CONTRACT.md §2.
 */
export async function resolveViewerFromSession(): Promise<Viewer> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return { kind: "anon", role: "anon", allowedCapabilities: null };
  }

  const userId = session.user.id;

  // Resolve role + workspace via existing RPCs.
  const [{ data: roles }, { data: workspaces }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase.rpc("get_user_workspaces", { _user_id: userId }),
  ]);

  const roleSet = new Set((roles ?? []).map(r => r.role as string));
  let role: ViewerRole = "staff";
  if (roleSet.has("owner")) role = "owner";
  else if (roleSet.has("admin")) role = "admin";
  else if (roleSet.has("customer")) role = "customer";

  const workspaceId = (workspaces?.[0] as { workspace_id?: string } | undefined)?.workspace_id;

  return {
    kind: "user",
    userId,
    workspaceId,
    role,
    allowedCapabilities: null,
  };
}
