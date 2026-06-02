-- Add ai_provider column to agent_settings
ALTER TABLE public.agent_settings 
ADD COLUMN ai_provider text DEFAULT 'mistral' CHECK (ai_provider IN ('mistral', 'gemini'));

-- Create pipelines table
CREATE TABLE public.pipelines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on pipelines
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on pipelines" 
ON public.pipelines 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add pipeline_id to pipeline_stages
ALTER TABLE public.pipeline_stages 
ADD COLUMN pipeline_id uuid REFERENCES public.pipelines(id) ON DELETE CASCADE;

-- Add pipeline_id to leads
ALTER TABLE public.leads 
ADD COLUMN pipeline_id uuid REFERENCES public.pipelines(id) ON DELETE SET NULL;

-- Create default "Sales Pipeline"
INSERT INTO public.pipelines (name, description, is_default)
VALUES ('Sales Pipeline', 'Default sales opportunity pipeline', true);

-- Migrate existing stages to the default pipeline
UPDATE public.pipeline_stages 
SET pipeline_id = (SELECT id FROM public.pipelines WHERE is_default = true LIMIT 1)
WHERE pipeline_id IS NULL;

-- Migrate existing leads to the default pipeline
UPDATE public.leads 
SET pipeline_id = (SELECT id FROM public.pipelines WHERE is_default = true LIMIT 1)
WHERE pipeline_id IS NULL;

-- Add trigger for updated_at on pipelines
CREATE TRIGGER update_pipelines_updated_at
BEFORE UPDATE ON public.pipelines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();