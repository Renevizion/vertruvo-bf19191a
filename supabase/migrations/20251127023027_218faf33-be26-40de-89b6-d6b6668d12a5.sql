-- Fix search_path for existing functions
ALTER FUNCTION public.update_platform_api_configs_updated_at() SET search_path = public;

-- Fix RLS policy for platform_api_configs (was using wrong column name)
DROP POLICY IF EXISTS "Platform admins can manage API configs" ON public.platform_api_configs;

CREATE POLICY "Platform admins can manage API configs"
  ON public.platform_api_configs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );