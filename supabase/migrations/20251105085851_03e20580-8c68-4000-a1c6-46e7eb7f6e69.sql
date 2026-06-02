-- Add onboarding progress tracking to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS onboarding_data JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.onboarding_step IS 'Current step in onboarding wizard (1-4)';
COMMENT ON COLUMN public.profiles.onboarding_data IS 'Saved onboarding form data (business info, pipeline name, etc)';