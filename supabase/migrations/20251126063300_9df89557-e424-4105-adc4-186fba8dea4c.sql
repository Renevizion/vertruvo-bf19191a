-- Fix workspace_members RLS to prevent infinite recursion
-- The issue: workspace_members policy was calling get_user_workspaces which queries workspace_members

DROP POLICY IF EXISTS "Users can view their workspace memberships" ON workspace_members;
CREATE POLICY "Users can view their workspace memberships"
  ON workspace_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage workspace memberships" ON workspace_members;
CREATE POLICY "Workspace owners can manage memberships"
  ON workspace_members FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- Ensure workspaces RLS doesn't cause recursion
DROP POLICY IF EXISTS "Users can view their workspaces" ON workspaces;
CREATE POLICY "Users can view their workspaces"
  ON workspaces FOR SELECT
  USING (
    owner_id = auth.uid()
    OR id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );