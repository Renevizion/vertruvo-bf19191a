
-- Content items: single source of truth for programs, classes, announcements
CREATE TABLE public.content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL DEFAULT 'program',
  details JSONB DEFAULT '{}',
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage content items in their workspace"
  ON public.content_items FOR ALL TO authenticated
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
    OR workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
    OR workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Brand kit settings
CREATE TABLE public.brand_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE,
  primary_color TEXT DEFAULT '#0F8B5F',
  secondary_color TEXT DEFAULT '#1a1a1a',
  accent_color TEXT DEFAULT '#f5f5f0',
  font_heading TEXT DEFAULT 'Inter',
  font_body TEXT DEFAULT 'Inter',
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.brand_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their workspace brand kit"
  ON public.brand_kits FOR ALL TO authenticated
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
    OR workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
    OR workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
