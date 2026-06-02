-- Drop all redundant/duplicate policies on ai_agents
DROP POLICY IF EXISTS "Users can view workspace agents" ON public.ai_agents;
DROP POLICY IF EXISTS "Users can create workspace agents" ON public.ai_agents;
DROP POLICY IF EXISTS "Users can update workspace agents" ON public.ai_agents;
DROP POLICY IF EXISTS "Users can delete workspace agents" ON public.ai_agents;
DROP POLICY IF EXISTS "Users can manage workspace agents" ON public.ai_agents;
DROP POLICY IF EXISTS "Users can view own workspace agents" ON public.ai_agents;
DROP POLICY IF EXISTS "Users can manage own workspace agents" ON public.ai_agents;

-- Recreate clean, correct RLS policies using workspace membership
CREATE POLICY "Members can view workspace agents"
  ON public.ai_agents FOR SELECT TO authenticated
  USING (
    public.is_workspace_member(workspace_id, auth.uid())
    OR public.is_workspace_owner(workspace_id, auth.uid())
    OR public.is_platform_admin(auth.uid())
  );

CREATE POLICY "Members can insert workspace agents"
  ON public.ai_agents FOR INSERT TO authenticated
  WITH CHECK (
    public.is_workspace_member(workspace_id, auth.uid())
    OR public.is_workspace_owner(workspace_id, auth.uid())
    OR public.is_platform_admin(auth.uid())
  );

CREATE POLICY "Members can update workspace agents"
  ON public.ai_agents FOR UPDATE TO authenticated
  USING (
    public.is_workspace_member(workspace_id, auth.uid())
    OR public.is_workspace_owner(workspace_id, auth.uid())
    OR public.is_platform_admin(auth.uid())
  );

CREATE POLICY "Members can delete workspace agents"
  ON public.ai_agents FOR DELETE TO authenticated
  USING (
    public.is_workspace_member(workspace_id, auth.uid())
    OR public.is_workspace_owner(workspace_id, auth.uid())
    OR public.is_platform_admin(auth.uid())
  );