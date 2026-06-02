-- Create forms table
CREATE TABLE public.forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  pipeline_id UUID,
  stage_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create form_submissions table for audit trail
CREATE TABLE public.form_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  lead_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- Forms policies
CREATE POLICY "Users can view their workspace forms"
  ON public.forms FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM get_user_workspaces(auth.uid())
  ));

CREATE POLICY "Users can create forms in their workspace"
  ON public.forms FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM get_user_workspaces(auth.uid())
  ));

CREATE POLICY "Users can update their workspace forms"
  ON public.forms FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM get_user_workspaces(auth.uid())
  ));

CREATE POLICY "Users can delete their workspace forms"
  ON public.forms FOR DELETE
  USING (workspace_id IN (
    SELECT workspace_id FROM get_user_workspaces(auth.uid())
  ));

-- Form submissions policies
CREATE POLICY "Users can view submissions for their workspace forms"
  ON public.form_submissions FOR SELECT
  USING (form_id IN (
    SELECT id FROM public.forms
    WHERE workspace_id IN (
      SELECT workspace_id FROM get_user_workspaces(auth.uid())
    )
  ));

-- Public policy for inserting submissions (needed for public form endpoint)
CREATE POLICY "Anyone can submit forms"
  ON public.form_submissions FOR INSERT
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_forms_updated_at
  BEFORE UPDATE ON public.forms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();