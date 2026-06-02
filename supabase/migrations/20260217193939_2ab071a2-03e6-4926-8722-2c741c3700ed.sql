
-- Fix 1: Tighten storage policies for assets bucket
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete assets" ON storage.objects;
DROP POLICY IF EXISTS "Public can view assets" ON storage.objects;

-- Re-create with workspace-scoped access
-- Public read remains (assets like logos need to be publicly viewable)
CREATE POLICY "Public can view assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'assets');

-- Upload restricted to workspace folder
CREATE POLICY "Users can upload to workspace folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'assets' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.workspaces
    WHERE id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid()))
  )
);

-- Update restricted to own workspace files
CREATE POLICY "Users can update own workspace files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'assets' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.workspaces
    WHERE id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid()))
  )
);

-- Delete restricted to own workspace files
CREATE POLICY "Users can delete own workspace files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'assets' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.workspaces
    WHERE id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid()))
  )
);

-- Fix 2: Tighten pending_tool_suggestions RLS to admin-only
DROP POLICY IF EXISTS "Admins can view suggestions" ON public.pending_tool_suggestions;
DROP POLICY IF EXISTS "Admins can manage suggestions" ON public.pending_tool_suggestions;

CREATE POLICY "Admins can view suggestions"
ON public.pending_tool_suggestions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage suggestions"
ON public.pending_tool_suggestions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
