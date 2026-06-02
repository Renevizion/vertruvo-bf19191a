-- Add only missing RLS policies for workspace-scoped team collaboration data

-- Workspace members table RLS (users can view members in their workspace)
DROP POLICY IF EXISTS "Users can view workspace members" ON public.workspace_members;
CREATE POLICY "Users can view workspace members"
ON public.workspace_members FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);