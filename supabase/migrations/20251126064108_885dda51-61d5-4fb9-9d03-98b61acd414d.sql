-- REVERT: Remove all recent RLS policy changes and restore simple working policies

-- Drop all existing RLS policies on core tables
DROP POLICY IF EXISTS "Users can view their workspace agents" ON ai_agents;
DROP POLICY IF EXISTS "Users can create agents in their workspace" ON ai_agents;
DROP POLICY IF EXISTS "Users can update their workspace agents" ON ai_agents;
DROP POLICY IF EXISTS "Users can delete their workspace agents" ON ai_agents;

DROP POLICY IF EXISTS "Users can view their workspace workflows" ON workflows;
DROP POLICY IF EXISTS "Users can create workflows in their workspace" ON workflows;
DROP POLICY IF EXISTS "Users can update their workspace workflows" ON workflows;
DROP POLICY IF EXISTS "Users can delete their workspace workflows" ON workflows;

DROP POLICY IF EXISTS "Users can view leads in their workspace" ON leads;
DROP POLICY IF EXISTS "Users can create leads in their workspace" ON leads;
DROP POLICY IF EXISTS "Users can update leads in their workspace" ON leads;
DROP POLICY IF EXISTS "Users can delete leads in their workspace" ON leads;

DROP POLICY IF EXISTS "Users can view contacts in their workspace" ON contacts;
DROP POLICY IF EXISTS "Users can create contacts in their workspace" ON contacts;
DROP POLICY IF EXISTS "Users can update contacts in their workspace" ON contacts;
DROP POLICY IF EXISTS "Users can delete contacts in their workspace" ON contacts;

DROP POLICY IF EXISTS "Users can view tasks in their workspace" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks in their workspace" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks in their workspace" ON tasks;
DROP POLICY IF EXISTS "Users can delete tasks in their workspace" ON tasks;

-- Create simple, working RLS policies using workspace owner check
-- AI AGENTS
CREATE POLICY "Users can view workspace agents"
  ON ai_agents FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create workspace agents"
  ON ai_agents FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update workspace agents"
  ON ai_agents FOR UPDATE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete workspace agents"
  ON ai_agents FOR DELETE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- WORKFLOWS
CREATE POLICY "Users can view workspace workflows"
  ON workflows FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create workspace workflows"
  ON workflows FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update workspace workflows"
  ON workflows FOR UPDATE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete workspace workflows"
  ON workflows FOR DELETE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- LEADS
CREATE POLICY "Users can view workspace leads"
  ON leads FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create workspace leads"
  ON leads FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update workspace leads"
  ON leads FOR UPDATE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete workspace leads"
  ON leads FOR DELETE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- CONTACTS
CREATE POLICY "Users can view workspace contacts"
  ON contacts FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create workspace contacts"
  ON contacts FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update workspace contacts"
  ON contacts FOR UPDATE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete workspace contacts"
  ON contacts FOR DELETE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- TASKS
CREATE POLICY "Users can view workspace tasks"
  ON tasks FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create workspace tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update workspace tasks"
  ON tasks FOR UPDATE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete workspace tasks"
  ON tasks FOR DELETE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );