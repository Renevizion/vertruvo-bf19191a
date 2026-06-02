-- Create ai_agents table
CREATE TABLE IF NOT EXISTS public.ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('voice', 'conversation')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'inactive')),
  phone_number TEXT,
  greeting TEXT,
  instructions TEXT,
  voice TEXT DEFAULT 'alloy',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create knowledge_bases table
CREATE TABLE IF NOT EXISTS public.knowledge_bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create knowledge_sources table
CREATE TABLE IF NOT EXISTS public.knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_base_id UUID REFERENCES public.knowledge_bases(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('web_crawler', 'faq', 'table', 'uploaded_link')),
  title TEXT,
  content TEXT,
  url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create twilio_phone_numbers table
CREATE TABLE IF NOT EXISTS public.twilio_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL UNIQUE,
  friendly_name TEXT,
  is_active BOOLEAN DEFAULT false,
  capabilities JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.twilio_phone_numbers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all operations on ai_agents" ON public.ai_agents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on knowledge_bases" ON public.knowledge_bases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on knowledge_sources" ON public.knowledge_sources FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on twilio_phone_numbers" ON public.twilio_phone_numbers FOR ALL USING (true) WITH CHECK (true);

-- Create triggers
CREATE TRIGGER update_ai_agents_updated_at
  BEFORE UPDATE ON public.ai_agents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_knowledge_bases_updated_at
  BEFORE UPDATE ON public.knowledge_bases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();