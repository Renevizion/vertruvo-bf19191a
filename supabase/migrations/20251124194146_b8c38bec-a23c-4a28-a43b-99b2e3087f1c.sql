-- Create email campaigns table
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT,
  content TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email campaign metrics table
CREATE TABLE IF NOT EXISTS public.email_campaign_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  total_sent INTEGER NOT NULL DEFAULT 0,
  total_delivered INTEGER NOT NULL DEFAULT 0,
  total_opened INTEGER NOT NULL DEFAULT 0,
  total_clicked INTEGER NOT NULL DEFAULT 0,
  total_bounced INTEGER NOT NULL DEFAULT 0,
  total_unsubscribed INTEGER NOT NULL DEFAULT 0,
  unique_opens INTEGER NOT NULL DEFAULT 0,
  unique_clicks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaign_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_campaigns
CREATE POLICY "Users can view their workspace campaigns"
  ON public.email_campaigns FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM get_user_workspaces(auth.uid())));

CREATE POLICY "Users can create campaigns in their workspace"
  ON public.email_campaigns FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM get_user_workspaces(auth.uid())));

CREATE POLICY "Users can update their workspace campaigns"
  ON public.email_campaigns FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM get_user_workspaces(auth.uid())));

CREATE POLICY "Users can delete their workspace campaigns"
  ON public.email_campaigns FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM get_user_workspaces(auth.uid())));

-- RLS Policies for email_campaign_metrics
CREATE POLICY "Users can view metrics for their workspace campaigns"
  ON public.email_campaign_metrics FOR SELECT
  USING (campaign_id IN (
    SELECT id FROM public.email_campaigns 
    WHERE workspace_id IN (SELECT workspace_id FROM get_user_workspaces(auth.uid()))
  ));

CREATE POLICY "System can manage campaign metrics"
  ON public.email_campaign_metrics FOR ALL
  USING (true);

-- Create updated_at trigger for email_campaigns
CREATE TRIGGER update_email_campaigns_updated_at
  BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for email_campaign_metrics
CREATE TRIGGER update_email_campaign_metrics_updated_at
  BEFORE UPDATE ON public.email_campaign_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();