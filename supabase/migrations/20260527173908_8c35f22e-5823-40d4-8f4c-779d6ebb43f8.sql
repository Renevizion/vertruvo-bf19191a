
CREATE TABLE IF NOT EXISTS public.license_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  license_version text NOT NULL DEFAULT '3.0',
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  workspace_id uuid
);

GRANT SELECT, INSERT ON public.license_acceptances TO authenticated;
GRANT ALL ON public.license_acceptances TO service_role;

ALTER TABLE public.license_acceptances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own acceptance" ON public.license_acceptances;
CREATE POLICY "Users can view own acceptance"
  ON public.license_acceptances FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own acceptance" ON public.license_acceptances;
CREATE POLICY "Users can insert own acceptance"
  ON public.license_acceptances FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS license_acceptances_user_id_idx
  ON public.license_acceptances(user_id);
CREATE INDEX IF NOT EXISTS license_acceptances_user_version_idx
  ON public.license_acceptances(user_id, license_version);
