-- Add missing columns to agent_insights for workspace insights
ALTER TABLE agent_insights ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE agent_insights ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE agent_insights ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE agent_insights ADD COLUMN IF NOT EXISTS metric_value NUMERIC;
ALTER TABLE agent_insights ADD COLUMN IF NOT EXISTS metric_unit TEXT;
ALTER TABLE agent_insights ADD COLUMN IF NOT EXISTS trend TEXT CHECK (trend IN ('up', 'down', 'stable'));
ALTER TABLE agent_insights ADD COLUMN IF NOT EXISTS trend_percentage NUMERIC DEFAULT 0;
ALTER TABLE agent_insights ADD COLUMN IF NOT EXISTS confidence_score NUMERIC CHECK (confidence_score >= 0 AND confidence_score <= 1);
ALTER TABLE agent_insights ADD COLUMN IF NOT EXISTS recommendations JSONB DEFAULT '[]'::jsonb;
ALTER TABLE agent_insights ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
ALTER TABLE agent_insights ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ DEFAULT now();

-- Update RLS for workspace insights via agent_insights table
DROP POLICY IF EXISTS "Users can view their workspace insights" ON agent_insights;
CREATE POLICY "Users can view their workspace insights"
  ON agent_insights FOR SELECT
  USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    OR context_type = 'workspace' AND context_id::uuid IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- Create index for workspace-based queries
CREATE INDEX IF NOT EXISTS idx_agent_insights_workspace_id ON agent_insights(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_insights_context ON agent_insights(context_type, context_id);