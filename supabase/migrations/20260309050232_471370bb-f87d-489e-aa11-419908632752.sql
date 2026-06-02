ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS enabled_modules jsonb DEFAULT '["crm","outreach","content","intelligence"]'::jsonb;