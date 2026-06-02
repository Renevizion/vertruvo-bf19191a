-- Migration: Inbound Call Support
-- Adds columns needed for inbound call routing and ElevenLabs agent mapping

-- 1. Add inbound_enabled flag to ai_agents so a workspace can designate
--    which voice agent answers incoming calls.
ALTER TABLE public.ai_agents
  ADD COLUMN IF NOT EXISTS inbound_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS elevenlabs_agent_id TEXT;

-- 2. Add direction to call_logs so we can distinguish inbound vs outbound
ALTER TABLE public.call_logs
  ADD COLUMN IF NOT EXISTS direction TEXT NOT NULL DEFAULT 'outbound'
    CHECK (direction IN ('inbound', 'outbound')),
  ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES public.ai_agents(id) ON DELETE SET NULL;

-- 3. Only one voice agent per workspace can be the inbound handler at a time.
--    Enforce with a partial unique index.
CREATE UNIQUE INDEX IF NOT EXISTS ai_agents_one_inbound_per_workspace
  ON public.ai_agents (workspace_id)
  WHERE (type = 'voice' AND inbound_enabled = true);

-- 4. Add inbound_webhook_configured flag to twilio_phone_numbers so the UI
--    can show a green checkmark once the webhook has been set.
ALTER TABLE public.twilio_phone_numbers
  ADD COLUMN IF NOT EXISTS inbound_webhook_configured BOOLEAN NOT NULL DEFAULT false;

-- 5. RLS: existing policies on ai_agents and call_logs already cover workspace
--    isolation, so no new policies needed. The new columns inherit them.

COMMENT ON COLUMN public.ai_agents.inbound_enabled IS
  'When true, this voice agent is the designated inbound call handler for the workspace. Only one agent per workspace may have this set.';

COMMENT ON COLUMN public.ai_agents.elevenlabs_agent_id IS
  'ElevenLabs Conversational AI agent ID. When set, inbound calls are streamed directly to ElevenLabs via Twilio Media Streams.';

COMMENT ON COLUMN public.call_logs.direction IS
  'Whether the call was initiated by Kiruvo (outbound) or received from an external caller (inbound).';

COMMENT ON COLUMN public.twilio_phone_numbers.inbound_webhook_configured IS
  'True once the Twilio Voice webhook has been pointed at the twilio-inbound-call edge function.';
