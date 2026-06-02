-- Create a function to check if user is platform admin (owner or admin role)
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('owner', 'admin')
  )
$$;

-- Update profiles RLS to allow platform admins to read all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Platform admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = id 
  OR public.is_platform_admin(auth.uid())
);

-- Update user_roles RLS to allow platform admins to read all roles
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
CREATE POLICY "Platform admins can view all user roles" 
ON public.user_roles 
FOR SELECT 
USING (
  user_id = auth.uid() 
  OR public.is_platform_admin(auth.uid())
);

-- Allow platform admins to update roles
DROP POLICY IF EXISTS "Admins can update user roles" ON public.user_roles;
CREATE POLICY "Platform admins can update user roles"
ON public.user_roles
FOR UPDATE
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));