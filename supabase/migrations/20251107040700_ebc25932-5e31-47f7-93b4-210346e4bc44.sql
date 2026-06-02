-- Create call templates table for dynamic call scripts
CREATE TABLE public.call_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create call logs table
CREATE TABLE public.call_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  template_id UUID REFERENCES public.call_templates(id) ON DELETE SET NULL,
  call_sid TEXT,
  status TEXT NOT NULL DEFAULT 'initiated',
  duration INTEGER,
  recording_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create form submissions tracking
CREATE TABLE public.form_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID REFERENCES public.forms(id) ON DELETE CASCADE NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  converted BOOLEAN DEFAULT false,
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT
);

-- Update existing twilio_phone_numbers table to add workspace_id if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'twilio_phone_numbers' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE public.twilio_phone_numbers ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.call_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies for call_templates
CREATE POLICY "Users can view their workspace call templates"
  ON public.call_templates FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM get_user_workspaces(auth.uid())));

CREATE POLICY "Users can create call templates in their workspace"
  ON public.call_templates FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM get_user_workspaces(auth.uid())));

CREATE POLICY "Users can update their workspace call templates"
  ON public.call_templates FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM get_user_workspaces(auth.uid())));

CREATE POLICY "Users can delete their workspace call templates"
  ON public.call_templates FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM get_user_workspaces(auth.uid())));

-- RLS policies for call_logs
CREATE POLICY "Users can view their workspace call logs"
  ON public.call_logs FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM get_user_workspaces(auth.uid())));

CREATE POLICY "Users can create call logs in their workspace"
  ON public.call_logs FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM get_user_workspaces(auth.uid())));

-- Update RLS policies for twilio_phone_numbers
DROP POLICY IF EXISTS "Allow all operations on twilio_phone_numbers" ON public.twilio_phone_numbers;

CREATE POLICY "Users can view their workspace phone numbers"
  ON public.twilio_phone_numbers FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM get_user_workspaces(auth.uid())));

CREATE POLICY "Users can create phone numbers in their workspace"
  ON public.twilio_phone_numbers FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM get_user_workspaces(auth.uid())));

CREATE POLICY "Users can update their workspace phone numbers"
  ON public.twilio_phone_numbers FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM get_user_workspaces(auth.uid())));

CREATE POLICY "Users can delete their workspace phone numbers"
  ON public.twilio_phone_numbers FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM get_user_workspaces(auth.uid())));

-- RLS policies for form_metrics
CREATE POLICY "Anyone can insert form metrics"
  ON public.form_metrics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view metrics for their workspace forms"
  ON public.form_metrics FOR SELECT
  USING (form_id IN (
    SELECT id FROM public.forms 
    WHERE workspace_id IN (SELECT workspace_id FROM get_user_workspaces(auth.uid()))
  ));

-- Create indexes for performance
CREATE INDEX idx_call_logs_workspace ON public.call_logs(workspace_id);
CREATE INDEX idx_call_logs_lead ON public.call_logs(lead_id);
CREATE INDEX idx_call_templates_workspace ON public.call_templates(workspace_id);
CREATE INDEX idx_form_metrics_form ON public.form_metrics(form_id);
CREATE INDEX idx_form_metrics_submitted ON public.form_metrics(submitted_at);