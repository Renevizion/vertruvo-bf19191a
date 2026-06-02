
-- =====================================================================
-- 1. WORKSPACE_MEMBERS: Remove privilege escalation loophole
-- =====================================================================
DROP POLICY IF EXISTS "Only workspace owners can add members" ON public.workspace_members;

CREATE POLICY "Only workspace owners can add members"
  ON public.workspace_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE workspaces.id = workspace_members.workspace_id
        AND workspaces.owner_id = auth.uid()
    )
  );

-- =====================================================================
-- 2. LEADS: Restrict payment fields to workspace owners only
-- =====================================================================
-- Create a safe view that excludes payment identifiers for general use.
CREATE OR REPLACE VIEW public.leads_safe
WITH (security_invoker=on) AS
SELECT
  id, name, email, phone, source, value, notes, stage_id,
  created_at, updated_at, company, pipeline_id, workspace_id,
  score, score_factors, enrichment_data, last_scored_at,
  attribution_source, attribution_id, contact_type,
  customer_user_id, last_contacted_at,
  -- masked indicators (boolean only) so UI can show "card on file: yes/no"
  (stripe_payment_method_id IS NOT NULL) AS has_payment_method,
  CASE
    WHEN public.is_workspace_owner(workspace_id, auth.uid())
      THEN card_last_four
    ELSE NULL
  END AS card_last_four_visible,
  CASE
    WHEN public.is_workspace_owner(workspace_id, auth.uid())
      THEN card_brand
    ELSE NULL
  END AS card_brand_visible
FROM public.leads;

GRANT SELECT ON public.leads_safe TO authenticated, anon;

-- Tighten the leads SELECT policy: members see leads but the underlying
-- policy already restricts to workspace owners. Add a column-level
-- protection via revoking column access from authenticated role.
REVOKE SELECT (stripe_customer_id, stripe_payment_method_id, card_last_four, card_brand)
  ON public.leads FROM authenticated, anon;

-- Owners can still read everything via direct grant
GRANT SELECT (stripe_customer_id, stripe_payment_method_id, card_last_four, card_brand)
  ON public.leads TO authenticated;

-- Replace the leads_select policy with one that blocks non-owners from
-- selecting payment columns by enforcing column-level via a stricter policy.
-- (Postgres column privileges + RLS work together; the grant above is
-- intentional fallback for owner-only access pattern enforced at app layer.)

-- Use a stricter approach: revoke column access from authenticated AND
-- create an owner-only view for payment data.
REVOKE SELECT (stripe_customer_id, stripe_payment_method_id, card_last_four, card_brand)
  ON public.leads FROM authenticated;

CREATE OR REPLACE VIEW public.lead_payment_methods
WITH (security_invoker=on) AS
SELECT
  id AS lead_id,
  workspace_id,
  stripe_customer_id,
  stripe_payment_method_id,
  card_last_four,
  card_brand
FROM public.leads
WHERE public.is_workspace_owner(workspace_id, auth.uid());

GRANT SELECT ON public.lead_payment_methods TO authenticated;

-- =====================================================================
-- 3. WEBHOOK_CONFIGS: Hide signing secret from clients
-- =====================================================================
REVOKE SELECT (secret) ON public.webhook_configs FROM authenticated, anon, public;
-- Service role still has access (it bypasses column ACLs as superuser).

-- =====================================================================
-- 4. INBOUND_EMAILS: Hide reply_token from clients
-- =====================================================================
REVOKE SELECT (reply_token) ON public.inbound_emails FROM authenticated, anon, public;

-- =====================================================================
-- 5. GOOGLE_SHEET_INTEGRATIONS: Hide OAuth tokens from clients
-- =====================================================================
REVOKE SELECT (google_access_token, google_refresh_token, token_expires_at)
  ON public.google_sheet_integrations FROM authenticated, anon, public;

-- Safe view for client use (status only, no tokens)
CREATE OR REPLACE VIEW public.google_sheet_integrations_safe
WITH (security_invoker=on) AS
SELECT
  id, user_id, sheet_id, sheet_tab, column_mappings,
  is_active, last_synced_at, sync_frequency,
  created_at, updated_at,
  (google_refresh_token IS NOT NULL) AS is_connected
FROM public.google_sheet_integrations;

GRANT SELECT ON public.google_sheet_integrations_safe TO authenticated;

-- =====================================================================
-- 6. OPPORTUNITY_SETTINGS: Scope to user's workspaces
-- =====================================================================
DROP POLICY IF EXISTS "Authenticated users can view opportunity settings" ON public.opportunity_settings;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='opportunity_settings' AND column_name='workspace_id'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Users view opportunity settings in their workspaces"
        ON public.opportunity_settings
        FOR SELECT
        TO authenticated
        USING (workspace_id IN (SELECT public.get_user_workspaces(auth.uid())))
    $p$;
  ELSE
    EXECUTE $p$
      CREATE POLICY "Authenticated users can view opportunity settings"
        ON public.opportunity_settings
        FOR SELECT
        TO authenticated
        USING (auth.uid() IS NOT NULL)
    $p$;
  END IF;
END $$;

-- =====================================================================
-- 7. PERMISSIONS: Restrict to platform admins
-- =====================================================================
DROP POLICY IF EXISTS "Authenticated users can view permissions" ON public.permissions;

CREATE POLICY "Platform admins can view permissions"
  ON public.permissions
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));
