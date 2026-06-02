
-- =============================================
-- 1. FIX user_roles privilege escalation
-- =============================================

-- Drop the dangerous ALL policy (no WITH CHECK = anyone can INSERT)
DROP POLICY IF EXISTS "Only admins can manage user roles" ON public.user_roles;

-- Add explicit INSERT: only platform admins
CREATE POLICY "Only platform admins can insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.is_platform_admin(auth.uid()));

-- Add explicit DELETE: only platform admins
CREATE POLICY "Only platform admins can delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (public.is_platform_admin(auth.uid()));

-- Note: "Platform admins can update user roles" UPDATE policy already exists
-- Note: SELECT policies already exist for own roles + admin view

-- =============================================
-- 2. FIX bookings open INSERT
-- =============================================

DROP POLICY IF EXISTS "Public can create bookings" ON public.bookings;

-- Workspace members can create bookings in their own workspace
CREATE POLICY "Workspace members can create bookings"
ON public.bookings FOR INSERT TO authenticated
WITH CHECK (
  workspace_id IN (SELECT public.get_user_workspaces(auth.uid()))
);

-- Allow service_role to create bookings (for public booking edge function)
-- service_role bypasses RLS by default, so no policy needed

-- =============================================
-- 3. FIX email-assets bucket (no policies)
-- =============================================

CREATE POLICY "Platform admins can upload email assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'email-assets'
  AND public.is_platform_admin(auth.uid())
);

CREATE POLICY "Platform admins can update email assets"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'email-assets'
  AND public.is_platform_admin(auth.uid())
);

CREATE POLICY "Platform admins can delete email assets"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'email-assets'
  AND public.is_platform_admin(auth.uid())
);

-- =============================================
-- 4. FIX agent_tools publicly readable
-- =============================================

DROP POLICY IF EXISTS "Anyone can view active tools" ON public.agent_tools;

CREATE POLICY "Authenticated users can view active tools"
ON public.agent_tools FOR SELECT TO authenticated
USING (is_active = true);
