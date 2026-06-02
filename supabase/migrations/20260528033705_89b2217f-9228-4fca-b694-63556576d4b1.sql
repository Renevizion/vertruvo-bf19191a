
-- Tighten form_metrics anon insert to active forms only
DROP POLICY IF EXISTS "Anyone can insert metrics for real forms" ON public.form_metrics;
CREATE POLICY "Anyone can insert metrics for active forms"
ON public.form_metrics
FOR INSERT
TO public
WITH CHECK (form_id IN (SELECT id FROM public.forms WHERE is_active = true));

-- Scope anonymous lead inserts to workspaces that have configured business settings (i.e., real public booking pages)
DROP POLICY IF EXISTS "Public can create leads from booking" ON public.leads;
CREATE POLICY "Public can create leads from booking"
ON public.leads
FOR INSERT
TO anon
WITH CHECK (
  source = 'booking_page'
  AND workspace_id IS NOT NULL
  AND workspace_id IN (SELECT workspace_id FROM public.business_settings)
);

-- Restrict shell_telemetry inserts to authenticated members of the workspace; require non-null workspace_id
DROP POLICY IF EXISTS "Members insert workspace telemetry" ON public.shell_telemetry;
CREATE POLICY "Members insert workspace telemetry"
ON public.shell_telemetry
FOR INSERT
TO authenticated
WITH CHECK (
  workspace_id IS NOT NULL
  AND public.is_workspace_member(workspace_id, auth.uid())
);

-- license_acceptances: hide ip_address and user_agent from clients; only service_role can read them
REVOKE SELECT (ip_address, user_agent) ON public.license_acceptances FROM authenticated, anon;

-- subscriptions: collapse to owner-only SELECT, hide stripe identifiers from client roles
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view own workspace subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view their workspace subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Workspace owners can view subscriptions" ON public.subscriptions;

CREATE POLICY "Workspace owners can view subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "Workspace owners can manage subscriptions"
ON public.subscriptions
FOR ALL
TO authenticated
USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()))
WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()));

REVOKE SELECT (stripe_customer_id, stripe_subscription_id) ON public.subscriptions FROM authenticated, anon;

-- workspaces: hide stripe_connect_account_id from non-service-role principals (including platform admins via Data API)
REVOKE SELECT (stripe_connect_account_id) ON public.workspaces FROM authenticated, anon;
