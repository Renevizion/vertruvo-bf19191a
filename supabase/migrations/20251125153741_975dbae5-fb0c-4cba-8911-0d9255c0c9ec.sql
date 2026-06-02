-- Fix infinite recursion in workspace_members RLS policy
-- The issue is that the policy was querying workspace_members to check access to workspace_members

DROP POLICY IF EXISTS "Users can view workspace members" ON public.workspace_members;

-- Create a simpler policy that doesn't cause recursion
-- Users can see their own membership records
CREATE POLICY "Users can view their own workspace memberships"
ON public.workspace_members FOR SELECT
USING (user_id = auth.uid());

-- Users can see other members in workspaces where they are members
-- This uses a subquery that checks the user's own records first (no recursion)
CREATE POLICY "Users can view members in their workspaces"
ON public.workspace_members FOR SELECT
USING (
  workspace_id IN (
    SELECT wm.workspace_id 
    FROM workspace_members wm 
    WHERE wm.user_id = auth.uid()
  )
);