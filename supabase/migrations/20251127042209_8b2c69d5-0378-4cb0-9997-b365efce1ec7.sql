-- Fix business_settings RLS policies for workspace owners
DROP POLICY IF EXISTS "Users can view their workspace business settings" ON business_settings;
DROP POLICY IF EXISTS "Users can update their workspace business settings" ON business_settings;
DROP POLICY IF EXISTS "Users can insert their workspace business settings" ON business_settings;

CREATE POLICY "Workspace owners can view business settings"
ON business_settings FOR SELECT
USING (workspace_id IN (
  SELECT id FROM workspaces WHERE owner_id = auth.uid()
));

CREATE POLICY "Workspace owners can insert business settings"
ON business_settings FOR INSERT
WITH CHECK (workspace_id IN (
  SELECT id FROM workspaces WHERE owner_id = auth.uid()
));

CREATE POLICY "Workspace owners can update business settings"
ON business_settings FOR UPDATE
USING (workspace_id IN (
  SELECT id FROM workspaces WHERE owner_id = auth.uid()
));

-- Fix platform_api_configs RLS policies for admins
DROP POLICY IF EXISTS "Platform admins can manage API configs" ON platform_api_configs;

CREATE POLICY "Platform admins can view API configs"
ON platform_api_configs FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Platform admins can insert API configs"
ON platform_api_configs FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Platform admins can update API configs"
ON platform_api_configs FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Platform admins can delete API configs"
ON platform_api_configs FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));