-- Create agent_tools table for dynamic tool management
CREATE TABLE public.agent_tools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  executor_type TEXT NOT NULL DEFAULT 'internal', -- 'internal', 'edge_function', 'webhook'
  executor_config JSONB DEFAULT '{}',
  parameters_schema JSONB DEFAULT '{}',
  is_system BOOLEAN DEFAULT false, -- true for built-in tools
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create pending_tool_suggestions table for AI-recommended tools
CREATE TABLE public.pending_tool_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  suggested_parameters JSONB DEFAULT '{}',
  suggested_executor_type TEXT DEFAULT 'internal',
  reason TEXT,
  agent_id UUID REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Seed the built-in system tools
INSERT INTO public.agent_tools (name, display_name, description, executor_type, is_system, parameters_schema) VALUES
('search_web', 'Search Web', 'Searches the web for information using Serp API', 'internal', true, '{"query": {"type": "string", "required": true}}'),
('send_message', 'Send Message', 'Sends a message to a contact via configured channels', 'internal', true, '{"contact_id": {"type": "string", "required": true}, "message": {"type": "string", "required": true}}'),
('create_task', 'Create Task', 'Creates a new task in the CRM', 'internal', true, '{"title": {"type": "string", "required": true}, "due_date": {"type": "string"}, "contact_id": {"type": "string"}}'),
('update_lead', 'Update Lead', 'Updates lead information in the CRM', 'internal', true, '{"lead_id": {"type": "string", "required": true}, "updates": {"type": "object", "required": true}}'),
('create_activity', 'Create Activity', 'Logs an activity for a lead or contact', 'internal', true, '{"type": {"type": "string", "required": true}, "description": {"type": "string", "required": true}, "lead_id": {"type": "string"}}'),
('query_data', 'Query Data', 'Queries CRM data based on scope permissions', 'internal', true, '{"scope": {"type": "string", "required": true}, "filters": {"type": "object"}}'),
('send_email', 'Send Email', 'Sends an email to a recipient', 'internal', true, '{"to": {"type": "string", "required": true}, "subject": {"type": "string", "required": true}, "body": {"type": "string", "required": true}}');

-- Enable RLS
ALTER TABLE public.agent_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_tool_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS policies - tools are platform-wide (admin managed)
CREATE POLICY "Anyone can view active tools" ON public.agent_tools FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage tools" ON public.agent_tools FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND email IN (SELECT unnest(string_to_array(current_setting('app.admin_emails', true), ','))))
);

-- Pending suggestions - viewable by admins
CREATE POLICY "Admins can view suggestions" ON public.pending_tool_suggestions FOR SELECT USING (true);
CREATE POLICY "Admins can manage suggestions" ON public.pending_tool_suggestions FOR ALL USING (true);