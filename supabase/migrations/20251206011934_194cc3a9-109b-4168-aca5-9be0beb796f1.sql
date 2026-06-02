-- Fix remaining RLS policies (deleted_leads policies already exist, skip those)

-- 4. Fix agent_insights - remove permissive policy
DROP POLICY IF EXISTS "Allow all operations" ON public.agent_insights;
DROP POLICY IF EXISTS "Users can manage workspace agent insights" ON public.agent_insights;

CREATE POLICY "Users can manage workspace agent insights"
ON public.agent_insights
FOR ALL
TO authenticated
USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- 5. Fix agent_settings - remove permissive policy
DROP POLICY IF EXISTS "Allow all operations" ON public.agent_settings;
DROP POLICY IF EXISTS "Users can manage workspace agent settings" ON public.agent_settings;

CREATE POLICY "Users can manage workspace agent settings"
ON public.agent_settings
FOR ALL
TO authenticated
USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- 6. Fix pipeline_stages - remove permissive policy
DROP POLICY IF EXISTS "Allow all operations" ON public.pipeline_stages;
DROP POLICY IF EXISTS "Users can manage pipeline stages" ON public.pipeline_stages;

CREATE POLICY "Users can manage pipeline stages"
ON public.pipeline_stages
FOR ALL
TO authenticated
USING (pipeline_id IN (
  SELECT id FROM pipelines WHERE workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  )
))
WITH CHECK (pipeline_id IN (
  SELECT id FROM pipelines WHERE workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  )
));

-- 7. Fix knowledge_sources - remove permissive policy
DROP POLICY IF EXISTS "Allow all operations" ON public.knowledge_sources;
DROP POLICY IF EXISTS "Users can manage knowledge sources" ON public.knowledge_sources;

CREATE POLICY "Users can manage knowledge sources"
ON public.knowledge_sources
FOR ALL
TO authenticated
USING (knowledge_base_id IN (
  SELECT id FROM knowledge_bases WHERE workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  )
))
WITH CHECK (knowledge_base_id IN (
  SELECT id FROM knowledge_bases WHERE workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  )
));

-- 8. Fix social_media_accounts if exists
DROP POLICY IF EXISTS "Allow all operations" ON public.social_media_accounts;