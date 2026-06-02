-- Add platform_api_configs table for storing admin-provided API keys
CREATE TABLE IF NOT EXISTS public.platform_api_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_type TEXT NOT NULL UNIQUE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_api_configs ENABLE ROW LEVEL SECURITY;

-- Only platform admins can manage platform API configs
CREATE POLICY "Platform admins can manage API configs"
  ON public.platform_api_configs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_platform_api_configs_integration_type 
  ON public.platform_api_configs(integration_type);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_platform_api_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_platform_api_configs_updated_at
  BEFORE UPDATE ON public.platform_api_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_platform_api_configs_updated_at();