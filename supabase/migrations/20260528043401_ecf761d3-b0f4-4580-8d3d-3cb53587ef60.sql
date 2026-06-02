
-- 1. error_events
CREATE TABLE public.error_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid,
  message text NOT NULL,
  stack text,
  source text,
  url text,
  user_agent text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  severity text NOT NULL DEFAULT 'error',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_error_events_workspace_created ON public.error_events(workspace_id, created_at DESC);
CREATE INDEX idx_error_events_created ON public.error_events(created_at DESC);

GRANT SELECT, INSERT ON public.error_events TO anon, authenticated;
GRANT ALL ON public.error_events TO service_role;
ALTER TABLE public.error_events ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon during a crash) can insert error reports for themselves
CREATE POLICY "Anyone can insert error events"
ON public.error_events FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Only platform admins or workspace members can read
CREATE POLICY "Admins can read all error events"
ON public.error_events FOR SELECT TO authenticated
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Workspace members can read own workspace errors"
ON public.error_events FOR SELECT TO authenticated
USING (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id, auth.uid()));

-- 2. whisper_sessions
CREATE TABLE public.whisper_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  mode text NOT NULL DEFAULT 'whisper', -- whisper | listening
  channel text NOT NULL DEFAULT 'voice', -- voice | sms | other
  title text,
  summary text,
  key_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  action_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  sentiment text,
  duration_seconds integer,
  transcript text, -- hidden by default; only owner can read
  transcript_hidden boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active', -- active | completed | discarded
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_whisper_workspace_created ON public.whisper_sessions(workspace_id, created_at DESC);
CREATE INDEX idx_whisper_user ON public.whisper_sessions(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whisper_sessions TO authenticated;
GRANT ALL ON public.whisper_sessions TO service_role;
ALTER TABLE public.whisper_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read whisper summaries"
ON public.whisper_sessions FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Users insert own whispers"
ON public.whisper_sessions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Owner can update own whispers"
ON public.whisper_sessions FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Owner can delete own whispers"
ON public.whisper_sessions FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER trg_whisper_updated_at
BEFORE UPDATE ON public.whisper_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. agent_orchestrations
CREATE TABLE public.agent_orchestrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  goal text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | planning | judging | handoff | completed | failed
  plan jsonb,
  judgement jsonb,
  handoff jsonb,
  result jsonb,
  step_count integer NOT NULL DEFAULT 0,
  error text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_orch_workspace ON public.agent_orchestrations(workspace_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_orchestrations TO authenticated;
GRANT ALL ON public.agent_orchestrations TO service_role;
ALTER TABLE public.agent_orchestrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read orchestrations"
ON public.agent_orchestrations FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members can insert orchestrations"
ON public.agent_orchestrations FOR INSERT TO authenticated
WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND auth.uid() = user_id);

CREATE POLICY "Members can update own orchestrations"
ON public.agent_orchestrations FOR UPDATE TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE TRIGGER trg_orch_updated_at
BEFORE UPDATE ON public.agent_orchestrations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
