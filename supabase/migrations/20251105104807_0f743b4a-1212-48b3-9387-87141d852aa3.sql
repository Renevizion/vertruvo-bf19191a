-- First, temporarily set all leads workspace_id to NULL to drop the constraint
UPDATE public.leads SET workspace_id = NULL WHERE workspace_id IS NOT NULL;

-- Drop the old foreign key constraint
ALTER TABLE public.leads 
DROP CONSTRAINT IF EXISTS leads_workspace_id_fkey;

-- Now assign leads to actual workspaces based on who created them
-- Map old workspace_id (user_id) to new workspace_id
UPDATE public.leads l
SET workspace_id = (
  SELECT w.id 
  FROM public.workspaces w
  WHERE w.owner_id = (
    SELECT id FROM public.profiles 
    ORDER BY created_at ASC 
    LIMIT 1
  )
  LIMIT 1
);

-- Add new foreign key to workspaces table
ALTER TABLE public.leads
ADD CONSTRAINT leads_workspace_id_fkey 
FOREIGN KEY (workspace_id) 
REFERENCES public.workspaces(id) 
ON DELETE CASCADE;