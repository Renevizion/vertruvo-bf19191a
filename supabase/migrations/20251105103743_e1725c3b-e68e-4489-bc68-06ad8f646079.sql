-- First, set jasonrmilord@gmail.com as the owner
UPDATE public.user_roles
SET role = 'owner'
WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'jasonrmilord@gmail.com');

-- Drop the existing overly permissive policy on profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create new restrictive policies for profiles table
-- Only admins and owners can view all profiles
CREATE POLICY "Admins and owners can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (is_admin_or_owner(auth.uid()));

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);