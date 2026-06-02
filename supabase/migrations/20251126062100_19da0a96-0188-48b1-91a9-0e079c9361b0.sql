-- Comprehensive Feature Upgrade Migration
-- This migration adds all 10 new feature systems

-- 1. Workflow Templates System
CREATE TABLE workflow_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text,
  industry_tags text[],
  thumbnail_url text,
  nodes jsonb NOT NULL,
  edges jsonb NOT NULL,
  trigger_type text NOT NULL,
  is_premium boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  is_active boolean DEFAULT true,
  use_count integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE workspace_template_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  template_id uuid REFERENCES workflow_templates(id) ON DELETE CASCADE,
  workflow_id uuid REFERENCES workflows(id) ON DELETE SET NULL,
  used_at timestamptz DEFAULT now()
);

-- 2. Agent Memory System
CREATE TABLE agent_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES ai_agents(id) ON DELETE CASCADE,
  memory_type text NOT NULL,
  content text NOT NULL,
  context jsonb DEFAULT '{}',
  importance_score integer DEFAULT 5 CHECK (importance_score BETWEEN 1 AND 10),
  access_count integer DEFAULT 0,
  last_accessed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

CREATE INDEX idx_agent_memory_workspace ON agent_memory(workspace_id);
CREATE INDEX idx_agent_memory_agent ON agent_memory(agent_id);
CREATE INDEX idx_agent_memory_type ON agent_memory(memory_type);

-- 3. Insights Dashboard System
CREATE TABLE workspace_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  insight_type text NOT NULL,
  title text NOT NULL,
  description text,
  metric_value numeric,
  metric_unit text,
  trend text CHECK (trend IN ('up', 'down', 'stable')),
  trend_percentage numeric,
  confidence_score numeric CHECK (confidence_score BETWEEN 0 AND 1),
  recommendations jsonb DEFAULT '[]',
  data_points jsonb DEFAULT '{}',
  is_read boolean DEFAULT false,
  generated_at timestamptz DEFAULT now(),
  valid_until timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_workspace_insights_workspace ON workspace_insights(workspace_id);
CREATE INDEX idx_workspace_insights_type ON workspace_insights(insight_type);

-- 4. Enhanced Onboarding System
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS onboarding_business_type text,
  ADD COLUMN IF NOT EXISTS onboarding_goals text[],
  ADD COLUMN IF NOT EXISTS onboarding_team_size text,
  ADD COLUMN IF NOT EXISTS onboarding_monthly_leads integer,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_call_scheduled boolean DEFAULT false;

CREATE TABLE onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  step_name text NOT NULL,
  step_order integer NOT NULL,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE business_type_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_type text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text,
  default_pipeline_stages jsonb,
  recommended_workflows text[],
  onboarding_tips jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 5. Tiered Feature Access System
CREATE TABLE plan_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES plans(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  feature_name text NOT NULL,
  is_enabled boolean DEFAULT true,
  limit_value integer,
  limit_type text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(plan_id, feature_key)
);

CREATE TABLE workspace_feature_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  usage_count integer DEFAULT 0,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, feature_key, period_start)
);

-- Function to check feature access
CREATE OR REPLACE FUNCTION can_use_feature(
  p_workspace_id uuid,
  p_feature_key text,
  p_increment_usage boolean DEFAULT false
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer;
  v_current_usage integer;
  v_period_start timestamptz;
  v_period_end timestamptz;
BEGIN
  -- Get current period
  v_period_start := date_trunc('month', now());
  v_period_end := v_period_start + interval '1 month';
  
  -- Get feature limit from subscription
  SELECT pf.limit_value INTO v_limit
  FROM subscriptions s
  JOIN plan_features pf ON s.plan_id = pf.plan_id
  WHERE s.workspace_id = p_workspace_id
    AND pf.feature_key = p_feature_key
    AND s.status IN ('active', 'trial');
  
  -- If no limit found or limit is null (unlimited), allow
  IF v_limit IS NULL THEN
    RETURN true;
  END IF;
  
  -- Get current usage
  SELECT COALESCE(usage_count, 0) INTO v_current_usage
  FROM workspace_feature_usage
  WHERE workspace_id = p_workspace_id
    AND feature_key = p_feature_key
    AND period_start = v_period_start;
  
  -- Check if under limit
  IF v_current_usage >= v_limit THEN
    RETURN false;
  END IF;
  
  -- Increment usage if requested
  IF p_increment_usage THEN
    INSERT INTO workspace_feature_usage (
      workspace_id, feature_key, usage_count, period_start, period_end
    ) VALUES (
      p_workspace_id, p_feature_key, 1, v_period_start, v_period_end
    )
    ON CONFLICT (workspace_id, feature_key, period_start)
    DO UPDATE SET 
      usage_count = workspace_feature_usage.usage_count + 1,
      updated_at = now();
  END IF;
  
  RETURN true;
END;
$$;

-- 6. Workflow Analytics System
CREATE TABLE workflow_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES workflows(id) ON DELETE CASCADE,
  metric_type text NOT NULL,
  metric_value numeric,
  period_start timestamptz,
  period_end timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE workflow_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES workflows(id) ON DELETE CASCADE,
  recommendation_type text NOT NULL,
  title text NOT NULL,
  description text,
  expected_improvement text,
  is_applied boolean DEFAULT false,
  applied_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_workflow_analytics_workflow ON workflow_analytics(workflow_id);
CREATE INDEX idx_workflow_recommendations_workflow ON workflow_recommendations(workflow_id);

-- 7. Enhanced Webhook System
CREATE TABLE webhook_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  provider text NOT NULL,
  logo_url text,
  config_schema jsonb,
  is_premium boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE webhook_configs
  ADD COLUMN IF NOT EXISTS integration_id uuid REFERENCES webhook_integrations(id),
  ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_tested_at timestamptz,
  ADD COLUMN IF NOT EXISTS test_result jsonb;

-- 8. Smart Lead Scoring System
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_factors jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS enrichment_data jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_scored_at timestamptz;

CREATE TABLE scoring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  rule_name text NOT NULL,
  condition jsonb NOT NULL,
  score_delta integer NOT NULL,
  is_active boolean DEFAULT true,
  priority integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_scoring_rules_workspace ON scoring_rules(workspace_id);

-- 9. Multi-Channel Communication Hub
CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  channel text NOT NULL,
  status text DEFAULT 'open',
  assigned_to uuid REFERENCES auth.users(id),
  last_message_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  direction text NOT NULL,
  channel text NOT NULL,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  ai_generated boolean DEFAULT false,
  read_at timestamptz,
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_conversations_workspace ON conversations(workspace_id);
CREATE INDEX idx_conversations_lead ON conversations(lead_id);
CREATE INDEX idx_conversations_contact ON conversations(contact_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);

-- 10. Form Analytics & Optimization
ALTER TABLE form_metrics
  ADD COLUMN IF NOT EXISTS session_id text,
  ADD COLUMN IF NOT EXISTS time_to_submit integer,
  ADD COLUMN IF NOT EXISTS fields_changed jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS device_type text,
  ADD COLUMN IF NOT EXISTS browser text,
  ADD COLUMN IF NOT EXISTS variant_id uuid;

CREATE TABLE form_ab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid REFERENCES forms(id) ON DELETE CASCADE,
  variant_name text NOT NULL,
  variant_config jsonb NOT NULL,
  traffic_percentage integer DEFAULT 50 CHECK (traffic_percentage BETWEEN 0 AND 100),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE form_analytics_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid REFERENCES forms(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES form_ab_tests(id) ON DELETE CASCADE,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  views integer DEFAULT 0,
  submissions integer DEFAULT 0,
  conversion_rate numeric,
  avg_time_to_submit numeric,
  created_at timestamptz DEFAULT now()
);

-- RLS Policies
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_template_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_type_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_feature_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_analytics_summary ENABLE ROW LEVEL SECURITY;

-- RLS: Workflow Templates (public read, admin write)
CREATE POLICY "Anyone can view active templates"
  ON workflow_templates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage templates"
  ON workflow_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS: Template Usage (workspace-scoped)
CREATE POLICY "Users can track their workspace template usage"
  ON workspace_template_usage FOR ALL
  USING (workspace_id IN (SELECT get_user_workspaces(auth.uid())));

-- RLS: Agent Memory (workspace-scoped)
CREATE POLICY "Users can manage their workspace agent memory"
  ON agent_memory FOR ALL
  USING (workspace_id IN (SELECT get_user_workspaces(auth.uid())));

-- RLS: Insights (workspace-scoped)
CREATE POLICY "Users can view their workspace insights"
  ON workspace_insights FOR ALL
  USING (workspace_id IN (SELECT get_user_workspaces(auth.uid())));

-- RLS: Onboarding Progress (workspace-scoped)
CREATE POLICY "Users can manage their workspace onboarding"
  ON onboarding_progress FOR ALL
  USING (workspace_id IN (SELECT get_user_workspaces(auth.uid())));

-- RLS: Business Type Configs (public read, admin write)
CREATE POLICY "Anyone can view business type configs"
  ON business_type_configs FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage business configs"
  ON business_type_configs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS: Plan Features (public read, admin write)
CREATE POLICY "Anyone can view plan features"
  ON plan_features FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage plan features"
  ON plan_features FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS: Feature Usage (workspace-scoped)
CREATE POLICY "Users can view their workspace feature usage"
  ON workspace_feature_usage FOR ALL
  USING (workspace_id IN (SELECT get_user_workspaces(auth.uid())));

-- RLS: Workflow Analytics (workspace-scoped via workflow)
CREATE POLICY "Users can view their workflow analytics"
  ON workflow_analytics FOR SELECT
  USING (workflow_id IN (
    SELECT id FROM workflows WHERE workspace_id IN (SELECT get_user_workspaces(auth.uid()))
  ));

CREATE POLICY "System can insert workflow analytics"
  ON workflow_analytics FOR INSERT
  WITH CHECK (true);

-- RLS: Workflow Recommendations (workspace-scoped via workflow)
CREATE POLICY "Users can manage their workflow recommendations"
  ON workflow_recommendations FOR ALL
  USING (workflow_id IN (
    SELECT id FROM workflows WHERE workspace_id IN (SELECT get_user_workspaces(auth.uid()))
  ));

-- RLS: Webhook Integrations (public read, admin write)
CREATE POLICY "Anyone can view webhook integrations"
  ON webhook_integrations FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage webhook integrations"
  ON webhook_integrations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS: Scoring Rules (workspace-scoped)
CREATE POLICY "Users can manage their workspace scoring rules"
  ON scoring_rules FOR ALL
  USING (workspace_id IN (SELECT get_user_workspaces(auth.uid())));

-- RLS: Conversations (workspace-scoped)
CREATE POLICY "Users can manage their workspace conversations"
  ON conversations FOR ALL
  USING (workspace_id IN (SELECT get_user_workspaces(auth.uid())));

-- RLS: Messages (workspace-scoped via conversation)
CREATE POLICY "Users can manage messages in their workspace conversations"
  ON messages FOR ALL
  USING (conversation_id IN (
    SELECT id FROM conversations WHERE workspace_id IN (SELECT get_user_workspaces(auth.uid()))
  ));

-- RLS: Form A/B Tests (workspace-scoped via form)
CREATE POLICY "Users can manage their form tests"
  ON form_ab_tests FOR ALL
  USING (form_id IN (
    SELECT id FROM forms WHERE workspace_id IN (SELECT get_user_workspaces(auth.uid()))
  ));

-- RLS: Form Analytics Summary (workspace-scoped via form)
CREATE POLICY "Users can view their form analytics"
  ON form_analytics_summary FOR SELECT
  USING (form_id IN (
    SELECT id FROM forms WHERE workspace_id IN (SELECT get_user_workspaces(auth.uid()))
  ));