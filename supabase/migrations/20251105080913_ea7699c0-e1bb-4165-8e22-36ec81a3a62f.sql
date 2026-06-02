-- Fix business_settings RLS to allow initial creation during onboarding
-- Drop the restrictive ALL policy
DROP POLICY IF EXISTS "Only admins can manage business settings" ON public.business_settings;

-- Allow authenticated users to insert (for onboarding)
CREATE POLICY "Authenticated users can insert business settings"
ON public.business_settings
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Only admins/owners can update
CREATE POLICY "Only admins can update business settings"
ON public.business_settings
FOR UPDATE
TO authenticated
USING (is_admin_or_owner(auth.uid()))
WITH CHECK (is_admin_or_owner(auth.uid()));

-- Only admins/owners can delete
CREATE POLICY "Only admins can delete business settings"
ON public.business_settings
FOR DELETE
TO authenticated
USING (is_admin_or_owner(auth.uid()));