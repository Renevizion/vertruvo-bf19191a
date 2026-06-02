-- Complete fix for workspace_members infinite recursion
-- The key: workspace_members SELECT policy MUST NOT reference workspace_members table

-- First, drop ALL policies on workspace_members
DROP POLICY IF EXISTS "Users can view their workspace memberships" ON workspace_members;
DROP POLICY IF EXISTS "Workspace owners can manage memberships" ON workspace_members;
DROP POLICY IF EXISTS "Users can manage workspace memberships" ON workspace_members;
DROP POLICY IF EXISTS "Owners can manage members" ON workspace_members;

-- Create simple, non-recursive policies for workspace_members
CREATE POLICY "Users can view own membership"
  ON workspace_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Workspace owners can view all members"
  ON workspace_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspaces 
      WHERE workspaces.id = workspace_members.workspace_id 
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Workspace owners can manage members"
  ON workspace_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspaces 
      WHERE workspaces.id = workspace_members.workspace_id 
      AND workspaces.owner_id = auth.uid()
    )
  );