-- Drop all existing RLS policies on workspace-scoped tables to start fresh
DROP POLICY IF EXISTS "Users can view workflows in their workspaces" ON workflows;
DROP POLICY IF EXISTS "Users can create workflows in their workspaces" ON workflows;
DROP POLICY IF EXISTS "Users can update workflows in their workspaces" ON workflows;
DROP POLICY IF EXISTS "Users can delete workflows in their workspaces" ON workflows;

DROP POLICY IF EXISTS "Users can view workflow runs in their workspaces" ON workflow_runs;
DROP POLICY IF EXISTS "Users can create workflow runs in their workspaces" ON workflow_runs;

DROP POLICY IF EXISTS "Users can view leads in their workspaces" ON leads;
DROP POLICY IF EXISTS "Users can create leads in their workspaces" ON leads;
DROP POLICY IF EXISTS "Users can update leads in their workspaces" ON leads;
DROP POLICY IF EXISTS "Users can delete leads in their workspaces" ON leads;

DROP POLICY IF EXISTS "Users can view contacts in their workspaces" ON contacts;
DROP POLICY IF EXISTS "Users can create contacts in their workspaces" ON contacts;
DROP POLICY IF EXISTS "Users can update contacts in their workspaces" ON contacts;
DROP POLICY IF EXISTS "Users can delete contacts in their workspaces" ON contacts;

DROP POLICY IF EXISTS "Users can view tasks in their workspaces" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks in their workspaces" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks in their workspaces" ON tasks;
DROP POLICY IF EXISTS "Users can delete tasks in their workspaces" ON tasks;

DROP POLICY IF EXISTS "Users can view activities in their workspaces" ON activities;
DROP POLICY IF EXISTS "Users can create activities in their workspaces" ON activities;
DROP POLICY IF EXISTS "Users can update activities in their workspaces" ON activities;
DROP POLICY IF EXISTS "Users can delete activities in their workspaces" ON activities;

DROP POLICY IF EXISTS "Users can view forms in their workspaces" ON forms;
DROP POLICY IF EXISTS "Users can create forms in their workspaces" ON forms;
DROP POLICY IF EXISTS "Users can update forms in their workspaces" ON forms;
DROP POLICY IF EXISTS "Users can delete forms in their workspaces" ON forms;

DROP POLICY IF EXISTS "Users can view pipelines in their workspaces" ON pipelines;
DROP POLICY IF EXISTS "Users can create pipelines in their workspaces" ON pipelines;
DROP POLICY IF EXISTS "Users can update pipelines in their workspaces" ON pipelines;
DROP POLICY IF EXISTS "Users can delete pipelines in their workspaces" ON pipelines;

-- Now create correct RLS policies using direct workspace ownership checks (NO workspace_members queries)

-- WORKFLOWS
CREATE POLICY "Users can view workflows in their workspaces" ON workflows
FOR SELECT USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can create workflows in their workspaces" ON workflows
FOR INSERT WITH CHECK (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can update workflows in their workspaces" ON workflows
FOR UPDATE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can delete workflows in their workspaces" ON workflows
FOR DELETE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

-- WORKFLOW_RUNS
CREATE POLICY "Users can view workflow runs in their workspaces" ON workflow_runs
FOR SELECT USING (
  workflow_id IN (SELECT id FROM workflows WHERE workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
);

CREATE POLICY "Users can create workflow runs in their workspaces" ON workflow_runs
FOR INSERT WITH CHECK (
  workflow_id IN (SELECT id FROM workflows WHERE workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
);

-- LEADS
CREATE POLICY "Users can view leads in their workspaces" ON leads
FOR SELECT USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can create leads in their workspaces" ON leads
FOR INSERT WITH CHECK (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can update leads in their workspaces" ON leads
FOR UPDATE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can delete leads in their workspaces" ON leads
FOR DELETE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

-- CONTACTS
CREATE POLICY "Users can view contacts in their workspaces" ON contacts
FOR SELECT USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can create contacts in their workspaces" ON contacts
FOR INSERT WITH CHECK (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can update contacts in their workspaces" ON contacts
FOR UPDATE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can delete contacts in their workspaces" ON contacts
FOR DELETE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

-- TASKS
CREATE POLICY "Users can view tasks in their workspaces" ON tasks
FOR SELECT USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can create tasks in their workspaces" ON tasks
FOR INSERT WITH CHECK (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can update tasks in their workspaces" ON tasks
FOR UPDATE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can delete tasks in their workspaces" ON tasks
FOR DELETE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

-- ACTIVITIES
CREATE POLICY "Users can view activities in their workspaces" ON activities
FOR SELECT USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can create activities in their workspaces" ON activities
FOR INSERT WITH CHECK (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can update activities in their workspaces" ON activities
FOR UPDATE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can delete activities in their workspaces" ON activities
FOR DELETE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

-- FORMS
CREATE POLICY "Users can view forms in their workspaces" ON forms
FOR SELECT USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can create forms in their workspaces" ON forms
FOR INSERT WITH CHECK (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can update forms in their workspaces" ON forms
FOR UPDATE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can delete forms in their workspaces" ON forms
FOR DELETE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

-- PIPELINES
CREATE POLICY "Users can view pipelines in their workspaces" ON pipelines
FOR SELECT USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can create pipelines in their workspaces" ON pipelines
FOR INSERT WITH CHECK (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can update pipelines in their workspaces" ON pipelines
FOR UPDATE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can delete pipelines in their workspaces" ON pipelines
FOR DELETE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);