-- Reusable objective templates per workspace
CREATE TABLE public.call_objectives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  success_criteria TEXT NOT NULL,
  expected_keypresses JSONB DEFAULT '{}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_call_objectives_workspace ON public.call_objectives(workspace_id);

ALTER TABLE public.call_objectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members manage objectives"
  ON public.call_objectives FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid())))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid())));

CREATE TRIGGER update_call_objectives_updated_at
  BEFORE UPDATE ON public.call_objectives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Per-call tracking columns
ALTER TABLE public.call_logs
  ADD COLUMN IF NOT EXISTS objective_id UUID REFERENCES public.call_objectives(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS objective_text TEXT,
  ADD COLUMN IF NOT EXISTS keypress_log JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS speech_responses JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS objective_met BOOLEAN,
  ADD COLUMN IF NOT EXISTS objective_reasoning TEXT,
  ADD COLUMN IF NOT EXISTS broadcast_id UUID REFERENCES public.voice_broadcasts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS voicemail_drop_id UUID REFERENCES public.voicemail_drops(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS broadcast_recipient_id UUID REFERENCES public.voice_broadcast_recipients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_call_logs_broadcast ON public.call_logs(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_voicemail ON public.call_logs(voicemail_drop_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_objective ON public.call_logs(objective_id);

-- Campaign-level objective
ALTER TABLE public.voice_broadcasts
  ADD COLUMN IF NOT EXISTS objective_id UUID REFERENCES public.call_objectives(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS objective_text TEXT,
  ADD COLUMN IF NOT EXISTS gather_speech BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS gather_keypresses BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.voicemail_drops
  ADD COLUMN IF NOT EXISTS objective_id UUID REFERENCES public.call_objectives(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS objective_text TEXT;