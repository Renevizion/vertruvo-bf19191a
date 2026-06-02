
-- Create workflow_analytics table if it doesn't exist
CREATE TABLE IF NOT EXISTS workflow_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  execution_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  avg_duration_ms INTEGER DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workflow_id, period_start)
);

-- Enable RLS on workflow_analytics
ALTER TABLE workflow_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for workflow_analytics
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

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_workflow_analytics_workflow_period 
ON workflow_analytics(workflow_id, period_start);

-- Ensure track_workflow_execution function is properly defined
CREATE OR REPLACE FUNCTION track_workflow_execution(
  p_workflow_id UUID,
  p_status TEXT,
  p_duration_ms INTEGER,
  p_error TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO workflow_analytics (
    workflow_id,
    execution_count,
    success_count,
    error_count,
    avg_duration_ms,
    last_run_at,
    period_start,
    period_end
  )
  VALUES (
    p_workflow_id,
    1,
    CASE WHEN p_status = 'success' THEN 1 ELSE 0 END,
    CASE WHEN p_status = 'error' THEN 1 ELSE 0 END,
    p_duration_ms,
    now(),
    date_trunc('day', now()),
    date_trunc('day', now() + interval '1 day')
  )
  ON CONFLICT (workflow_id, period_start)
  DO UPDATE SET
    execution_count = workflow_analytics.execution_count + 1,
    success_count = workflow_analytics.success_count + CASE WHEN p_status = 'success' THEN 1 ELSE 0 END,
    error_count = workflow_analytics.error_count + CASE WHEN p_status = 'error' THEN 1 ELSE 0 END,
    avg_duration_ms = (workflow_analytics.avg_duration_ms * workflow_analytics.execution_count + p_duration_ms) / (workflow_analytics.execution_count + 1),
    last_run_at = now();
END;
$$;