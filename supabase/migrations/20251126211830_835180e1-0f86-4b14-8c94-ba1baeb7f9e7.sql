-- Add workspace_id to tasks table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE public.tasks ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id);
    CREATE INDEX idx_tasks_workspace_id ON public.tasks(workspace_id);
  END IF;
END $$;

-- Update RLS policies for tasks to use workspace_id
DROP POLICY IF EXISTS "Users can view workspace tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create workspace tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update workspace tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete workspace tasks" ON public.tasks;

CREATE POLICY "Users can view workspace tasks"
  ON public.tasks FOR SELECT
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "Users can create workspace tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "Users can update workspace tasks"
  ON public.tasks FOR UPDATE
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "Users can delete workspace tasks"
  ON public.tasks FOR DELETE
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));