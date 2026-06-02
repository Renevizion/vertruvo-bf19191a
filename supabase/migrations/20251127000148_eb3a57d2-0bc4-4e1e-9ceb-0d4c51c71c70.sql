-- Add integration configurations to ai_agents table
ALTER TABLE public.ai_agents 
ADD COLUMN integration_configs JSONB DEFAULT NULL;

-- Add comment explaining the structure
COMMENT ON COLUMN public.ai_agents.integration_configs IS 'Stores integration configurations as JSON: { "integration_id": { "field_name": "value" } }';

-- Update existing agents to have empty configs if null
UPDATE public.ai_agents 
SET integration_configs = '{}'::jsonb 
WHERE integration_configs IS NULL;