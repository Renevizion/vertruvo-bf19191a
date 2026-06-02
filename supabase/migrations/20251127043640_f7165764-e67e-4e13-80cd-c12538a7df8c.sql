-- Fix business_settings RLS policies to properly show workspace data
DROP POLICY IF EXISTS "Users can view their workspace business settings" ON business_settings;
DROP POLICY IF EXISTS "Users can insert their workspace business settings" ON business_settings;
DROP POLICY IF EXISTS "Users can update their workspace business settings" ON business_settings;

-- Create proper RLS policies for business_settings
CREATE POLICY "Workspace owners can view their business settings"
  ON business_settings FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Workspace owners can insert their business settings"
  ON business_settings FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Workspace owners can update their business settings"
  ON business_settings FOR UPDATE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- Add description field to ai_agents table
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS description TEXT;