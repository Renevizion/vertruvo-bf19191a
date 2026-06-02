-- Create agent settings table for workspace-level configuration
CREATE TABLE IF NOT EXISTS public.agent_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID DEFAULT gen_random_uuid(), -- For future multi-workspace support
  agent_features_enabled BOOLEAN DEFAULT true,
  agent_tier TEXT DEFAULT 'basic' CHECK (agent_tier IN ('basic', 'premium')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_settings ENABLE ROW LEVEL SECURITY;

-- Allow all operations (adjust based on your auth needs)
CREATE POLICY "Allow all operations on agent_settings"
  ON public.agent_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create agent insights cache table to store generated insights
CREATE TABLE IF NOT EXISTS public.agent_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_type TEXT NOT NULL CHECK (context_type IN ('lead', 'contact', 'kpi', 'task', 'conversation', 'sheets')),
  context_id UUID, -- ID of the lead/contact/etc
  insight_type TEXT NOT NULL, -- 'summary', 'suggestion', 'scoring', 'draft'
  content JSONB NOT NULL, -- Structured insight data
  model_used TEXT, -- Track which model generated it
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '1 hour') -- Cache for 1 hour
);

-- Enable RLS
ALTER TABLE public.agent_insights ENABLE ROW LEVEL SECURITY;

-- Allow all operations
CREATE POLICY "Allow all operations on agent_insights"
  ON public.agent_insights
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_agent_insights_context ON public.agent_insights(context_type, context_id, insight_type);
CREATE INDEX idx_agent_insights_expires ON public.agent_insights(expires_at);

-- Insert default agent settings
INSERT INTO public.agent_settings (agent_features_enabled, agent_tier)
VALUES (true, 'basic')
ON CONFLICT DO NOTHING;

-- Create trigger to update updated_at
CREATE TRIGGER update_agent_settings_updated_at
  BEFORE UPDATE ON public.agent_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();