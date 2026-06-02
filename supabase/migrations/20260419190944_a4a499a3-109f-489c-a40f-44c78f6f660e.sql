
-- ============================================
-- 1. Add last_contacted_at to leads for inactivity filtering
-- ============================================
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_leads_last_contacted_at 
  ON public.leads(workspace_id, last_contacted_at);

-- Backfill from existing activities
UPDATE public.leads l
SET last_contacted_at = sub.last_at
FROM (
  SELECT lead_id, MAX(created_at) AS last_at
  FROM public.activities
  WHERE lead_id IS NOT NULL
  GROUP BY lead_id
) sub
WHERE l.id = sub.lead_id AND l.last_contacted_at IS NULL;

-- Trigger to keep last_contacted_at fresh
CREATE OR REPLACE FUNCTION public.touch_lead_last_contacted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.lead_id IS NOT NULL THEN
    UPDATE public.leads
       SET last_contacted_at = GREATEST(COALESCE(last_contacted_at, '1970-01-01'::timestamptz), NEW.created_at)
     WHERE id = NEW.lead_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_activities_touch_lead ON public.activities;
CREATE TRIGGER trg_activities_touch_lead
AFTER INSERT ON public.activities
FOR EACH ROW EXECUTE FUNCTION public.touch_lead_last_contacted();

DROP TRIGGER IF EXISTS trg_call_logs_touch_lead ON public.call_logs;
CREATE TRIGGER trg_call_logs_touch_lead
AFTER INSERT ON public.call_logs
FOR EACH ROW EXECUTE FUNCTION public.touch_lead_last_contacted();

-- ============================================
-- 2. outreach_campaigns
-- ============================================
CREATE TABLE IF NOT EXISTS public.outreach_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID,
  name TEXT NOT NULL,
  objective TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  -- sequence: [{channel:'voice'|'voicemail'|'sms'|'email', delay_hours:number, template?:string}]
  sequence JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- filter: {mode:'inactivity'|'stage'|'date_range'|'manual', days?:number, stage_ids?:[uuid], from?:date, to?:date, lead_ids?:[uuid]}
  filter_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- booking_mode: 'auto_book' | 'pending_request' | 'hybrid' | 'none'
  booking_mode TEXT NOT NULL DEFAULT 'hybrid',
  max_calls INTEGER NOT NULL DEFAULT 50,
  estimated_cost_usd NUMERIC(10,2) DEFAULT 0,
  total_leads INTEGER DEFAULT 0,
  responded_count INTEGER DEFAULT 0,
  booked_count INTEGER DEFAULT 0,
  completed_count INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.outreach_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members view campaigns" ON public.outreach_campaigns
  FOR SELECT USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "members create campaigns" ON public.outreach_campaigns
  FOR INSERT WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "members update campaigns" ON public.outreach_campaigns
  FOR UPDATE USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "members delete campaigns" ON public.outreach_campaigns
  FOR DELETE USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE TRIGGER trg_outreach_campaigns_updated
BEFORE UPDATE ON public.outreach_campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_outreach_campaigns_workspace ON public.outreach_campaigns(workspace_id, status);

-- ============================================
-- 3. outreach_campaign_leads
-- ============================================
CREATE TABLE IF NOT EXISTS public.outreach_campaign_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.outreach_campaigns(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 0,
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active', -- active | responded | booked | completed | opted_out | failed
  last_channel TEXT,
  last_outcome TEXT,
  sms_sent INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  calls_made INTEGER DEFAULT 0,
  voicemails_dropped INTEGER DEFAULT 0,
  responded_at TIMESTAMPTZ,
  booked_at TIMESTAMPTZ,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, lead_id)
);

ALTER TABLE public.outreach_campaign_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members view campaign leads" ON public.outreach_campaign_leads
  FOR SELECT USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "members manage campaign leads" ON public.outreach_campaign_leads
  FOR ALL USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE TRIGGER trg_outreach_campaign_leads_updated
BEFORE UPDATE ON public.outreach_campaign_leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_ocl_campaign ON public.outreach_campaign_leads(campaign_id, status);
CREATE INDEX idx_ocl_next_run ON public.outreach_campaign_leads(next_run_at) WHERE status = 'active';

-- ============================================
-- 4. outreach_step_logs
-- ============================================
CREATE TABLE IF NOT EXISTS public.outreach_step_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.outreach_campaigns(id) ON DELETE CASCADE,
  campaign_lead_id UUID NOT NULL REFERENCES public.outreach_campaign_leads(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL,
  channel TEXT NOT NULL, -- voice | voicemail | sms | email
  status TEXT NOT NULL, -- success | failed | skipped
  external_id TEXT, -- twilio message/call SID, resend email id
  error TEXT,
  cost_usd NUMERIC(10,4),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.outreach_step_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members view step logs" ON public.outreach_step_logs
  FOR SELECT USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE INDEX idx_osl_campaign ON public.outreach_step_logs(campaign_id, created_at DESC);
CREATE INDEX idx_osl_lead ON public.outreach_step_logs(lead_id, created_at DESC);
