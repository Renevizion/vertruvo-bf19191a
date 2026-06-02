-- Fix overly permissive RLS policies
-- These tables should only be modified by service role (edge functions), not regular users

-- 1. agent_usage - System tracking only
DROP POLICY IF EXISTS "System can track agent usage" ON public.agent_usage;
DROP POLICY IF EXISTS "System can update agent usage" ON public.agent_usage;
-- Service role bypasses RLS, so we don't need permissive policies

-- 2. audit_logs - System audit only
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
-- Service role bypasses RLS

-- 3. cohort_analysis - System analytics only
DROP POLICY IF EXISTS "System can manage cohort analysis" ON public.cohort_analysis;
-- Service role bypasses RLS

-- 4. email_campaign_metrics - System metrics only
DROP POLICY IF EXISTS "System can manage campaign metrics" ON public.email_campaign_metrics;
-- Service role bypasses RLS

-- 5. events - System event tracking only
DROP POLICY IF EXISTS "System can create events" ON public.events;
-- Service role bypasses RLS

-- 6. feature_adoption - System tracking only
DROP POLICY IF EXISTS "System can manage feature adoption" ON public.feature_adoption;
-- Service role bypasses RLS

-- 7. health_scores - System metrics only
DROP POLICY IF EXISTS "System can manage health scores" ON public.health_scores;
-- Service role bypasses RLS

-- 8. inbound_emails - System processing only
DROP POLICY IF EXISTS "Service role can insert inbound emails" ON public.inbound_emails;
-- Service role bypasses RLS

-- 9. lifecycle_stages - System management only
DROP POLICY IF EXISTS "System can manage lifecycle stages" ON public.lifecycle_stages;
-- Service role bypasses RLS

-- 10. milestones - System management only
DROP POLICY IF EXISTS "System can manage milestones" ON public.milestones;
-- Service role bypasses RLS

-- 11. pending_tool_suggestions - Only platform admins should manage
DROP POLICY IF EXISTS "Admins can manage suggestions" ON public.pending_tool_suggestions;
DROP POLICY IF EXISTS "Admins can view suggestions" ON public.pending_tool_suggestions;
-- Create proper admin-only policy using has_role function
CREATE POLICY "Platform admins can manage suggestions"
ON public.pending_tool_suggestions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 12. referrals - System management only
DROP POLICY IF EXISTS "System can manage referrals" ON public.referrals;
-- Service role bypasses RLS

-- 13. subscriptions - System management only
DROP POLICY IF EXISTS "System can manage subscriptions" ON public.subscriptions;
-- Service role bypasses RLS

-- 14. usage_tracking - System tracking only
DROP POLICY IF EXISTS "System can manage usage tracking" ON public.usage_tracking;
-- Service role bypasses RLS

-- 15. workflow_analytics - System analytics only
DROP POLICY IF EXISTS "System can insert analytics" ON public.workflow_analytics;
DROP POLICY IF EXISTS "System can update analytics" ON public.workflow_analytics;
-- Service role bypasses RLS

-- 16. workflow_runs - System execution only
DROP POLICY IF EXISTS "System can create workflow runs" ON public.workflow_runs;
DROP POLICY IF EXISTS "System can update workflow runs" ON public.workflow_runs;
-- Service role bypasses RLS

-- Keep form_submissions and form_metrics INSERT policies as they're intentional for public form submissions
-- These allow anonymous form submissions which is expected behavior

-- Add workspace-scoped read policies for users to view their own data
-- where applicable (the data was already viewable, now we're explicit)

-- Users can view their own workflow runs
CREATE POLICY "Users can view own workflow runs"
ON public.workflow_runs
FOR SELECT
TO authenticated
USING (
  workflow_id IN (
    SELECT id FROM public.workflows 
    WHERE workspace_id IN (SELECT get_user_workspaces(auth.uid()))
  )
);

-- Users can view their own workflow analytics
CREATE POLICY "Users can view own workflow analytics"
ON public.workflow_analytics
FOR SELECT
TO authenticated
USING (
  workflow_id IN (
    SELECT id FROM public.workflows 
    WHERE workspace_id IN (SELECT get_user_workspaces(auth.uid()))
  )
);

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (
  workspace_id IN (SELECT get_user_workspaces(auth.uid()))
);

-- Users can view their own usage tracking
CREATE POLICY "Users can view own usage tracking"
ON public.usage_tracking
FOR SELECT
TO authenticated
USING (
  workspace_id IN (SELECT get_user_workspaces(auth.uid()))
);

-- Users can view their own health scores
CREATE POLICY "Users can view own health scores"
ON public.health_scores
FOR SELECT
TO authenticated
USING (
  workspace_id IN (SELECT get_user_workspaces(auth.uid()))
);

-- Users can view their own feature adoption
CREATE POLICY "Users can view own feature adoption"
ON public.feature_adoption
FOR SELECT
TO authenticated
USING (
  workspace_id IN (SELECT get_user_workspaces(auth.uid()))
);

-- Users can view their own agent usage
CREATE POLICY "Users can view own agent usage"
ON public.agent_usage
FOR SELECT
TO authenticated
USING (
  workspace_id IN (SELECT get_user_workspaces(auth.uid()))
);

-- Users can view their own events
CREATE POLICY "Users can view own events"
ON public.events
FOR SELECT
TO authenticated
USING (
  workspace_id IN (SELECT get_user_workspaces(auth.uid()))
);

-- Users can view their own email campaign metrics
CREATE POLICY "Users can view own campaign metrics"
ON public.email_campaign_metrics
FOR SELECT
TO authenticated
USING (
  campaign_id IN (
    SELECT id FROM public.email_campaigns 
    WHERE workspace_id IN (SELECT get_user_workspaces(auth.uid()))
  )
);

-- Users can view own audit logs
CREATE POLICY "Users can view own audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  workspace_id IN (SELECT get_user_workspaces(auth.uid()))
);

-- Users can view inbound emails for their workspace
CREATE POLICY "Users can view own inbound emails"
ON public.inbound_emails
FOR SELECT
TO authenticated
USING (
  workspace_id IN (SELECT get_user_workspaces(auth.uid()))
);