
-- Fix RLS policies on pipelines table to only show workspace-scoped data
DROP POLICY IF EXISTS "Users can view pipelines in their workspaces" ON pipelines;
DROP POLICY IF EXISTS "Users can create pipelines in their workspaces" ON pipelines;
DROP POLICY IF EXISTS "Users can update pipelines in their workspaces" ON pipelines;
DROP POLICY IF EXISTS "Users can delete pipelines in their workspaces" ON pipelines;

CREATE POLICY "Users can view pipelines in their workspaces"
ON pipelines FOR SELECT
USING (workspace_id IN (
  SELECT id FROM workspaces WHERE owner_id = auth.uid()
));

CREATE POLICY "Users can create pipelines in their workspaces"
ON pipelines FOR INSERT
WITH CHECK (workspace_id IN (
  SELECT id FROM workspaces WHERE owner_id = auth.uid()
));

CREATE POLICY "Users can update pipelines in their workspaces"
ON pipelines FOR UPDATE
USING (workspace_id IN (
  SELECT id FROM workspaces WHERE owner_id = auth.uid()
));

CREATE POLICY "Users can delete pipelines in their workspaces"
ON pipelines FOR DELETE
USING (workspace_id IN (
  SELECT id FROM workspaces WHERE owner_id = auth.uid()
));

-- Enable pg_cron extension for scheduled analytics aggregation
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;