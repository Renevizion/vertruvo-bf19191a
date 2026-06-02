-- Revert RLS policies to original working state

-- Restore original AI agents RLS policies
DROP POLICY IF EXISTS "Users can view their workspace agents" ON ai_agents;
CREATE POLICY "Users can view their workspace agents"
  ON ai_agents FOR SELECT
  USING (
    workspace_id IN (
      SELECT get_user_workspaces.workspace_id
      FROM get_user_workspaces(auth.uid()) get_user_workspaces(workspace_id)
    )
  );

DROP POLICY IF EXISTS "Users can create agents in their workspace" ON ai_agents;
CREATE POLICY "Users can create agents in their workspace"
  ON ai_agents FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT get_user_workspaces.workspace_id
      FROM get_user_workspaces(auth.uid()) get_user_workspaces(workspace_id)
    )
  );

DROP POLICY IF EXISTS "Users can update their workspace agents" ON ai_agents;
CREATE POLICY "Users can update their workspace agents"
  ON ai_agents FOR UPDATE
  USING (
    workspace_id IN (
      SELECT get_user_workspaces.workspace_id
      FROM get_user_workspaces(auth.uid()) get_user_workspaces(workspace_id)
    )
  );

DROP POLICY IF EXISTS "Users can delete their workspace agents" ON ai_agents;
CREATE POLICY "Users can delete their workspace agents"
  ON ai_agents FOR DELETE
  USING (
    workspace_id IN (
      SELECT get_user_workspaces.workspace_id
      FROM get_user_workspaces(auth.uid()) get_user_workspaces(workspace_id)
    )
  );

-- Restore original workflows RLS policies
DROP POLICY IF EXISTS "Users can view their workspace workflows" ON workflows;
CREATE POLICY "Users can view their workspace workflows"
  ON workflows FOR SELECT
  USING (
    workspace_id IN (
      SELECT get_user_workspaces.workspace_id
      FROM get_user_workspaces(auth.uid()) get_user_workspaces(workspace_id)
    )
  );

DROP POLICY IF EXISTS "Users can create workflows in their workspace" ON workflows;
CREATE POLICY "Users can create workflows in their workspace"
  ON workflows FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT get_user_workspaces.workspace_id
      FROM get_user_workspaces(auth.uid()) get_user_workspaces(workspace_id)
    )
  );

DROP POLICY IF EXISTS "Users can update their workspace workflows" ON workflows;
CREATE POLICY "Users can update their workspace workflows"
  ON workflows FOR UPDATE
  USING (
    workspace_id IN (
      SELECT get_user_workspaces.workspace_id
      FROM get_user_workspaces(auth.uid()) get_user_workspaces(workspace_id)
    )
  );

DROP POLICY IF EXISTS "Users can delete their workspace workflows" ON workflows;
CREATE POLICY "Users can delete their workspace workflows"
  ON workflows FOR DELETE
  USING (
    workspace_id IN (
      SELECT get_user_workspaces.workspace_id
      FROM get_user_workspaces(auth.uid()) get_user_workspaces(workspace_id)
    )
  );