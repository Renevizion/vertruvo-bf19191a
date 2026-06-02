
CREATE TABLE IF NOT EXISTS public.shell_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('kiosk','widget','agent','extension','wl','api')),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  hero_title text,
  hero_subtitle text,
  accent_color text DEFAULT '#059669',
  capability_keys text[] NOT NULL DEFAULT '{}',
  layout jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shell_instances_workspace_idx ON public.shell_instances(workspace_id);
CREATE INDEX IF NOT EXISTS shell_instances_slug_idx ON public.shell_instances(slug);

ALTER TABLE public.shell_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own workspace shells"
  ON public.shell_instances FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Public can read published shells"
  ON public.shell_instances FOR SELECT
  USING (is_published = true);

CREATE POLICY "Members insert shells in own workspace"
  ON public.shell_instances FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members update own workspace shells"
  ON public.shell_instances FOR UPDATE
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members delete own workspace shells"
  ON public.shell_instances FOR DELETE
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE TRIGGER trg_shell_instances_updated_at
  BEFORE UPDATE ON public.shell_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
