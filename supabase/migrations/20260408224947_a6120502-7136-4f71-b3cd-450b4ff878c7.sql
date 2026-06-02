
-- =============================================
-- 1. FIX webhook_configs: restrict secret column
-- =============================================

-- Drop the broad ALL policy that gives all workspace members full access including secrets
DROP POLICY IF EXISTS "Users can manage their workspace webhooks" ON public.webhook_configs;

-- The remaining policies are:
-- "Platform admins can manage all webhooks" (ALL) - admins/owners by role
-- "Users can manage own workspace webhooks" (ALL) - workspace owner only  
-- "Workspace owners can manage webhook configs" (ALL) - workspace owner only
-- "Users can view own workspace webhooks" (SELECT) - workspace owner only

-- Add SELECT for workspace members (non-owners) — they can see configs but not secrets
-- Since RLS can't do column-level filtering, we create a security definer function
CREATE OR REPLACE FUNCTION public.get_workspace_webhooks(_workspace_id uuid)
RETURNS TABLE(
  id uuid,
  workspace_id uuid,
  name text,
  url text,
  events text[],
  is_active boolean,
  retry_config jsonb,
  headers jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  integration_id text,
  is_verified boolean,
  last_tested_at timestamptz,
  test_result jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT wc.id, wc.workspace_id, wc.name, wc.url, wc.events, wc.is_active,
         wc.retry_config, wc.headers, wc.created_at, wc.updated_at,
         wc.integration_id, wc.is_verified, wc.last_tested_at, wc.test_result
  FROM public.webhook_configs wc
  WHERE wc.workspace_id = _workspace_id
    AND public.is_workspace_member(_workspace_id, auth.uid())
$$;

-- =============================================
-- 2. FIX email tables: add platform admin SELECT
-- =============================================

-- email_send_log: platform admins can read
CREATE POLICY "Platform admins can read send log"
ON public.email_send_log FOR SELECT TO authenticated
USING (public.is_platform_admin(auth.uid()));

-- suppressed_emails: platform admins can read
CREATE POLICY "Platform admins can read suppressed emails"
ON public.suppressed_emails FOR SELECT TO authenticated
USING (public.is_platform_admin(auth.uid()));

-- email_unsubscribe_tokens: platform admins can read
CREATE POLICY "Platform admins can read unsubscribe tokens"
ON public.email_unsubscribe_tokens FOR SELECT TO authenticated
USING (public.is_platform_admin(auth.uid()));

-- =============================================
-- 3. HARDEN OAuth token tables
-- =============================================

-- social_media_accounts: already has user_id = auth.uid() on all ops ✓
-- google_sheet_integrations: already has user_id = auth.uid() on all ops ✓
-- For defense-in-depth, add a comment noting encryption should be considered
COMMENT ON COLUMN public.social_media_accounts.access_token IS 'OAuth access token — consider Vault encryption for defense-in-depth';
COMMENT ON COLUMN public.social_media_accounts.refresh_token IS 'OAuth refresh token — consider Vault encryption for defense-in-depth';
COMMENT ON COLUMN public.google_sheet_integrations.google_access_token IS 'Google OAuth access token — consider Vault encryption for defense-in-depth';
COMMENT ON COLUMN public.google_sheet_integrations.google_refresh_token IS 'Google OAuth refresh token — consider Vault encryption for defense-in-depth';
