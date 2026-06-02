-- Add workspace_id to all tables for multi-tenant isolation
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.profiles(id);
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.profiles(id);
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.profiles(id);
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.profiles(id);
ALTER TABLE public.pipelines ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.profiles(id);
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.profiles(id);
ALTER TABLE public.knowledge_bases ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.profiles(id);

-- Update RLS policies for leads
DROP POLICY IF EXISTS "Allow all operations on leads" ON public.leads;
CREATE POLICY "Users can view their workspace leads"
  ON public.leads FOR SELECT
  USING (workspace_id = auth.uid());

CREATE POLICY "Users can insert their workspace leads"
  ON public.leads FOR INSERT
  WITH CHECK (workspace_id = auth.uid());

CREATE POLICY "Users can update their workspace leads"
  ON public.leads FOR UPDATE
  USING (workspace_id = auth.uid());

CREATE POLICY "Users can delete their workspace leads"
  ON public.leads FOR DELETE
  USING (workspace_id = auth.uid());

-- Update RLS policies for contacts
DROP POLICY IF EXISTS "Allow all operations on contacts" ON public.contacts;
CREATE POLICY "Users can view their workspace contacts"
  ON public.contacts FOR SELECT
  USING (workspace_id = auth.uid());

CREATE POLICY "Users can insert their workspace contacts"
  ON public.contacts FOR INSERT
  WITH CHECK (workspace_id = auth.uid());

CREATE POLICY "Users can update their workspace contacts"
  ON public.contacts FOR UPDATE
  USING (workspace_id = auth.uid());

CREATE POLICY "Users can delete their workspace contacts"
  ON public.contacts FOR DELETE
  USING (workspace_id = auth.uid());

-- Update RLS policies for tasks
DROP POLICY IF EXISTS "Allow all operations on tasks" ON public.tasks;
CREATE POLICY "Users can view their workspace tasks"
  ON public.tasks FOR SELECT
  USING (workspace_id = auth.uid());

CREATE POLICY "Users can insert their workspace tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (workspace_id = auth.uid());

CREATE POLICY "Users can update their workspace tasks"
  ON public.tasks FOR UPDATE
  USING (workspace_id = auth.uid());

CREATE POLICY "Users can delete their workspace tasks"
  ON public.tasks FOR DELETE
  USING (workspace_id = auth.uid());

-- Update RLS policies for activities
DROP POLICY IF EXISTS "Allow all operations on activities" ON public.activities;
CREATE POLICY "Users can view their workspace activities"
  ON public.activities FOR SELECT
  USING (workspace_id = auth.uid());

CREATE POLICY "Users can insert their workspace activities"
  ON public.activities FOR INSERT
  WITH CHECK (workspace_id = auth.uid());

-- Update RLS policies for pipelines
DROP POLICY IF EXISTS "Allow all operations on pipelines" ON public.pipelines;
CREATE POLICY "Users can view their workspace pipelines"
  ON public.pipelines FOR SELECT
  USING (workspace_id = auth.uid());

CREATE POLICY "Users can insert their workspace pipelines"
  ON public.pipelines FOR INSERT
  WITH CHECK (workspace_id = auth.uid());

CREATE POLICY "Users can update their workspace pipelines"
  ON public.pipelines FOR UPDATE
  USING (workspace_id = auth.uid());

CREATE POLICY "Users can delete their workspace pipelines"
  ON public.pipelines FOR DELETE
  USING (workspace_id = auth.uid());

-- Update RLS policies for ai_agents
DROP POLICY IF EXISTS "Allow all operations on ai_agents" ON public.ai_agents;
CREATE POLICY "Users can view their workspace ai_agents"
  ON public.ai_agents FOR SELECT
  USING (workspace_id = auth.uid());

CREATE POLICY "Users can insert their workspace ai_agents"
  ON public.ai_agents FOR INSERT
  WITH CHECK (workspace_id = auth.uid());

CREATE POLICY "Users can update their workspace ai_agents"
  ON public.ai_agents FOR UPDATE
  USING (workspace_id = auth.uid());

CREATE POLICY "Users can delete their workspace ai_agents"
  ON public.ai_agents FOR DELETE
  USING (workspace_id = auth.uid());

-- Update RLS policies for knowledge_bases
DROP POLICY IF EXISTS "Allow all operations on knowledge_bases" ON public.knowledge_bases;
CREATE POLICY "Users can view their workspace knowledge_bases"
  ON public.knowledge_bases FOR SELECT
  USING (workspace_id = auth.uid());

CREATE POLICY "Users can insert their workspace knowledge_bases"
  ON public.knowledge_bases FOR INSERT
  WITH CHECK (workspace_id = auth.uid());

CREATE POLICY "Users can update their workspace knowledge_bases"
  ON public.knowledge_bases FOR UPDATE
  USING (workspace_id = auth.uid());

CREATE POLICY "Users can delete their workspace knowledge_bases"
  ON public.knowledge_bases FOR DELETE
  USING (workspace_id = auth.uid());