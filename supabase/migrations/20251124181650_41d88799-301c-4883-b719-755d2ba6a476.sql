-- Create custom_fields table for storing field definitions
CREATE TABLE IF NOT EXISTS public.custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  object_type TEXT NOT NULL, -- 'lead', 'contact', 'opportunity', etc.
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL, -- 'text', 'number', 'date', 'select', 'multiselect', 'checkbox'
  options JSONB, -- For select/multiselect field types
  is_required BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create custom_field_values table for storing actual values
CREATE TABLE IF NOT EXISTS public.custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_field_id UUID REFERENCES public.custom_fields(id) ON DELETE CASCADE,
  record_id UUID NOT NULL, -- ID of the lead/contact/opportunity
  value JSONB, -- Stores the actual value
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(custom_field_id, record_id)
);

-- Enable RLS
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;

-- RLS policies for custom_fields
CREATE POLICY "Users can view workspace custom_fields"
  ON public.custom_fields FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM get_user_workspaces(auth.uid())));

CREATE POLICY "Users can create workspace custom_fields"
  ON public.custom_fields FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM get_user_workspaces(auth.uid())));

CREATE POLICY "Users can update workspace custom_fields"
  ON public.custom_fields FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM get_user_workspaces(auth.uid())));

CREATE POLICY "Users can delete workspace custom_fields"
  ON public.custom_fields FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM get_user_workspaces(auth.uid())));

-- RLS policies for custom_field_values
CREATE POLICY "Users can view workspace custom_field_values"
  ON public.custom_field_values FOR SELECT
  USING (custom_field_id IN (
    SELECT id FROM custom_fields 
    WHERE workspace_id IN (SELECT workspace_id FROM get_user_workspaces(auth.uid()))
  ));

CREATE POLICY "Users can create custom_field_values"
  ON public.custom_field_values FOR INSERT
  WITH CHECK (custom_field_id IN (
    SELECT id FROM custom_fields 
    WHERE workspace_id IN (SELECT workspace_id FROM get_user_workspaces(auth.uid()))
  ));

CREATE POLICY "Users can update custom_field_values"
  ON public.custom_field_values FOR UPDATE
  USING (custom_field_id IN (
    SELECT id FROM custom_fields 
    WHERE workspace_id IN (SELECT workspace_id FROM get_user_workspaces(auth.uid()))
  ));

CREATE POLICY "Users can delete custom_field_values"
  ON public.custom_field_values FOR DELETE
  USING (custom_field_id IN (
    SELECT id FROM custom_fields 
    WHERE workspace_id IN (SELECT workspace_id FROM get_user_workspaces(auth.uid()))
  ));

-- Add indexes for better performance
CREATE INDEX idx_custom_fields_workspace ON public.custom_fields(workspace_id);
CREATE INDEX idx_custom_fields_object_type ON public.custom_fields(object_type);
CREATE INDEX idx_custom_field_values_field ON public.custom_field_values(custom_field_id);
CREATE INDEX idx_custom_field_values_record ON public.custom_field_values(record_id);