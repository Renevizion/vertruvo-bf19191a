-- Add user_id to google_sheet_integrations table to track who owns each integration
ALTER TABLE public.google_sheet_integrations
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing integrations to set user_id (assuming first profile is the owner)
UPDATE public.google_sheet_integrations
SET user_id = (SELECT id FROM public.profiles ORDER BY created_at LIMIT 1)
WHERE user_id IS NULL;

-- Fix existing leads by setting workspace_id to the user who owns the integration
UPDATE public.leads
SET workspace_id = (
  SELECT user_id
  FROM public.google_sheet_integrations
  WHERE id = 'bedc21ee-b357-41aa-b818-9212fd41ec99'
  LIMIT 1
)
WHERE source = 'Google Sheets' AND workspace_id IS NULL;