-- Update leads RLS policies to be workspace-aware
DROP POLICY IF EXISTS "Users can view their workspace leads" ON public.leads;
DROP POLICY IF EXISTS "Users can insert their workspace leads" ON public.leads;
DROP POLICY IF EXISTS "Users can update their workspace leads" ON public.leads;
DROP POLICY IF EXISTS "Users can delete their workspace leads" ON public.leads;

-- New workspace-aware policies
CREATE POLICY "Users can view leads in their workspace"
ON public.leads
FOR SELECT
TO authenticated
USING (
  workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid()))
);

CREATE POLICY "Users can create leads in their workspace"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (
  workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid()))
);

CREATE POLICY "Users can update leads in their workspace"
ON public.leads
FOR UPDATE
TO authenticated
USING (
  workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid()))
);

CREATE POLICY "Users can delete leads in their workspace"
ON public.leads
FOR DELETE
TO authenticated
USING (
  workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid()))
);