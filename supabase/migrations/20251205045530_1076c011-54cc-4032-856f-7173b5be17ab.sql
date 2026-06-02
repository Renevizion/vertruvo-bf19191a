-- =====================================================
-- COMPREHENSIVE SECURITY FIX: Drop all permissive policies and create restrictive ones
-- =====================================================

-- CONTACTS TABLE
DROP POLICY IF EXISTS "Allow all operations" ON contacts;
DROP POLICY IF EXISTS "Users can view own workspace contacts" ON contacts;
DROP POLICY IF EXISTS "Users can insert own workspace contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update own workspace contacts" ON contacts;
DROP POLICY IF EXISTS "Users can delete own workspace contacts" ON contacts;

CREATE POLICY "Users can view own workspace contacts" ON contacts
  FOR SELECT USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "Users can insert own workspace contacts" ON contacts
  FOR INSERT WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "Users can update own workspace contacts" ON contacts
  FOR UPDATE USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "Users can delete own workspace contacts" ON contacts
  FOR DELETE USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- LEADS TABLE
DROP POLICY IF EXISTS "Allow all operations" ON leads;
DROP POLICY IF EXISTS "Users can view own workspace leads" ON leads;
DROP POLICY IF EXISTS "Users can insert own workspace leads" ON leads;
DROP POLICY IF EXISTS "Users can update own workspace leads" ON leads;
DROP POLICY IF EXISTS "Users can delete own workspace leads" ON leads;

CREATE POLICY "Users can view own workspace leads" ON leads
  FOR SELECT USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "Users can insert own workspace leads" ON leads
  FOR INSERT WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "Users can update own workspace leads" ON leads
  FOR UPDATE USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "Users can delete own workspace leads" ON leads
  FOR DELETE USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- PROFILES TABLE
DROP POLICY IF EXISTS "Allow all operations" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- GOOGLE SHEET INTEGRATIONS
DROP POLICY IF EXISTS "Allow all operations" ON google_sheet_integrations;
DROP POLICY IF EXISTS "Users can view own integrations" ON google_sheet_integrations;
DROP POLICY IF EXISTS "Users can insert own integrations" ON google_sheet_integrations;
DROP POLICY IF EXISTS "Users can update own integrations" ON google_sheet_integrations;
DROP POLICY IF EXISTS "Users can delete own integrations" ON google_sheet_integrations;

CREATE POLICY "Users can view own integrations" ON google_sheet_integrations
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own integrations" ON google_sheet_integrations
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own integrations" ON google_sheet_integrations
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own integrations" ON google_sheet_integrations
  FOR DELETE USING (user_id = auth.uid());

-- SOCIAL MEDIA ACCOUNTS
DROP POLICY IF EXISTS "Allow all operations" ON social_media_accounts;
DROP POLICY IF EXISTS "Users can view own accounts" ON social_media_accounts;
DROP POLICY IF EXISTS "Users can insert own accounts" ON social_media_accounts;
DROP POLICY IF EXISTS "Users can update own accounts" ON social_media_accounts;
DROP POLICY IF EXISTS "Users can delete own accounts" ON social_media_accounts;

CREATE POLICY "Users can view own accounts" ON social_media_accounts
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own accounts" ON social_media_accounts
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own accounts" ON social_media_accounts
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own accounts" ON social_media_accounts
  FOR DELETE USING (user_id = auth.uid());

-- DELETED LEADS
DROP POLICY IF EXISTS "Allow all operations" ON deleted_leads;
DROP POLICY IF EXISTS "Workspace owners can manage deleted leads" ON deleted_leads;

CREATE POLICY "Workspace owners can manage deleted leads" ON deleted_leads
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- BUSINESS SETTINGS
DROP POLICY IF EXISTS "Allow all operations" ON business_settings;
DROP POLICY IF EXISTS "Users can view own workspace settings" ON business_settings;
DROP POLICY IF EXISTS "Users can update own workspace settings" ON business_settings;
DROP POLICY IF EXISTS "Users can insert own workspace settings" ON business_settings;

CREATE POLICY "Users can view own workspace settings" ON business_settings
  FOR SELECT USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "Users can update own workspace settings" ON business_settings
  FOR UPDATE USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "Users can insert own workspace settings" ON business_settings
  FOR INSERT WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- TWILIO PHONE NUMBERS (if exists)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow all operations" ON twilio_phone_numbers;
  DROP POLICY IF EXISTS "Users can view own workspace numbers" ON twilio_phone_numbers;
  DROP POLICY IF EXISTS "Users can manage own workspace numbers" ON twilio_phone_numbers;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- SUBSCRIPTIONS
DROP POLICY IF EXISTS "Allow all operations" ON subscriptions;
DROP POLICY IF EXISTS "Users can view own workspace subscriptions" ON subscriptions;

CREATE POLICY "Users can view own workspace subscriptions" ON subscriptions
  FOR SELECT USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- WEBHOOK CONFIGS
DROP POLICY IF EXISTS "Allow all operations" ON webhook_configs;
DROP POLICY IF EXISTS "Users can view own workspace webhooks" ON webhook_configs;
DROP POLICY IF EXISTS "Users can manage own workspace webhooks" ON webhook_configs;

CREATE POLICY "Users can view own workspace webhooks" ON webhook_configs
  FOR SELECT USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "Users can manage own workspace webhooks" ON webhook_configs
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- TASKS
DROP POLICY IF EXISTS "Allow all operations" ON tasks;
DROP POLICY IF EXISTS "Users can view own workspace tasks" ON tasks;
DROP POLICY IF EXISTS "Users can manage own workspace tasks" ON tasks;

CREATE POLICY "Users can view own workspace tasks" ON tasks
  FOR SELECT USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "Users can manage own workspace tasks" ON tasks
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- ACTIVITIES
DROP POLICY IF EXISTS "Allow all operations" ON activities;
DROP POLICY IF EXISTS "Users can view own workspace activities" ON activities;
DROP POLICY IF EXISTS "Users can manage own workspace activities" ON activities;

CREATE POLICY "Users can view own workspace activities" ON activities
  FOR SELECT USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "Users can manage own workspace activities" ON activities
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- CONVERSATIONS
DROP POLICY IF EXISTS "Allow all operations" ON conversations;
DROP POLICY IF EXISTS "Users can view own workspace conversations" ON conversations;
DROP POLICY IF EXISTS "Users can manage own workspace conversations" ON conversations;

CREATE POLICY "Users can view own workspace conversations" ON conversations
  FOR SELECT USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "Users can manage own workspace conversations" ON conversations
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- MESSAGES (through conversation ownership)
DROP POLICY IF EXISTS "Allow all operations" ON messages;
DROP POLICY IF EXISTS "Users can view own messages" ON messages;
DROP POLICY IF EXISTS "Users can manage own messages" ON messages;

CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (conversation_id IN (
    SELECT id FROM conversations WHERE workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  ));
CREATE POLICY "Users can manage own messages" ON messages
  FOR ALL USING (conversation_id IN (
    SELECT id FROM conversations WHERE workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  ));

-- CALL LOGS
DROP POLICY IF EXISTS "Allow all operations" ON call_logs;
DROP POLICY IF EXISTS "Users can view own workspace calls" ON call_logs;
DROP POLICY IF EXISTS "Users can manage own workspace calls" ON call_logs;

CREATE POLICY "Users can view own workspace calls" ON call_logs
  FOR SELECT USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "Users can manage own workspace calls" ON call_logs
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- WORKFLOWS
DROP POLICY IF EXISTS "Allow all operations" ON workflows;
DROP POLICY IF EXISTS "Users can view own workspace workflows" ON workflows;
DROP POLICY IF EXISTS "Users can manage own workspace workflows" ON workflows;

CREATE POLICY "Users can view own workspace workflows" ON workflows
  FOR SELECT USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "Users can manage own workspace workflows" ON workflows
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- AI AGENTS
DROP POLICY IF EXISTS "Allow all operations" ON ai_agents;
DROP POLICY IF EXISTS "Users can view own workspace agents" ON ai_agents;
DROP POLICY IF EXISTS "Users can manage own workspace agents" ON ai_agents;

CREATE POLICY "Users can view own workspace agents" ON ai_agents
  FOR SELECT USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "Users can manage own workspace agents" ON ai_agents
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- KNOWLEDGE BASES
DROP POLICY IF EXISTS "Allow all operations" ON knowledge_bases;
DROP POLICY IF EXISTS "Users can view own workspace knowledge bases" ON knowledge_bases;
DROP POLICY IF EXISTS "Users can manage own workspace knowledge bases" ON knowledge_bases;

CREATE POLICY "Users can view own workspace knowledge bases" ON knowledge_bases
  FOR SELECT USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "Users can manage own workspace knowledge bases" ON knowledge_bases
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- PIPELINES
DROP POLICY IF EXISTS "Allow all operations" ON pipelines;
DROP POLICY IF EXISTS "Users can view own workspace pipelines" ON pipelines;
DROP POLICY IF EXISTS "Users can manage own workspace pipelines" ON pipelines;

CREATE POLICY "Users can view own workspace pipelines" ON pipelines
  FOR SELECT USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "Users can manage own workspace pipelines" ON pipelines
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- EMAIL CAMPAIGNS
DROP POLICY IF EXISTS "Allow all operations" ON email_campaigns;
DROP POLICY IF EXISTS "Users can view own workspace campaigns" ON email_campaigns;
DROP POLICY IF EXISTS "Users can manage own workspace campaigns" ON email_campaigns;

CREATE POLICY "Users can view own workspace campaigns" ON email_campaigns
  FOR SELECT USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "Users can manage own workspace campaigns" ON email_campaigns
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));