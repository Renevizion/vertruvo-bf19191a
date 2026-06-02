
-- Drop and recreate workflow_analytics table properly
DROP TABLE IF EXISTS workflow_analytics CASCADE;

CREATE TABLE workflow_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  execution_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  avg_duration_ms INTEGER NOT NULL DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workflow_id, period_start)
);

-- Enable RLS
ALTER TABLE workflow_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view analytics for their workspace workflows"
ON workflow_analytics FOR SELECT
USING (workflow_id IN (
  SELECT id FROM workflows WHERE workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  )
));

CREATE POLICY "System can insert analytics"
ON workflow_analytics FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update analytics"
ON workflow_analytics FOR UPDATE
USING (true);

-- Create index
CREATE INDEX idx_workflow_analytics_workflow_period 
ON workflow_analytics(workflow_id, period_start);