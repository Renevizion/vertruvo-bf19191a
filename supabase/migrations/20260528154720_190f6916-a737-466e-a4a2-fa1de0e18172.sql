-- Agent Blueprints: platform-published agent templates with per-workspace instances

CREATE TABLE public.agent_blueprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text DEFAULT 'general',
  type text NOT NULL DEFAULT 'chat',
  voice text,
  greeting text,
  instructions text NOT NULL,
  suggested_tools jsonb DEFAULT '[]'::jsonb,
  default_integrations jsonb DEFAULT '[]'::jsonb,
  is_published boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  version int NOT NULL DEFAULT 1,
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.agent_blueprints TO authenticated;
GRANT ALL ON public.agent_blueprints TO service_role;

ALTER TABLE public.agent_blueprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view published blueprints"
  ON public.agent_blueprints FOR SELECT
  TO authenticated
  USING (is_published = true OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can insert blueprints"
  ON public.agent_blueprints FOR INSERT
  TO authenticated
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can update blueprints"
  ON public.agent_blueprints FOR UPDATE
  TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can delete blueprints"
  ON public.agent_blueprints FOR DELETE
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE TRIGGER agent_blueprints_updated_at
  BEFORE UPDATE ON public.agent_blueprints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link installed agents back to their blueprint
ALTER TABLE public.ai_agents
  ADD COLUMN IF NOT EXISTS blueprint_id uuid REFERENCES public.agent_blueprints(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS blueprint_version int;

CREATE INDEX IF NOT EXISTS idx_ai_agents_blueprint_id ON public.ai_agents(blueprint_id);
CREATE INDEX IF NOT EXISTS idx_agent_blueprints_published ON public.agent_blueprints(is_published, is_featured);

-- Seed existing JSON templates into the new table (best-effort)
INSERT INTO public.agent_blueprints (name, description, category, type, voice, greeting, instructions, is_published, is_featured, published_at)
SELECT
  COALESCE(t->>'name', 'Untitled'),
  t->>'description',
  COALESCE(t->>'category', 'general'),
  COALESCE(t->>'type', 'chat'),
  t->>'voice',
  t->>'greeting',
  COALESCE(t->>'instructions', ''),
  COALESCE((t->>'is_featured')::boolean, false),
  COALESCE((t->>'is_featured')::boolean, false),
  CASE WHEN COALESCE((t->>'is_featured')::boolean, false) THEN now() ELSE NULL END
FROM public.platform_config pc,
     jsonb_array_elements(pc.value) t
WHERE pc.key = 'agent_templates'
  AND jsonb_typeof(pc.value) = 'array'
ON CONFLICT DO NOTHING;