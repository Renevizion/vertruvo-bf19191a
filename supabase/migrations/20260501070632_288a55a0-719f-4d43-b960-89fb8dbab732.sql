-- Sandbox pool usage tracking for new workspaces trying Twilio voice/SMS without BYO setup
CREATE TABLE IF NOT EXISTS public.twilio_sandbox_usage (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  calls_used integer NOT NULL DEFAULT 0,
  sms_used integer NOT NULL DEFAULT 0,
  voicemails_used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.twilio_sandbox_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view own sandbox usage"
ON public.twilio_sandbox_usage FOR SELECT
TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()) OR public.is_platform_admin(auth.uid()));

-- Only edge functions (service role) write to this table; no insert/update policies for clients.

CREATE OR REPLACE FUNCTION public.increment_sandbox_usage(_workspace_id uuid, _kind text, _cap integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current integer;
  _new integer;
BEGIN
  INSERT INTO public.twilio_sandbox_usage (workspace_id) VALUES (_workspace_id)
  ON CONFLICT (workspace_id) DO NOTHING;

  IF _kind = 'call' THEN
    SELECT calls_used INTO _current FROM public.twilio_sandbox_usage WHERE workspace_id = _workspace_id FOR UPDATE;
    IF _current >= _cap THEN
      RETURN jsonb_build_object('allowed', false, 'used', _current, 'cap', _cap);
    END IF;
    UPDATE public.twilio_sandbox_usage SET calls_used = calls_used + 1, updated_at = now()
      WHERE workspace_id = _workspace_id RETURNING calls_used INTO _new;
  ELSIF _kind = 'sms' THEN
    SELECT sms_used INTO _current FROM public.twilio_sandbox_usage WHERE workspace_id = _workspace_id FOR UPDATE;
    IF _current >= _cap THEN
      RETURN jsonb_build_object('allowed', false, 'used', _current, 'cap', _cap);
    END IF;
    UPDATE public.twilio_sandbox_usage SET sms_used = sms_used + 1, updated_at = now()
      WHERE workspace_id = _workspace_id RETURNING sms_used INTO _new;
  ELSIF _kind = 'voicemail' THEN
    SELECT voicemails_used INTO _current FROM public.twilio_sandbox_usage WHERE workspace_id = _workspace_id FOR UPDATE;
    IF _current >= _cap THEN
      RETURN jsonb_build_object('allowed', false, 'used', _current, 'cap', _cap);
    END IF;
    UPDATE public.twilio_sandbox_usage SET voicemails_used = voicemails_used + 1, updated_at = now()
      WHERE workspace_id = _workspace_id RETURNING voicemails_used INTO _new;
  ELSE
    RAISE EXCEPTION 'Invalid sandbox kind: %', _kind;
  END IF;

  RETURN jsonb_build_object('allowed', true, 'used', _new, 'cap', _cap);
END;
$$;