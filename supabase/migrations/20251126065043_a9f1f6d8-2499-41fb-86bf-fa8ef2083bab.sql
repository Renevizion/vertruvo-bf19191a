-- Drop all existing workflows policies
DROP POLICY IF EXISTS "Users can view workflows in their workspace" ON workflows;
DROP POLICY IF EXISTS "Users can create workflows in their workspace" ON workflows;
DROP POLICY IF EXISTS "Users can update workflows in their workspace" ON workflows;
DROP POLICY IF EXISTS "Users can delete workflows in their workspace" ON workflows;

-- Create new direct policies without any reference to workspace_members
CREATE POLICY "Users can view workflows in their workspace"
ON workflows FOR SELECT
TO authenticated
USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "Users can create workflows in their workspace"
ON workflows FOR INSERT
TO authenticated
WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "Users can update workflows in their workspace"
ON workflows FOR UPDATE
TO authenticated
USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "Users can delete workflows in their workspace"
ON workflows FOR DELETE
TO authenticated
USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));