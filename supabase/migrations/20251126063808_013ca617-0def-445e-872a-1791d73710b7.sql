
-- Comprehensive fix: Replace all get_user_workspaces() calls with direct subqueries
-- This eliminates any potential circular dependency issues

-- Helper macro for workspace access check
-- Users can access workspaces they own OR are members of

-- Fix ai_agents policies
DROP POLICY IF EXISTS "Users can view their workspace agents" ON ai_agents;
DROP POLICY IF EXISTS "Users can create agents in their workspace" ON ai_agents;
DROP POLICY IF EXISTS "Users can update their workspace agents" ON ai_agents;
DROP POLICY IF EXISTS "Users can delete their workspace agents" ON ai_agents;

CREATE POLICY "Users can view their workspace agents"
  ON ai_agents FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create agents in their workspace"
  ON ai_agents FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their workspace agents"
  ON ai_agents FOR UPDATE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their workspace agents"
  ON ai_agents FOR DELETE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Fix workflows policies
DROP POLICY IF EXISTS "Users can view workflows in their workspace" ON workflows;
DROP POLICY IF EXISTS "Users can create workflows in their workspace" ON workflows;
DROP POLICY IF EXISTS "Users can update workflows in their workspace" ON workflows;
DROP POLICY IF EXISTS "Users can delete workflows in their workspace" ON workflows;

CREATE POLICY "Users can view workflows in their workspace"
  ON workflows FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create workflows in their workspace"
  ON workflows FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update workflows in their workspace"
  ON workflows FOR UPDATE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete workflows in their workspace"
  ON workflows FOR DELETE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Fix leads policies
DROP POLICY IF EXISTS "Users can view leads in their workspace" ON leads;
DROP POLICY IF EXISTS "Users can create leads in their workspace" ON leads;
DROP POLICY IF EXISTS "Users can update leads in their workspace" ON leads;
DROP POLICY IF EXISTS "Users can delete leads in their workspace" ON leads;

CREATE POLICY "Users can view leads in their workspace"
  ON leads FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create leads in their workspace"
  ON leads FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update leads in their workspace"
  ON leads FOR UPDATE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete leads in their workspace"
  ON leads FOR DELETE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Fix contacts policies
DROP POLICY IF EXISTS "Users can view contacts in their workspace" ON contacts;
DROP POLICY IF EXISTS "Users can create contacts in their workspace" ON contacts;
DROP POLICY IF EXISTS "Users can update contacts in their workspace" ON contacts;
DROP POLICY IF EXISTS "Users can delete contacts in their workspace" ON contacts;

CREATE POLICY "Users can view contacts in their workspace"
  ON contacts FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create contacts in their workspace"
  ON contacts FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update contacts in their workspace"
  ON contacts FOR UPDATE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete contacts in their workspace"
  ON contacts FOR DELETE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Fix tasks policies
DROP POLICY IF EXISTS "Users can view tasks in their workspace" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks in their workspace" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks in their workspace" ON tasks;
DROP POLICY IF EXISTS "Users can delete tasks in their workspace" ON tasks;

CREATE POLICY "Users can view tasks in their workspace"
  ON tasks FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create tasks in their workspace"
  ON tasks FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tasks in their workspace"
  ON tasks FOR UPDATE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tasks in their workspace"
  ON tasks FOR DELETE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );
