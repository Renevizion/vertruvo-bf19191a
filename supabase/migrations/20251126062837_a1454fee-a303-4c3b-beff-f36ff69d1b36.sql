-- Fix RLS policies for AI agents and workflows visibility

-- Ensure workspace_members has proper RLS policies
DROP POLICY IF EXISTS "Users can view their workspace memberships" ON workspace_members;
CREATE POLICY "Users can view their workspace memberships"
  ON workspace_members FOR SELECT
  USING (user_id = auth.uid());

-- Ensure workspaces table has proper RLS policies
DROP POLICY IF EXISTS "Users can view their workspaces" ON workspaces;
CREATE POLICY "Users can view their workspaces"
  ON workspaces FOR SELECT
  USING (
    owner_id = auth.uid() 
    OR id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Recreate security definer function for workspace access
CREATE OR REPLACE FUNCTION public.get_user_workspaces(_user_id uuid)
RETURNS TABLE(workspace_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id
  FROM public.workspace_members
  WHERE user_id = _user_id
  UNION
  SELECT id
  FROM public.workspaces
  WHERE owner_id = _user_id
$$;

-- Fix AI agents RLS policies
DROP POLICY IF EXISTS "Users can view their workspace agents" ON ai_agents;
CREATE POLICY "Users can view their workspace agents"
  ON ai_agents FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM get_user_workspaces(auth.uid())
    )
  );

-- Fix workflows RLS policies  
DROP POLICY IF EXISTS "Users can view their workspace workflows" ON workflows;
CREATE POLICY "Users can view their workspace workflows"
  ON workflows FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM get_user_workspaces(auth.uid())
    )
  );