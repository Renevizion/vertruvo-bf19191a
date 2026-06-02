-- Create workflows table to store automation workflows
CREATE TABLE public.workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  trigger_type TEXT NOT NULL,
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their workspace workflows"
  ON public.workflows FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM get_user_workspaces(auth.uid())
  ));

CREATE POLICY "Users can create workflows in their workspace"
  ON public.workflows FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM get_user_workspaces(auth.uid())
  ));

CREATE POLICY "Users can update their workspace workflows"
  ON public.workflows FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM get_user_workspaces(auth.uid())
  ));

CREATE POLICY "Users can delete their workspace workflows"
  ON public.workflows FOR DELETE
  USING (workspace_id IN (
    SELECT workspace_id FROM get_user_workspaces(auth.uid())
  ));

-- Create workflow_runs table to track execution history
CREATE TABLE public.workflow_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running',
  trigger_data JSONB,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  execution_log JSONB DEFAULT '[]'::jsonb
);

-- Enable RLS
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workflow_runs
CREATE POLICY "Users can view runs for their workspace workflows"
  ON public.workflow_runs FOR SELECT
  USING (workflow_id IN (
    SELECT id FROM public.workflows 
    WHERE workspace_id IN (
      SELECT workspace_id FROM get_user_workspaces(auth.uid())
    )
  ));

CREATE POLICY "System can create workflow runs"
  ON public.workflow_runs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update workflow runs"
  ON public.workflow_runs FOR UPDATE
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON public.workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();