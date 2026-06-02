-- Update all remaining table RLS policies to be workspace-aware

-- Contacts
DROP POLICY IF EXISTS "Users can view their workspace contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can insert their workspace contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can update their workspace contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can delete their workspace contacts" ON public.contacts;

CREATE POLICY "Users can view contacts in their workspace"
ON public.contacts FOR SELECT TO authenticated
USING (workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid())));

CREATE POLICY "Users can create contacts in their workspace"
ON public.contacts FOR INSERT TO authenticated
WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid())));

CREATE POLICY "Users can update contacts in their workspace"
ON public.contacts FOR UPDATE TO authenticated
USING (workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid())));

CREATE POLICY "Users can delete contacts in their workspace"
ON public.contacts FOR DELETE TO authenticated
USING (workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid())));

-- Tasks
DROP POLICY IF EXISTS "Users can view their workspace tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert their workspace tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their workspace tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their workspace tasks" ON public.tasks;

CREATE POLICY "Users can view tasks in their workspace"
ON public.tasks FOR SELECT TO authenticated
USING (workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid())));

CREATE POLICY "Users can create tasks in their workspace"
ON public.tasks FOR INSERT TO authenticated
WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid())));

CREATE POLICY "Users can update tasks in their workspace"
ON public.tasks FOR UPDATE TO authenticated
USING (workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid())));

CREATE POLICY "Users can delete tasks in their workspace"
ON public.tasks FOR DELETE TO authenticated
USING (workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid())));

-- Pipelines
DROP POLICY IF EXISTS "Users can view their workspace pipelines" ON public.pipelines;
DROP POLICY IF EXISTS "Users can insert their workspace pipelines" ON public.pipelines;
DROP POLICY IF EXISTS "Users can update their workspace pipelines" ON public.pipelines;
DROP POLICY IF EXISTS "Users can delete their workspace pipelines" ON public.pipelines;

CREATE POLICY "Users can view pipelines in their workspace"
ON public.pipelines FOR SELECT TO authenticated
USING (workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid())));

CREATE POLICY "Users can create pipelines in their workspace"
ON public.pipelines FOR INSERT TO authenticated
WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid())));

CREATE POLICY "Users can update pipelines in their workspace"
ON public.pipelines FOR UPDATE TO authenticated
USING (workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid())));

CREATE POLICY "Users can delete pipelines in their workspace"
ON public.pipelines FOR DELETE TO authenticated
USING (workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid())));