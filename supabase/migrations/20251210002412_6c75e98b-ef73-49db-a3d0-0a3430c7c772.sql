-- Allow all authenticated users to read agent_templates from platform_config
CREATE POLICY "Users can read agent templates"
ON public.platform_config
FOR SELECT
TO authenticated
USING (key = 'agent_templates');