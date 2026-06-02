
-- Enums
DO $$ BEGIN
  CREATE TYPE public.social_suggestion_status AS ENUM ('pending','approved','edited','dismissed','posted','expired','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.social_suggestion_reason AS ENUM ('cadence_gap','upcoming','silence','manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Suggestions
CREATE TABLE IF NOT EXISTS public.social_post_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  platform text NOT NULL DEFAULT 'instagram',
  account_id uuid,
  caption text NOT NULL DEFAULT '',
  images text[] NOT NULL DEFAULT '{}',
  suggested_for timestamptz NOT NULL DEFAULT now(),
  reason public.social_suggestion_reason NOT NULL DEFAULT 'cadence_gap',
  status public.social_suggestion_status NOT NULL DEFAULT 'pending',
  approval_token text UNIQUE,
  token_expires_at timestamptz,
  posted_post_id uuid,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sps_ws_status ON public.social_post_suggestions(workspace_id, status, suggested_for);
CREATE INDEX IF NOT EXISTS idx_sps_token ON public.social_post_suggestions(approval_token) WHERE approval_token IS NOT NULL;

ALTER TABLE public.social_post_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read suggestions" ON public.social_post_suggestions;
CREATE POLICY "Members read suggestions" ON public.social_post_suggestions
  FOR SELECT USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Members write suggestions" ON public.social_post_suggestions;
CREATE POLICY "Members write suggestions" ON public.social_post_suggestions
  FOR ALL USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE TRIGGER trg_sps_updated BEFORE UPDATE ON public.social_post_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Cadence settings (one per workspace)
CREATE TABLE IF NOT EXISTS public.social_cadence_settings (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  target_posts_per_week int NOT NULL DEFAULT 3,
  quiet_hours_start time NOT NULL DEFAULT '21:00',
  quiet_hours_end time NOT NULL DEFAULT '08:00',
  channels jsonb NOT NULL DEFAULT '{"inapp":true,"email":true,"sms":false}'::jsonb,
  notify_phone text,
  notify_email text,
  last_nudge_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_cadence_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read cadence" ON public.social_cadence_settings;
CREATE POLICY "Members read cadence" ON public.social_cadence_settings
  FOR SELECT USING (public.is_workspace_member(workspace_id, auth.uid()));
DROP POLICY IF EXISTS "Members write cadence" ON public.social_cadence_settings;
CREATE POLICY "Members write cadence" ON public.social_cadence_settings
  FOR ALL USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE TRIGGER trg_scs_updated BEFORE UPDATE ON public.social_cadence_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notifications
CREATE TABLE IF NOT EXISTS public.social_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  suggestion_id uuid REFERENCES public.social_post_suggestions(id) ON DELETE CASCADE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sn_user_unread ON public.social_notifications(user_id, created_at DESC) WHERE read_at IS NULL;

ALTER TABLE public.social_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner reads notifications" ON public.social_notifications;
CREATE POLICY "Owner reads notifications" ON public.social_notifications
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owner updates notifications" ON public.social_notifications;
CREATE POLICY "Owner updates notifications" ON public.social_notifications
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owner deletes notifications" ON public.social_notifications;
CREATE POLICY "Owner deletes notifications" ON public.social_notifications
  FOR DELETE USING (auth.uid() = user_id);
