-- =============================================
-- FIX REMAINING TABLES WITH CORRECT COLUMN REFERENCES
-- =============================================

-- 5. agent_settings - Has workspace_id, fix policies
DROP POLICY IF EXISTS "Allow all operations" ON public.agent_settings;
DROP POLICY IF EXISTS "as_select_ws" ON public.agent_settings;
DROP POLICY IF EXISTS "as_insert_ws" ON public.agent_settings;
DROP POLICY IF EXISTS "as_update_ws" ON public.agent_settings;
DROP POLICY IF EXISTS "as_select_auth" ON public.agent_settings;
DROP POLICY IF EXISTS "as_insert_auth" ON public.agent_settings;
DROP POLICY IF EXISTS "as_update_auth" ON public.agent_settings;

CREATE POLICY "agent_settings_select" ON public.agent_settings FOR SELECT TO authenticated 
USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "agent_settings_insert" ON public.agent_settings FOR INSERT TO authenticated 
WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "agent_settings_update" ON public.agent_settings FOR UPDATE TO authenticated 
USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()));

-- 6. knowledge_sources - Fix policies
DROP POLICY IF EXISTS "Allow all operations" ON public.knowledge_sources;
DROP POLICY IF EXISTS "ks_select_ws" ON public.knowledge_sources;
DROP POLICY IF EXISTS "ks_insert_ws" ON public.knowledge_sources;
DROP POLICY IF EXISTS "ks_update_ws" ON public.knowledge_sources;
DROP POLICY IF EXISTS "ks_delete_ws" ON public.knowledge_sources;
DROP POLICY IF EXISTS "ks_select_auth" ON public.knowledge_sources;
DROP POLICY IF EXISTS "ks_insert_auth" ON public.knowledge_sources;
DROP POLICY IF EXISTS "ks_update_auth" ON public.knowledge_sources;
DROP POLICY IF EXISTS "ks_delete_auth" ON public.knowledge_sources;

CREATE POLICY "knowledge_sources_select" ON public.knowledge_sources FOR SELECT TO authenticated 
USING (knowledge_base_id IN (SELECT id FROM public.knowledge_bases WHERE workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())));
CREATE POLICY "knowledge_sources_insert" ON public.knowledge_sources FOR INSERT TO authenticated 
WITH CHECK (knowledge_base_id IN (SELECT id FROM public.knowledge_bases WHERE workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())));
CREATE POLICY "knowledge_sources_update" ON public.knowledge_sources FOR UPDATE TO authenticated 
USING (knowledge_base_id IN (SELECT id FROM public.knowledge_bases WHERE workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())));
CREATE POLICY "knowledge_sources_delete" ON public.knowledge_sources FOR DELETE TO authenticated 
USING (knowledge_base_id IN (SELECT id FROM public.knowledge_bases WHERE workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())));

-- 7. pipeline_stages - Fix policies
DROP POLICY IF EXISTS "Allow all operations" ON public.pipeline_stages;
DROP POLICY IF EXISTS "ps_select_ws" ON public.pipeline_stages;
DROP POLICY IF EXISTS "ps_insert_ws" ON public.pipeline_stages;
DROP POLICY IF EXISTS "ps_update_ws" ON public.pipeline_stages;
DROP POLICY IF EXISTS "ps_delete_ws" ON public.pipeline_stages;
DROP POLICY IF EXISTS "ps_select_auth" ON public.pipeline_stages;
DROP POLICY IF EXISTS "ps_insert_auth" ON public.pipeline_stages;
DROP POLICY IF EXISTS "ps_update_auth" ON public.pipeline_stages;
DROP POLICY IF EXISTS "ps_delete_auth" ON public.pipeline_stages;

CREATE POLICY "pipeline_stages_select" ON public.pipeline_stages FOR SELECT TO authenticated 
USING (pipeline_id IN (SELECT id FROM public.pipelines WHERE workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())));
CREATE POLICY "pipeline_stages_insert" ON public.pipeline_stages FOR INSERT TO authenticated 
WITH CHECK (pipeline_id IN (SELECT id FROM public.pipelines WHERE workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())));
CREATE POLICY "pipeline_stages_update" ON public.pipeline_stages FOR UPDATE TO authenticated 
USING (pipeline_id IN (SELECT id FROM public.pipelines WHERE workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())));
CREATE POLICY "pipeline_stages_delete" ON public.pipeline_stages FOR DELETE TO authenticated 
USING (pipeline_id IN (SELECT id FROM public.pipelines WHERE workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())));

-- 8. social_media_accounts - Uses user_id NOT workspace_id
DROP POLICY IF EXISTS "Allow all operations" ON public.social_media_accounts;
DROP POLICY IF EXISTS "sma_select_ws" ON public.social_media_accounts;
DROP POLICY IF EXISTS "sma_insert_ws" ON public.social_media_accounts;
DROP POLICY IF EXISTS "sma_update_ws" ON public.social_media_accounts;
DROP POLICY IF EXISTS "sma_delete_ws" ON public.social_media_accounts;
DROP POLICY IF EXISTS "sma_select_auth" ON public.social_media_accounts;
DROP POLICY IF EXISTS "sma_insert_auth" ON public.social_media_accounts;
DROP POLICY IF EXISTS "sma_update_auth" ON public.social_media_accounts;
DROP POLICY IF EXISTS "sma_delete_auth" ON public.social_media_accounts;

CREATE POLICY "social_media_select" ON public.social_media_accounts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "social_media_insert" ON public.social_media_accounts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "social_media_update" ON public.social_media_accounts FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "social_media_delete" ON public.social_media_accounts FOR DELETE TO authenticated USING (user_id = auth.uid());