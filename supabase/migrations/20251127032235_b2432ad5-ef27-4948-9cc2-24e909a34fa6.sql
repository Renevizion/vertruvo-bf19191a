-- Add workspace_id to business_settings for multi-tenant isolation
ALTER TABLE business_settings 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_business_settings_workspace_id ON business_settings(workspace_id);

-- Enable RLS
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their workspace business settings" ON business_settings;
DROP POLICY IF EXISTS "Users can insert their workspace business settings" ON business_settings;
DROP POLICY IF EXISTS "Users can update their workspace business settings" ON business_settings;
DROP POLICY IF EXISTS "Users can delete their workspace business settings" ON business_settings;

-- Create RLS policies for workspace-scoped access
CREATE POLICY "Users can view their workspace business settings"
ON business_settings FOR SELECT
USING (
  workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their workspace business settings"
ON business_settings FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update their workspace business settings"
ON business_settings FOR UPDATE
USING (
  workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their workspace business settings"
ON business_settings FOR DELETE
USING (
  workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  )
);