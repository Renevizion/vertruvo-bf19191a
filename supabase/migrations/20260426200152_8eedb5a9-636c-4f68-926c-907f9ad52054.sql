
-- 1. opportunity_settings: remove permissive authenticated read policy
DROP POLICY IF EXISTS "Authenticated users can view opportunity settings" ON public.opportunity_settings;

-- The existing "Only admins can manage opportunity settings" policy (FOR ALL) already covers SELECT for admins.
-- Add an explicit admin-only SELECT for clarity.
CREATE POLICY "Admins can view opportunity settings"
  ON public.opportunity_settings
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_owner(auth.uid()));

-- 2. user_roles: tighten role scope on UPDATE policy from {public} to {authenticated}
DROP POLICY IF EXISTS "Platform admins can update user roles" ON public.user_roles;
CREATE POLICY "Platform admins can update user roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- Tighten the SELECT policy too (was {public})
DROP POLICY IF EXISTS "Platform admins can view all user roles" ON public.user_roles;
CREATE POLICY "Platform admins can view all user roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING ((user_id = auth.uid()) OR public.is_platform_admin(auth.uid()));
