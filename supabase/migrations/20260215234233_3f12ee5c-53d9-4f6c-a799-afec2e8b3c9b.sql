
-- Voice conversation history/logs
CREATE TABLE public.voice_conversation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  session_id TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  transcript JSONB DEFAULT '[]'::JSONB,
  actions_taken JSONB DEFAULT '[]'::JSONB,
  summary TEXT,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.voice_conversation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workspace voice logs"
ON public.voice_conversation_logs FOR SELECT
TO authenticated
USING (workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid())));

CREATE POLICY "Users can insert own workspace voice logs"
ON public.voice_conversation_logs FOR INSERT
TO authenticated
WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid())));

CREATE POLICY "Users can update own workspace voice logs"
ON public.voice_conversation_logs FOR UPDATE
TO authenticated
USING (workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid())));

CREATE INDEX idx_voice_logs_workspace ON public.voice_conversation_logs(workspace_id);
CREATE INDEX idx_voice_logs_created ON public.voice_conversation_logs(created_at DESC);

-- Voicemail drops table
CREATE TABLE public.voicemail_drops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  audio_url TEXT,
  tts_text TEXT,
  voice_id TEXT DEFAULT 'SAz9YHcvj6GT2YYXdXww',
  duration_seconds INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.voicemail_drops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own workspace voicemail drops"
ON public.voicemail_drops FOR ALL
TO authenticated
USING (workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid())))
WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid())));

-- Voice broadcasts table
CREATE TABLE public.voice_broadcasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  message_text TEXT NOT NULL,
  voice_id TEXT DEFAULT 'SAz9YHcvj6GT2YYXdXww',
  status TEXT NOT NULL DEFAULT 'draft',
  target_filter JSONB DEFAULT '{}'::JSONB,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.voice_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own workspace voice broadcasts"
ON public.voice_broadcasts FOR ALL
TO authenticated
USING (workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid())))
WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid())));

-- Voice broadcast recipients
CREATE TABLE public.voice_broadcast_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broadcast_id UUID REFERENCES public.voice_broadcasts(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  call_sid TEXT,
  duration_seconds INTEGER,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.voice_broadcast_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage broadcast recipients via broadcast"
ON public.voice_broadcast_recipients FOR ALL
TO authenticated
USING (broadcast_id IN (
  SELECT id FROM public.voice_broadcasts 
  WHERE workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid()))
))
WITH CHECK (broadcast_id IN (
  SELECT id FROM public.voice_broadcasts 
  WHERE workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid()))
));

-- Add language preference to business_settings
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS voice_language TEXT DEFAULT 'en';

-- Add call_summary to call_logs
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS transcript TEXT;
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS summary TEXT;

-- Trigger for updated_at
CREATE TRIGGER update_voicemail_drops_updated_at
BEFORE UPDATE ON public.voicemail_drops
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_voice_broadcasts_updated_at
BEFORE UPDATE ON public.voice_broadcasts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
