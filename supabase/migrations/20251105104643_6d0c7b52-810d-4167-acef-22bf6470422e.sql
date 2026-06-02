-- Fix infinite recursion by creating security definer functions
-- Drop the recursive policies
DROP POLICY IF EXISTS "Users can view members in their workspaces" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners can manage members" ON public.workspace_members;

-- Create security definer function to check workspace membership
CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_id = _workspace_id AND user_id = _user_id
  )
$$;

-- Create security definer function to check workspace ownership
CREATE OR REPLACE FUNCTION public.is_workspace_owner(_workspace_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspaces
    WHERE id = _workspace_id AND owner_id = _user_id
  )
$$;

-- Create security definer function to get user's workspaces
CREATE OR REPLACE FUNCTION public.get_user_workspaces(_user_id uuid)
RETURNS TABLE(workspace_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id
  FROM public.workspace_members
  WHERE user_id = _user_id
  UNION
  SELECT id
  FROM public.workspaces
  WHERE owner_id = _user_id
$$;

-- New non-recursive policies for workspace_members
CREATE POLICY "Users can view workspace members"
ON public.workspace_members
FOR SELECT
TO authenticated
USING (
  workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid()))
);

CREATE POLICY "Workspace owners can manage workspace members"
ON public.workspace_members
FOR ALL
TO authenticated
USING (
  is_workspace_owner(workspace_id, auth.uid())
)
WITH CHECK (
  is_workspace_owner(workspace_id, auth.uid())
);

-- Update profiles policy to use security definer function
DROP POLICY IF EXISTS "Users can view profiles in their workspace" ON public.profiles;

CREATE POLICY "Users can view workspace profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid() OR
  id IN (
    SELECT user_id 
    FROM public.workspace_members
    WHERE workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid()))
  )
);