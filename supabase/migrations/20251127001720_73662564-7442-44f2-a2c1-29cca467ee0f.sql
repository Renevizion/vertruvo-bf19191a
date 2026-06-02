-- Add agent usage tracking table for billing
CREATE TABLE IF NOT EXISTS agent_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  agent_id uuid REFERENCES ai_agents(id) ON DELETE CASCADE NOT NULL,
  template_id text,
  integration_type text NOT NULL,
  usage_count integer DEFAULT 1,
  tokens_used integer,
  cost_usd numeric(10, 4),
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, agent_id, integration_type, period_start)
);

-- Add platform_provided flag to track if integration uses platform keys
CREATE TABLE IF NOT EXISTS platform_api_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_type text UNIQUE NOT NULL,
  config jsonb NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS policies for agent_usage
ALTER TABLE agent_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their workspace agent usage"
  ON agent_usage FOR SELECT
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  ));

CREATE POLICY "System can track agent usage"
  ON agent_usage FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update agent usage"
  ON agent_usage FOR UPDATE
  USING (true);

-- RLS policies for platform_api_configs (admin only)
ALTER TABLE platform_api_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage platform API configs"
  ON platform_api_configs FOR ALL
  USING (is_admin_or_owner(auth.uid()))
  WITH CHECK (is_admin_or_owner(auth.uid()));

-- Create indexes
CREATE INDEX idx_agent_usage_workspace ON agent_usage(workspace_id);
CREATE INDEX idx_agent_usage_period ON agent_usage(period_start, period_end);
CREATE INDEX idx_agent_usage_agent ON agent_usage(agent_id);