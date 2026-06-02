-- Add per-user landing page preference to profiles
ALTER TABLE public.profiles ADD COLUMN default_landing_page text DEFAULT NULL;

COMMENT ON COLUMN public.profiles.default_landing_page IS 'Per-user landing page preference. Falls back to workspace business_settings if NULL.';