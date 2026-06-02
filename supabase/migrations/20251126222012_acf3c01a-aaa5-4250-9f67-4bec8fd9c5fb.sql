-- Allow anonymous users to view active forms (needed for embed code)
CREATE POLICY "Anonymous users can view active forms"
ON public.forms
FOR SELECT
TO anon
USING (is_active = true);

-- Allow anonymous users to view active A/B test variants (needed for A/B testing in embeds)
CREATE POLICY "Anonymous users can view active AB tests"
ON public.form_ab_tests
FOR SELECT
TO anon
USING (is_active = true AND form_id IN (
  SELECT id FROM forms WHERE is_active = true
));