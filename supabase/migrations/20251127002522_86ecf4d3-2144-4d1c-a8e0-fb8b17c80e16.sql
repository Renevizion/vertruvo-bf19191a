-- Add template_id to ai_agents table to track which template an agent was created from
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS template_id TEXT;

-- Add index for faster template usage queries
CREATE INDEX IF NOT EXISTS idx_ai_agents_template_id ON ai_agents(template_id);