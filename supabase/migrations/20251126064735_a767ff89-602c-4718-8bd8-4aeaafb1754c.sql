-- Fix ALL remaining RLS policies that use get_user_workspaces() which causes infinite recursion
-- These must all use direct workspace ownership checks instead

-- FORMS (already exists but need to update)
DROP POLICY IF EXISTS "Users can view their workspace forms" ON forms;
DROP POLICY IF EXISTS "Users can create forms in their workspace" ON forms;
DROP POLICY IF EXISTS "Users can update their workspace forms" ON forms;
DROP POLICY IF EXISTS "Users can delete their workspace forms" ON forms;

CREATE POLICY "Users can view their workspace forms" ON forms
FOR SELECT USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can create forms in their workspace" ON forms
FOR INSERT WITH CHECK (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can update their workspace forms" ON forms
FOR UPDATE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can delete their workspace forms" ON forms
FOR DELETE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

-- CUSTOM_FIELDS
DROP POLICY IF EXISTS "Users can view workspace custom_fields" ON custom_fields;
DROP POLICY IF EXISTS "Users can create workspace custom_fields" ON custom_fields;
DROP POLICY IF EXISTS "Users can update workspace custom_fields" ON custom_fields;
DROP POLICY IF EXISTS "Users can delete workspace custom_fields" ON custom_fields;

CREATE POLICY "Users can view workspace custom_fields" ON custom_fields
FOR SELECT USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can create workspace custom_fields" ON custom_fields
FOR INSERT WITH CHECK (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can update workspace custom_fields" ON custom_fields
FOR UPDATE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can delete workspace custom_fields" ON custom_fields
FOR DELETE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

-- TWILIO_PHONE_NUMBERS
DROP POLICY IF EXISTS "Users can view their workspace phone numbers" ON twilio_phone_numbers;
DROP POLICY IF EXISTS "Users can create phone numbers in their workspace" ON twilio_phone_numbers;
DROP POLICY IF EXISTS "Users can update their workspace phone numbers" ON twilio_phone_numbers;
DROP POLICY IF EXISTS "Users can delete their workspace phone numbers" ON twilio_phone_numbers;

CREATE POLICY "Users can view their workspace phone numbers" ON twilio_phone_numbers
FOR SELECT USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can create phone numbers in their workspace" ON twilio_phone_numbers
FOR INSERT WITH CHECK (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can update their workspace phone numbers" ON twilio_phone_numbers
FOR UPDATE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can delete their workspace phone numbers" ON twilio_phone_numbers
FOR DELETE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

-- CALL_TEMPLATES
DROP POLICY IF EXISTS "Users can view their workspace call templates" ON call_templates;
DROP POLICY IF EXISTS "Users can create call templates in their workspace" ON call_templates;
DROP POLICY IF EXISTS "Users can update their workspace call templates" ON call_templates;
DROP POLICY IF EXISTS "Users can delete their workspace call templates" ON call_templates;

CREATE POLICY "Users can view their workspace call templates" ON call_templates
FOR SELECT USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can create call templates in their workspace" ON call_templates
FOR INSERT WITH CHECK (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can update their workspace call templates" ON call_templates
FOR UPDATE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can delete their workspace call templates" ON call_templates
FOR DELETE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

-- EMAIL_CAMPAIGNS
DROP POLICY IF EXISTS "Users can view their workspace campaigns" ON email_campaigns;
DROP POLICY IF EXISTS "Users can create campaigns in their workspace" ON email_campaigns;
DROP POLICY IF EXISTS "Users can update their workspace campaigns" ON email_campaigns;
DROP POLICY IF EXISTS "Users can delete their workspace campaigns" ON email_campaigns;

CREATE POLICY "Users can view their workspace campaigns" ON email_campaigns
FOR SELECT USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can create campaigns in their workspace" ON email_campaigns
FOR INSERT WITH CHECK (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can update their workspace campaigns" ON email_campaigns
FOR UPDATE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can delete their workspace campaigns" ON email_campaigns
FOR DELETE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

-- CONTENT_POSTS
DROP POLICY IF EXISTS "Users can manage their workspace content" ON content_posts;

CREATE POLICY "Users can view workspace content" ON content_posts
FOR SELECT USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can create workspace content" ON content_posts
FOR INSERT WITH CHECK (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can update workspace content" ON content_posts
FOR UPDATE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can delete workspace content" ON content_posts
FOR DELETE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

-- SCORING_RULES
DROP POLICY IF EXISTS "Users can manage their workspace scoring rules" ON scoring_rules;

CREATE POLICY "Users can view workspace scoring rules" ON scoring_rules
FOR SELECT USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can create workspace scoring rules" ON scoring_rules
FOR INSERT WITH CHECK (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can update workspace scoring rules" ON scoring_rules
FOR UPDATE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can delete workspace scoring rules" ON scoring_rules
FOR DELETE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

-- CONVERSATIONS
DROP POLICY IF EXISTS "Users can manage their workspace conversations" ON conversations;

CREATE POLICY "Users can view workspace conversations" ON conversations
FOR SELECT USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can create workspace conversations" ON conversations
FOR INSERT WITH CHECK (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can update workspace conversations" ON conversations
FOR UPDATE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can delete workspace conversations" ON conversations
FOR DELETE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

-- ONBOARDING_PROGRESS
DROP POLICY IF EXISTS "Users can manage their workspace onboarding" ON onboarding_progress;

CREATE POLICY "Users can view workspace onboarding" ON onboarding_progress
FOR SELECT USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can create workspace onboarding" ON onboarding_progress
FOR INSERT WITH CHECK (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can update workspace onboarding" ON onboarding_progress
FOR UPDATE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can delete workspace onboarding" ON onboarding_progress
FOR DELETE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

-- WORKSPACE_TEMPLATE_USAGE
DROP POLICY IF EXISTS "Users can track their workspace template usage" ON workspace_template_usage;

CREATE POLICY "Users can view workspace template usage" ON workspace_template_usage
FOR SELECT USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can create workspace template usage" ON workspace_template_usage
FOR INSERT WITH CHECK (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can update workspace template usage" ON workspace_template_usage
FOR UPDATE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can delete workspace template usage" ON workspace_template_usage
FOR DELETE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

-- FORM_SUBMISSIONS (keep public insert but fix select)
DROP POLICY IF EXISTS "Users can view submissions for their workspace forms" ON form_submissions;

CREATE POLICY "Users can view submissions for their workspace forms" ON form_submissions
FOR SELECT USING (
  form_id IN (SELECT id FROM forms WHERE workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
);

-- FORM_METRICS (keep public insert but fix select)
DROP POLICY IF EXISTS "Users can view metrics for their workspace forms" ON form_metrics;

CREATE POLICY "Users can view metrics for their workspace forms" ON form_metrics
FOR SELECT USING (
  form_id IN (SELECT id FROM forms WHERE workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
);

-- FORM_ANALYTICS_SUMMARY (fix select)
DROP POLICY IF EXISTS "Users can view their form analytics" ON form_analytics_summary;

CREATE POLICY "Users can view their form analytics" ON form_analytics_summary
FOR SELECT USING (
  form_id IN (SELECT id FROM forms WHERE workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
);

-- WORKFLOW_RECOMMENDATIONS
DROP POLICY IF EXISTS "Users can manage their workflow recommendations" ON workflow_recommendations;

CREATE POLICY "Users can view workflow recommendations" ON workflow_recommendations
FOR SELECT USING (
  workflow_id IN (SELECT id FROM workflows WHERE workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
);

CREATE POLICY "Users can create workflow recommendations" ON workflow_recommendations
FOR INSERT WITH CHECK (
  workflow_id IN (SELECT id FROM workflows WHERE workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
);

CREATE POLICY "Users can update workflow recommendations" ON workflow_recommendations
FOR UPDATE USING (
  workflow_id IN (SELECT id FROM workflows WHERE workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
);

CREATE POLICY "Users can delete workflow recommendations" ON workflow_recommendations
FOR DELETE USING (
  workflow_id IN (SELECT id FROM workflows WHERE workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
);

-- WORKFLOW_RUNS (fix select policy)
DROP POLICY IF EXISTS "Users can view runs for their workspace workflows" ON workflow_runs;

CREATE POLICY "Users can view runs for their workspace workflows" ON workflow_runs
FOR SELECT USING (
  workflow_id IN (SELECT id FROM workflows WHERE workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
);

-- AUDIT_LOGS (fix user view policy)
DROP POLICY IF EXISTS "Users can view their workspace audit logs" ON audit_logs;

CREATE POLICY "Users can view their workspace audit logs" ON audit_logs
FOR SELECT USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

-- EVENTS (fix view policy)
DROP POLICY IF EXISTS "Users can view their workspace events" ON events;

CREATE POLICY "Users can view their workspace events" ON events
FOR SELECT USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

-- SUBSCRIPTIONS (fix view policy)
DROP POLICY IF EXISTS "Users can view their workspace subscription" ON subscriptions;

CREATE POLICY "Users can view their workspace subscription" ON subscriptions
FOR SELECT USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

-- USAGE_TRACKING (fix view policy)
DROP POLICY IF EXISTS "Users can view their workspace usage" ON usage_tracking;

CREATE POLICY "Users can view their workspace usage" ON usage_tracking
FOR SELECT USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

-- REFERRALS (fix view policy)
DROP POLICY IF EXISTS "Users can view their referrals" ON referrals;

CREATE POLICY "Users can view their referrals" ON referrals
FOR SELECT USING (
  (referrer_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())) OR
  (referred_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
);

-- PROFILES (fix workspace member view - this one is complex, keep simpler version)
DROP POLICY IF EXISTS "Users can view workspace profiles" ON profiles;

CREATE POLICY "Users can view workspace profiles" ON profiles
FOR SELECT USING (
  (id = auth.uid()) OR 
  (id IN (SELECT owner_id FROM workspaces WHERE owner_id = auth.uid()))
);