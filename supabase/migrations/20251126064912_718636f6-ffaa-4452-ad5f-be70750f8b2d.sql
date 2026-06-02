-- Fix workspace_members table RLS (the root cause of infinite recursion)
DROP POLICY IF EXISTS "Users can view their workspace memberships" ON workspace_members;
DROP POLICY IF EXISTS "Users can view workspace memberships" ON workspace_members;
DROP POLICY IF EXISTS "Workspace owners can manage members" ON workspace_members;
DROP POLICY IF EXISTS "Users can insert workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can update workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can delete workspace members" ON workspace_members;

-- Simple direct policies for workspace_members (NO circular dependencies)
CREATE POLICY "Users can view their own memberships" ON workspace_members
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Workspace owners can view all members" ON workspace_members
FOR SELECT USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Workspace owners can add members" ON workspace_members
FOR INSERT WITH CHECK (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Workspace owners can update members" ON workspace_members
FOR UPDATE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Workspace owners can remove members" ON workspace_members
FOR DELETE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

-- Fix platform_config RLS
DROP POLICY IF EXISTS "Anyone can view platform config" ON platform_config;
DROP POLICY IF EXISTS "Only admins can manage platform config" ON platform_config;

CREATE POLICY "Anyone can view platform config" ON platform_config
FOR SELECT USING (true);

CREATE POLICY "Only admins can manage platform config" ON platform_config
FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role)
);

-- Fix knowledge_bases RLS
DROP POLICY IF EXISTS "Users can manage their workspace knowledge bases" ON knowledge_bases;

CREATE POLICY "Users can view workspace knowledge bases" ON knowledge_bases
FOR SELECT USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can create workspace knowledge bases" ON knowledge_bases
FOR INSERT WITH CHECK (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can update workspace knowledge bases" ON knowledge_bases
FOR UPDATE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can delete workspace knowledge bases" ON knowledge_bases
FOR DELETE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

-- Fix agent_memory RLS
DROP POLICY IF EXISTS "Users can manage their workspace agent memory" ON agent_memory;

CREATE POLICY "Users can view workspace agent memory" ON agent_memory
FOR SELECT USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can create workspace agent memory" ON agent_memory
FOR INSERT WITH CHECK (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can update workspace agent memory" ON agent_memory
FOR UPDATE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can delete workspace agent memory" ON agent_memory
FOR DELETE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

-- Fix call_logs RLS
DROP POLICY IF EXISTS "Users can manage their workspace call logs" ON call_logs;

CREATE POLICY "Users can view workspace call logs" ON call_logs
FOR SELECT USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can create workspace call logs" ON call_logs
FOR INSERT WITH CHECK (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can update workspace call logs" ON call_logs
FOR UPDATE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can delete workspace call logs" ON call_logs
FOR DELETE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

-- Fix agent_settings RLS
DROP POLICY IF EXISTS "Users can manage their workspace agent settings" ON agent_settings;

CREATE POLICY "Users can view workspace agent settings" ON agent_settings
FOR SELECT USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can create workspace agent settings" ON agent_settings
FOR INSERT WITH CHECK (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can update workspace agent settings" ON agent_settings
FOR UPDATE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can delete workspace agent settings" ON agent_settings
FOR DELETE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);