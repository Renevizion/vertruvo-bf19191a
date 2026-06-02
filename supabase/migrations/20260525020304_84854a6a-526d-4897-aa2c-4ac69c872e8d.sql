CREATE OR REPLACE FUNCTION public.get_public_shell_instance(_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', si.id,
    'workspace_id', si.workspace_id,
    'workspace_slug', w.slug,
    'kind', si.kind,
    'name', si.name,
    'hero_title', si.hero_title,
    'hero_subtitle', si.hero_subtitle,
    'accent_color', si.accent_color,
    'capability_keys', si.capability_keys,
    'is_published', si.is_published,
    'brand_name', si.brand_name,
    'logo_url', si.logo_url,
    'support_email', si.support_email,
    'footer_note', si.footer_note,
    'layout', si.layout
  )
  INTO result
  FROM public.shell_instances si
  JOIN public.workspaces w ON w.id = si.workspace_id
  WHERE si.slug = _slug
    AND si.is_published = true
  LIMIT 1;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_preview_shell_instance(_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', si.id,
    'workspace_id', si.workspace_id,
    'workspace_slug', w.slug,
    'kind', si.kind,
    'name', si.name,
    'hero_title', si.hero_title,
    'hero_subtitle', si.hero_subtitle,
    'accent_color', si.accent_color,
    'capability_keys', si.capability_keys,
    'is_published', si.is_published,
    'brand_name', si.brand_name,
    'logo_url', si.logo_url,
    'support_email', si.support_email,
    'footer_note', si.footer_note,
    'layout', si.layout
  )
  INTO result
  FROM public.shell_instances si
  JOIN public.workspaces w ON w.id = si.workspace_id
  WHERE si.slug = _slug
    AND (public.is_workspace_member(si.workspace_id, auth.uid()) OR public.is_platform_admin(auth.uid()))
  LIMIT 1;

  RETURN result;
END;
$$;

DROP POLICY IF EXISTS "Members read own workspace shells" ON public.shell_instances;
DROP POLICY IF EXISTS "Members insert shells in own workspace" ON public.shell_instances;
DROP POLICY IF EXISTS "Members update own workspace shells" ON public.shell_instances;
DROP POLICY IF EXISTS "Members delete own workspace shells" ON public.shell_instances;

CREATE POLICY "Members and admins read managed shells"
  ON public.shell_instances FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()) OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Members and admins insert managed shells"
  ON public.shell_instances FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Members and admins update managed shells"
  ON public.shell_instances FOR UPDATE
  USING (public.is_workspace_member(workspace_id, auth.uid()) OR public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Members and admins delete managed shells"
  ON public.shell_instances FOR DELETE
  USING (public.is_workspace_member(workspace_id, auth.uid()) OR public.is_platform_admin(auth.uid()));