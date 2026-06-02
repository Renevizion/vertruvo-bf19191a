-- Fix contacts RLS policy to allow deletion
DROP POLICY IF EXISTS "Users can delete contacts in their workspace" ON public.contacts;

CREATE POLICY "Users can delete contacts in their workspace"
ON public.contacts
FOR DELETE
USING (
  workspace_id IN (
    SELECT workspace_id FROM get_user_workspaces(auth.uid())
  )
);