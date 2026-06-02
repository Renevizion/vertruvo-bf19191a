-- =====================================================
-- CONSOLIDATE DUPLICATE RLS POLICIES
-- Drop redundant policies and keep one per operation type
-- =====================================================

-- =====================================================
-- CONTACTS TABLE - Keep only essential policies
-- =====================================================
DROP POLICY IF EXISTS "Users can manage workspace contacts" ON contacts;
DROP POLICY IF EXISTS "Users can delete contacts in their workspaces" ON contacts;
DROP POLICY IF EXISTS "Users can delete own workspace contacts" ON contacts;
DROP POLICY IF EXISTS "Users can delete workspace contacts" ON contacts;
DROP POLICY IF EXISTS "Users can create contacts in their workspaces" ON contacts;
DROP POLICY IF EXISTS "Users can create workspace contacts" ON contacts;
DROP POLICY IF EXISTS "Users can insert own workspace contacts" ON contacts;
DROP POLICY IF EXISTS "Users can view contacts in their workspaces" ON contacts;
DROP POLICY IF EXISTS "Users can view own workspace contacts" ON contacts;
DROP POLICY IF EXISTS "Users can view workspace contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update contacts in their workspaces" ON contacts;
DROP POLICY IF EXISTS "Users can update own workspace contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update workspace contacts" ON contacts;

-- Create single authoritative policies for contacts
CREATE POLICY "contacts_select" ON contacts FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "contacts_insert" ON contacts FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "contacts_update" ON contacts FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "contacts_delete" ON contacts FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- =====================================================
-- LEADS TABLE - Keep only essential policies
-- =====================================================
DROP POLICY IF EXISTS "Users can manage workspace leads" ON leads;
DROP POLICY IF EXISTS "Users can delete leads in their workspaces" ON leads;
DROP POLICY IF EXISTS "Users can delete own workspace leads" ON leads;
DROP POLICY IF EXISTS "Users can delete workspace leads" ON leads;
DROP POLICY IF EXISTS "Users can create leads in their workspaces" ON leads;
DROP POLICY IF EXISTS "Users can create workspace leads" ON leads;
DROP POLICY IF EXISTS "Users can insert own workspace leads" ON leads;
DROP POLICY IF EXISTS "Users can view leads in their workspaces" ON leads;
DROP POLICY IF EXISTS "Users can view own workspace leads" ON leads;
DROP POLICY IF EXISTS "Users can view workspace leads" ON leads;
DROP POLICY IF EXISTS "Users can update leads in their workspaces" ON leads;
DROP POLICY IF EXISTS "Users can update own workspace leads" ON leads;
DROP POLICY IF EXISTS "Users can update workspace leads" ON leads;

-- Create single authoritative policies for leads
CREATE POLICY "leads_select" ON leads FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "leads_insert" ON leads FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "leads_update" ON leads FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "leads_delete" ON leads FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- =====================================================
-- WORKFLOWS TABLE - Keep only essential policies
-- =====================================================
DROP POLICY IF EXISTS "Users can manage own workspace workflows" ON workflows;
DROP POLICY IF EXISTS "Users can manage workspace workflows" ON workflows;
DROP POLICY IF EXISTS "Users can delete workflows in their workspace" ON workflows;
DROP POLICY IF EXISTS "Users can delete workflows in their workspaces" ON workflows;
DROP POLICY IF EXISTS "Users can delete workspace workflows" ON workflows;
DROP POLICY IF EXISTS "Users can create workflows in their workspace" ON workflows;
DROP POLICY IF EXISTS "Users can create workflows in their workspaces" ON workflows;
DROP POLICY IF EXISTS "Users can create workspace workflows" ON workflows;
DROP POLICY IF EXISTS "Users can view own workspace workflows" ON workflows;
DROP POLICY IF EXISTS "Users can view workflows in their workspace" ON workflows;
DROP POLICY IF EXISTS "Users can view workflows in their workspaces" ON workflows;
DROP POLICY IF EXISTS "Users can view workspace workflows" ON workflows;
DROP POLICY IF EXISTS "Users can update workflows in their workspace" ON workflows;
DROP POLICY IF EXISTS "Users can update workflows in their workspaces" ON workflows;
DROP POLICY IF EXISTS "Users can update workspace workflows" ON workflows;

-- Create single authoritative policies for workflows
CREATE POLICY "workflows_select" ON workflows FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "workflows_insert" ON workflows FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "workflows_update" ON workflows FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "workflows_delete" ON workflows FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- =====================================================
-- PIPELINES TABLE - Keep only essential policies
-- =====================================================
DROP POLICY IF EXISTS "Users can manage own workspace pipelines" ON pipelines;
DROP POLICY IF EXISTS "Users can manage workspace pipelines" ON pipelines;
DROP POLICY IF EXISTS "Users can delete pipelines in their workspace" ON pipelines;
DROP POLICY IF EXISTS "Users can delete pipelines in their workspaces" ON pipelines;
DROP POLICY IF EXISTS "Users can create pipelines in their workspace" ON pipelines;
DROP POLICY IF EXISTS "Users can create pipelines in their workspaces" ON pipelines;
DROP POLICY IF EXISTS "Users can view own workspace pipelines" ON pipelines;
DROP POLICY IF EXISTS "Users can view pipelines in their workspace" ON pipelines;
DROP POLICY IF EXISTS "Users can view pipelines in their workspaces" ON pipelines;
DROP POLICY IF EXISTS "Users can update pipelines in their workspace" ON pipelines;
DROP POLICY IF EXISTS "Users can update pipelines in their workspaces" ON pipelines;

-- Create single authoritative policies for pipelines
CREATE POLICY "pipelines_select" ON pipelines FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "pipelines_insert" ON pipelines FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "pipelines_update" ON pipelines FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "pipelines_delete" ON pipelines FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- =====================================================
-- FORMS TABLE - Keep only essential policies
-- =====================================================
DROP POLICY IF EXISTS "Users can manage workspace forms" ON forms;
DROP POLICY IF EXISTS "Users can delete forms in their workspaces" ON forms;
DROP POLICY IF EXISTS "Users can delete their workspace forms" ON forms;
DROP POLICY IF EXISTS "Users can create forms in their workspace" ON forms;
DROP POLICY IF EXISTS "Users can create forms in their workspaces" ON forms;
DROP POLICY IF EXISTS "Anonymous users can view active forms" ON forms;
DROP POLICY IF EXISTS "Anyone can read active forms" ON forms;
DROP POLICY IF EXISTS "Users can view forms in their workspaces" ON forms;
DROP POLICY IF EXISTS "Users can view their workspace forms" ON forms;
DROP POLICY IF EXISTS "Users can update forms in their workspaces" ON forms;
DROP POLICY IF EXISTS "Users can update their workspace forms" ON forms;

-- Create single authoritative policies for forms
-- Keep public read for active forms (needed for embedded forms)
CREATE POLICY "forms_public_read" ON forms FOR SELECT
  USING (is_active = true);

CREATE POLICY "forms_select" ON forms FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "forms_insert" ON forms FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "forms_update" ON forms FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "forms_delete" ON forms FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- =====================================================
-- SOCIAL_MEDIA_ACCOUNTS TABLE - Keep only essential policies
-- =====================================================
DROP POLICY IF EXISTS "Users can manage own social accounts" ON social_media_accounts;
DROP POLICY IF EXISTS "Users can delete own accounts" ON social_media_accounts;
DROP POLICY IF EXISTS "Users can delete their own social media accounts" ON social_media_accounts;
DROP POLICY IF EXISTS "social_media_delete" ON social_media_accounts;
DROP POLICY IF EXISTS "Users can insert own accounts" ON social_media_accounts;
DROP POLICY IF EXISTS "Users can insert their own social media accounts" ON social_media_accounts;
DROP POLICY IF EXISTS "social_media_insert" ON social_media_accounts;
DROP POLICY IF EXISTS "Users can view own accounts" ON social_media_accounts;
DROP POLICY IF EXISTS "Users can view their own social media accounts" ON social_media_accounts;
DROP POLICY IF EXISTS "social_media_select" ON social_media_accounts;
DROP POLICY IF EXISTS "Users can update own accounts" ON social_media_accounts;
DROP POLICY IF EXISTS "Users can update their own social media accounts" ON social_media_accounts;
DROP POLICY IF EXISTS "social_media_update" ON social_media_accounts;

-- Create single authoritative policies for social_media_accounts (user_id based)
CREATE POLICY "social_media_accounts_select" ON social_media_accounts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "social_media_accounts_insert" ON social_media_accounts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "social_media_accounts_update" ON social_media_accounts FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "social_media_accounts_delete" ON social_media_accounts FOR DELETE TO authenticated
  USING (user_id = auth.uid());