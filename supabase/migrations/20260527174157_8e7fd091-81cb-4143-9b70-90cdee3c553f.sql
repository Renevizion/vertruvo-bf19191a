
ALTER TABLE public.ai_agents
  ADD COLUMN IF NOT EXISTS inbound_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS elevenlabs_agent_id text;

ALTER TABLE public.twilio_phone_numbers
  ADD COLUMN IF NOT EXISTS inbound_webhook_configured boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='agent_templates') THEN
    EXECUTE 'ALTER TABLE public.agent_templates ADD COLUMN IF NOT EXISTS use_cases text[] DEFAULT ''{}''::text[]';
  END IF;
END$$;
