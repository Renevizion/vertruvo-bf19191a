-- Create workspaces table for proper multi-tenancy
CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on workspaces
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Add workspace_member junction table
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- Enable RLS on workspace_members
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Policies for workspaces
CREATE POLICY "Users can view their workspaces"
ON public.workspaces
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_id = workspaces.id AND user_id = auth.uid()
  )
);

CREATE POLICY "Owners can update their workspaces"
ON public.workspaces
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create workspaces"
ON public.workspaces
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- Policies for workspace_members
CREATE POLICY "Users can view members in their workspaces"
ON public.workspace_members
FOR SELECT
TO authenticated
USING (
  workspace_id IN (
    SELECT id FROM public.workspaces 
    WHERE owner_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = workspaces.id AND user_id = auth.uid())
  )
);

CREATE POLICY "Workspace owners can manage members"
ON public.workspace_members
FOR ALL
TO authenticated
USING (
  workspace_id IN (
    SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  workspace_id IN (
    SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
  )
);

-- Update profiles policies to be workspace-aware
DROP POLICY IF EXISTS "Admins and owners can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view profiles in their workspace"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Users can see their own profile
  id = auth.uid() OR
  -- Users can see profiles of people in their workspaces
  id IN (
    SELECT wm.user_id 
    FROM public.workspace_members wm
    WHERE wm.workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  ) OR
  -- Workspace owners can see all members in their workspaces
  id IN (
    SELECT wm.user_id 
    FROM public.workspace_members wm
    INNER JOIN public.workspaces w ON w.id = wm.workspace_id
    WHERE w.owner_id = auth.uid()
  )
);

-- Function to auto-create workspace on first login
CREATE OR REPLACE FUNCTION public.ensure_user_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create a default workspace for the user if they don't have one
  IF NOT EXISTS (
    SELECT 1 FROM public.workspaces WHERE owner_id = NEW.id
  ) THEN
    INSERT INTO public.workspaces (owner_id, name)
    VALUES (NEW.id, COALESCE(NEW.business_name, NEW.first_name || '''s Workspace', 'My Workspace'));
    
    -- Add user as owner in workspace_members
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    SELECT id, NEW.id, 'owner'
    FROM public.workspaces
    WHERE owner_id = NEW.id
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to create workspace on profile creation
DROP TRIGGER IF EXISTS on_profile_created_create_workspace ON public.profiles;
CREATE TRIGGER on_profile_created_create_workspace
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_user_workspace();

-- Backfill: Create workspaces for existing users
INSERT INTO public.workspaces (owner_id, name)
SELECT id, COALESCE(business_name, first_name || '''s Workspace', 'My Workspace')
FROM public.profiles
WHERE id NOT IN (SELECT owner_id FROM public.workspaces)
ON CONFLICT DO NOTHING;

-- Backfill: Add existing users as owners of their workspaces
INSERT INTO public.workspace_members (workspace_id, user_id, role)
SELECT w.id, w.owner_id, 'owner'
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.workspace_members 
  WHERE workspace_id = w.id AND user_id = w.owner_id
)
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- Make the first user the super admin
UPDATE public.user_roles
SET role = 'owner'
WHERE user_id = (SELECT id FROM public.profiles ORDER BY created_at ASC LIMIT 1);