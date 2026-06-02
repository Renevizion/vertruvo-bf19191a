-- PHASE 1: Drop all dangerous "Allow all operations" policies
DROP POLICY IF EXISTS "Allow all operations on google_sheet_integrations" ON google_sheet_integrations;
DROP POLICY IF EXISTS "Allow all operations on deleted_leads" ON deleted_leads;
DROP POLICY IF EXISTS "Allow all operations on agent_insights" ON agent_insights;
DROP POLICY IF EXISTS "Allow all operations on agent_settings" ON agent_settings;
DROP POLICY IF EXISTS "Allow all operations on knowledge_sources" ON knowledge_sources;
DROP POLICY IF EXISTS "Allow all operations on pipeline_stages" ON pipeline_stages;

-- PHASE 2: Fix user_roles - users can only view their own roles
DROP POLICY IF EXISTS "Anyone can view user roles" ON user_roles;
CREATE POLICY "Users can view own roles" ON user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- PHASE 3: Fix platform_config - admin/owner only
DROP POLICY IF EXISTS "Anyone can view platform config" ON platform_config;
CREATE POLICY "Admins can view platform config" ON platform_config
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

-- PHASE 4: Fix permissions - authenticated users only
DROP POLICY IF EXISTS "Anyone can view permissions" ON permissions;
CREATE POLICY "Authenticated users can view permissions" ON permissions
  FOR SELECT TO authenticated
  USING (true);

-- PHASE 5: Fix profiles - remove over-permissive workspace viewing
DROP POLICY IF EXISTS "Users can view workspace profiles" ON profiles;