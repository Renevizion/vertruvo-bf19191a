-- ============================================
-- MONETIZATION ENGINE
-- ============================================

-- Plans table
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2),
  features JSONB DEFAULT '[]'::jsonb,
  limits JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  trial_days INTEGER DEFAULT 14,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans"
  ON public.plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "Only admins can manage plans"
  ON public.plans FOR ALL
  USING (is_admin_or_owner(auth.uid()));

-- Subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  status TEXT DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'past_due', 'canceled', 'expired')),
  trial_starts_at TIMESTAMP WITH TIME ZONE,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '1 month'),
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMP WITH TIME ZONE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(workspace_id)
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their workspace subscription"
  ON public.subscriptions FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM get_user_workspaces(auth.uid())));

CREATE POLICY "System can manage subscriptions"
  ON public.subscriptions FOR ALL
  USING (true);

-- Usage tracking table
CREATE TABLE public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their workspace usage"
  ON public.usage_tracking FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM get_user_workspaces(auth.uid())));

CREATE POLICY "System can manage usage tracking"
  ON public.usage_tracking FOR ALL
  USING (true);

CREATE INDEX idx_usage_tracking_workspace ON public.usage_tracking(workspace_id, period_start, period_end);

-- ============================================
-- GROWTH & VIRAL LOOPS
-- ============================================

-- Referrals table
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded')),
  reward_type TEXT,
  reward_value JSONB DEFAULT '{}'::jsonb,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their referrals"
  ON public.referrals FOR SELECT
  USING (
    referrer_id IN (SELECT workspace_id FROM get_user_workspaces(auth.uid()))
    OR referred_id IN (SELECT workspace_id FROM get_user_workspaces(auth.uid()))
  );

CREATE POLICY "System can manage referrals"
  ON public.referrals FOR ALL
  USING (true);

-- Content posts table
CREATE TABLE public.content_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  platform TEXT,
  posted_at TIMESTAMP WITH TIME ZONE,
  engagement_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.content_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their workspace content"
  ON public.content_posts FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM get_user_workspaces(auth.uid())));

-- Milestones table
CREATE TABLE public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL,
  achieved_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  celebrated BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their workspace milestones"
  ON public.milestones FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM get_user_workspaces(auth.uid())));

CREATE POLICY "System can manage milestones"
  ON public.milestones FOR ALL
  USING (true);

CREATE INDEX idx_milestones_workspace ON public.milestones(workspace_id, achieved_at);

-- ============================================
-- CUSTOMER LIFECYCLE
-- ============================================

-- Lifecycle stages table
CREATE TABLE public.lifecycle_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK (stage IN ('lead', 'trial', 'customer', 'champion', 'at_risk', 'churned')),
  entered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  exited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.lifecycle_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their workspace lifecycle"
  ON public.lifecycle_stages FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM get_user_workspaces(auth.uid())));

CREATE POLICY "System can manage lifecycle stages"
  ON public.lifecycle_stages FOR ALL
  USING (true);

CREATE INDEX idx_lifecycle_workspace ON public.lifecycle_stages(workspace_id, stage, entered_at);

-- Health scores table
CREATE TABLE public.health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  factors JSONB DEFAULT '{}'::jsonb,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.health_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their workspace health"
  ON public.health_scores FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM get_user_workspaces(auth.uid())));

CREATE POLICY "System can manage health scores"
  ON public.health_scores FOR ALL
  USING (true);

CREATE INDEX idx_health_scores_workspace ON public.health_scores(workspace_id, calculated_at);

-- ============================================
-- PRODUCT ANALYTICS
-- ============================================

-- Events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  properties JSONB DEFAULT '{}'::jsonb,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their workspace events"
  ON public.events FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM get_user_workspaces(auth.uid())));

CREATE POLICY "System can create events"
  ON public.events FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_events_workspace_created ON public.events(workspace_id, created_at);
CREATE INDEX idx_events_name ON public.events(event_name, created_at);

-- Feature adoption table
CREATE TABLE public.feature_adoption (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  first_used_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  usage_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(workspace_id, feature_name)
);

ALTER TABLE public.feature_adoption ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their workspace feature adoption"
  ON public.feature_adoption FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM get_user_workspaces(auth.uid())));

CREATE POLICY "System can manage feature adoption"
  ON public.feature_adoption FOR ALL
  USING (true);

-- Cohort analysis table
CREATE TABLE public.cohort_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_month TEXT NOT NULL,
  workspace_count INTEGER NOT NULL DEFAULT 0,
  retained_count INTEGER NOT NULL DEFAULT 0,
  churned_count INTEGER NOT NULL DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(cohort_month)
);

ALTER TABLE public.cohort_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view cohort analysis"
  ON public.cohort_analysis FOR SELECT
  USING (is_admin_or_owner(auth.uid()));

CREATE POLICY "System can manage cohort analysis"
  ON public.cohort_analysis FOR ALL
  USING (true);

-- ============================================
-- TRIGGERS FOR AUTO-UPDATES
-- ============================================

-- Update updated_at timestamps
CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- SEED DEFAULT PLANS
-- ============================================

INSERT INTO public.plans (name, description, price_monthly, price_yearly, features, limits) VALUES
('Free', 'Get started with basic features', 0, 0, 
 '["5 workflows", "100 leads", "Email support"]'::jsonb,
 '{"workflows": 5, "leads": 100, "ai_credits": 50}'::jsonb),
('Pro', 'For growing businesses', 49, 490,
 '["Unlimited workflows", "10,000 leads", "500 AI credits/month", "Priority support", "Advanced analytics"]'::jsonb,
 '{"workflows": -1, "leads": 10000, "ai_credits": 500}'::jsonb),
('Enterprise', 'For large organizations', 199, 1990,
 '["Everything in Pro", "Unlimited leads", "Unlimited AI credits", "Dedicated support", "Custom integrations", "SLA"]'::jsonb,
 '{"workflows": -1, "leads": -1, "ai_credits": -1}'::jsonb);

-- ============================================
-- FUNCTIONS FOR BUSINESS LOGIC
-- ============================================

-- Function to check if workspace is within plan limits
CREATE OR REPLACE FUNCTION public.check_plan_limit(
  _workspace_id UUID,
  _metric_type TEXT,
  _current_usage INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  _limit INTEGER;
BEGIN
  SELECT (s.plan_id::TEXT || '.limits.' || _metric_type)::jsonb::INTEGER
  INTO _limit
  FROM public.subscriptions s
  JOIN public.plans p ON s.plan_id = p.id
  WHERE s.workspace_id = _workspace_id
  AND s.status IN ('trial', 'active');
  
  -- -1 means unlimited
  IF _limit = -1 THEN
    RETURN TRUE;
  END IF;
  
  RETURN _current_usage < _limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to track feature usage
CREATE OR REPLACE FUNCTION public.track_feature_usage(
  _workspace_id UUID,
  _feature_name TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.feature_adoption (workspace_id, feature_name, usage_count)
  VALUES (_workspace_id, _feature_name, 1)
  ON CONFLICT (workspace_id, feature_name) 
  DO UPDATE SET 
    usage_count = public.feature_adoption.usage_count + 1,
    last_used_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;