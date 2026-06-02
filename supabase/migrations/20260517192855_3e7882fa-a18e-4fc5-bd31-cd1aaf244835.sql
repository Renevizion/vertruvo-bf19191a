-- =========================================================================
-- Security hardening: lock down sensitive columns, fix privilege escalation,
-- close anonymous metric pollution, and revoke unsafe function execute grants.
-- =========================================================================

-- 1) Webhook signing secrets: hide `secret` from client API by revoking
--    column-level SELECT for authenticated/anon. Service role keeps access.
REVOKE SELECT (secret) ON public.webhook_configs FROM authenticated, anon;

-- 2) Stripe payment data on leads: prevent client-side reads of vault IDs.
REVOKE SELECT (stripe_customer_id, stripe_payment_method_id, card_last_four, card_brand)
  ON public.leads FROM authenticated, anon;

-- 3) Google Sheets OAuth tokens: never readable by client API.
REVOKE SELECT (google_access_token, google_refresh_token)
  ON public.google_sheet_integrations FROM authenticated, anon;

-- 4) Social media OAuth tokens: never readable by client API.
REVOKE SELECT (access_token, refresh_token)
  ON public.social_media_accounts FROM authenticated, anon;

-- 5) Privilege escalation: only true platform admins (not workspace owners)
--    may mutate user_roles. The guard_admin_role trigger already restricts
--    the actual admin user id; this prevents owner-role accounts from
--    inserting other rows in user_roles.
DROP POLICY IF EXISTS "Only platform admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only platform admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only platform admins can delete roles" ON public.user_roles;

CREATE POLICY "Only admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Only admins can update roles"
  ON public.user_roles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Only admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 6) Email unsubscribe tokens: service-role only. Drop admin SELECT.
DROP POLICY IF EXISTS "Platform admins can read unsubscribe tokens"
  ON public.email_unsubscribe_tokens;

-- 7) Suppressed emails: service-role only. Drop admin SELECT.
DROP POLICY IF EXISTS "Platform admins can read suppressed emails"
  ON public.suppressed_emails;

-- 8) Form metrics: require the form_id to actually exist before allowing
--    anonymous inserts. Prevents arbitrary spam rows with fake form_ids.
DROP POLICY IF EXISTS "Anyone can insert form metrics" ON public.form_metrics;
CREATE POLICY "Anyone can insert metrics for real forms"
  ON public.form_metrics FOR INSERT
  WITH CHECK (form_id IN (SELECT id FROM public.forms));

-- 9) Agent tools admin policy: stop relying on app.admin_emails GUC.
DROP POLICY IF EXISTS "Admins can manage tools" ON public.agent_tools;
CREATE POLICY "Admins can manage tools"
  ON public.agent_tools FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 10) Revoke EXECUTE on internal SECURITY DEFINER functions that should never
--     be callable from the client API. Trigger functions and helpers used by
--     RLS policies remain executable as needed by the RLS engine.
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_deleted_leads() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_audit_event(uuid, text, text, text, jsonb, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.track_workflow_execution(uuid, text, integer, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_sandbox_usage(uuid, text, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_admin_role() FROM anon, authenticated;