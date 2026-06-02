
-- Renewal campaigns table
CREATE TABLE public.renewal_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  source_booking_filter JSONB DEFAULT '{}'::jsonb,
  days_before_end INTEGER NOT NULL DEFAULT 14,
  message_template TEXT,
  voice_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  status TEXT NOT NULL DEFAULT 'draft',
  total_contacts INTEGER DEFAULT 0,
  confirmed_count INTEGER DEFAULT 0,
  declined_count INTEGER DEFAULT 0,
  pending_count INTEGER DEFAULT 0,
  no_response_count INTEGER DEFAULT 0,
  revenue_secured NUMERIC(10,2) DEFAULT 0,
  revenue_at_risk NUMERIC(10,2) DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.renewal_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage renewal campaigns"
  ON public.renewal_campaigns FOR ALL
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE TRIGGER update_renewal_campaigns_updated_at
  BEFORE UPDATE ON public.renewal_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Renewal contacts table
CREATE TABLE public.renewal_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.renewal_campaigns(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  contact_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  program_name TEXT,
  current_schedule TEXT,
  student_notes TEXT,
  outreach_status TEXT NOT NULL DEFAULT 'pending',
  outreach_method TEXT,
  last_contacted_at TIMESTAMPTZ,
  response_notes TEXT,
  card_charged BOOLEAN DEFAULT false,
  charge_amount NUMERIC(10,2),
  new_booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  attempts INTEGER DEFAULT 0,
  next_session_item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.renewal_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage renewal contacts"
  ON public.renewal_contacts FOR ALL
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE TRIGGER update_renewal_contacts_updated_at
  BEFORE UPDATE ON public.renewal_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookups
CREATE INDEX idx_renewal_contacts_campaign ON public.renewal_contacts(campaign_id);
CREATE INDEX idx_renewal_contacts_status ON public.renewal_contacts(outreach_status);
CREATE INDEX idx_renewal_campaigns_workspace ON public.renewal_campaigns(workspace_id);
CREATE INDEX idx_renewal_campaigns_status ON public.renewal_campaigns(status);
