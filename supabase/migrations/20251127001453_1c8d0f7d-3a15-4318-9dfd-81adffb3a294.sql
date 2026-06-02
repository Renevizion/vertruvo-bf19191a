-- Update ai_agents type check constraint to include 'workflow' type
ALTER TABLE ai_agents DROP CONSTRAINT IF EXISTS ai_agents_type_check;
ALTER TABLE ai_agents ADD CONSTRAINT ai_agents_type_check CHECK (type = ANY (ARRAY['voice'::text, 'conversation'::text, 'workflow'::text]));