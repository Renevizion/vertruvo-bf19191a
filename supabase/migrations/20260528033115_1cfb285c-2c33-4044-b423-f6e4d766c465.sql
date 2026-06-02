
-- AI Conversation Evaluations: judge-LLM scores for every AI interaction
CREATE TABLE public.ai_conversation_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  agent_id UUID,
  conversation_source TEXT NOT NULL, -- 'voice_call', 'chat', 'form_response', 'bulk_outreach', 'sms'
  source_ref_id TEXT, -- id of call_log / message / form_submission
  transcript_excerpt TEXT NOT NULL,
  full_transcript JSONB,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  flags TEXT[] NOT NULL DEFAULT '{}',
  rubric_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb, -- {brand_voice: 90, accuracy: 85, ...}
  judge_reasoning TEXT,
  judged_model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
  contact_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_eval_workspace_created ON public.ai_conversation_evaluations (workspace_id, created_at DESC);
CREATE INDEX idx_ai_eval_agent ON public.ai_conversation_evaluations (agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX idx_ai_eval_low_score ON public.ai_conversation_evaluations (workspace_id, score) WHERE score < 70;

GRANT SELECT ON public.ai_conversation_evaluations TO authenticated;
GRANT ALL ON public.ai_conversation_evaluations TO service_role;

ALTER TABLE public.ai_conversation_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view evaluations"
ON public.ai_conversation_evaluations FOR SELECT
TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()));

-- AI Safety Alerts: surfaced when evaluations cross thresholds
CREATE TABLE public.ai_safety_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  evaluation_id UUID REFERENCES public.ai_conversation_evaluations(id) ON DELETE CASCADE,
  agent_id UUID,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  alert_type TEXT NOT NULL, -- 'low_score', 'hallucination', 'off_policy', 'price_quote', 'compliance'
  title TEXT NOT NULL,
  detail TEXT,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_alerts_workspace_open ON public.ai_safety_alerts (workspace_id, created_at DESC) WHERE acknowledged_at IS NULL;

GRANT SELECT, UPDATE ON public.ai_safety_alerts TO authenticated;
GRANT ALL ON public.ai_safety_alerts TO service_role;

ALTER TABLE public.ai_safety_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view safety alerts"
ON public.ai_safety_alerts FOR SELECT
TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Workspace owners can acknowledge alerts"
ON public.ai_safety_alerts FOR UPDATE
TO authenticated
USING (
  public.is_workspace_owner(workspace_id, auth.uid())
  OR public.is_platform_admin(auth.uid())
)
WITH CHECK (
  public.is_workspace_owner(workspace_id, auth.uid())
  OR public.is_platform_admin(auth.uid())
);

-- AI Judge Rubrics: per-workspace evaluation rules
CREATE TABLE public.ai_judge_rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE,
  brand_voice_description TEXT NOT NULL DEFAULT 'Friendly, professional, concise. Use plain language. Never make promises about pricing or outcomes not in the catalog.',
  banned_topics TEXT[] NOT NULL DEFAULT ARRAY['medical advice', 'legal advice', 'guaranteed results', 'competitor comparisons'],
  alert_score_threshold INTEGER NOT NULL DEFAULT 70 CHECK (alert_score_threshold BETWEEN 0 AND 100),
  auto_pause_on_critical BOOLEAN NOT NULL DEFAULT false,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.ai_judge_rubrics TO authenticated;
GRANT ALL ON public.ai_judge_rubrics TO service_role;

ALTER TABLE public.ai_judge_rubrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view rubric"
ON public.ai_judge_rubrics FOR SELECT
TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Workspace owners can upsert rubric"
ON public.ai_judge_rubrics FOR INSERT
TO authenticated
WITH CHECK (
  public.is_workspace_owner(workspace_id, auth.uid())
  OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "Workspace owners can update rubric"
ON public.ai_judge_rubrics FOR UPDATE
TO authenticated
USING (
  public.is_workspace_owner(workspace_id, auth.uid())
  OR public.is_platform_admin(auth.uid())
)
WITH CHECK (
  public.is_workspace_owner(workspace_id, auth.uid())
  OR public.is_platform_admin(auth.uid())
);

CREATE TRIGGER trg_ai_judge_rubrics_updated_at
BEFORE UPDATE ON public.ai_judge_rubrics
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
