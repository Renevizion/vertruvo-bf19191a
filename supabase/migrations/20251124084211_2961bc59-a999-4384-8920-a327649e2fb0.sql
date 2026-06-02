-- Enhanced Audit Logs Table (expanding activities table)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamptz NOT NULL DEFAULT now(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  changes jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Webhook Configurations Table
CREATE TABLE IF NOT EXISTS public.webhook_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  secret text,
  events text[] NOT NULL DEFAULT '{}',
  is_active boolean DEFAULT true,
  retry_config jsonb DEFAULT '{"max_retries": 3, "backoff": "exponential"}'::jsonb,
  headers jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Webhook Logs Table
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid REFERENCES public.webhook_configs(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  response_status integer,
  response_body text,
  error text,
  attempt_number integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- System Monitoring Table
CREATE TABLE IF NOT EXISTS public.system_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type text NOT NULL,
  metric_value numeric NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  recorded_at timestamptz DEFAULT now()
);

-- Platform Admin Configuration
CREATE TABLE IF NOT EXISTS public.platform_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

-- Audit Logs Policies
CREATE POLICY "Platform admins can view all audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner'));

CREATE POLICY "Users can view their workspace audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM get_user_workspaces(auth.uid())));

CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Webhook Configs Policies
CREATE POLICY "Platform admins can manage all webhooks"
  ON public.webhook_configs FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner'));

CREATE POLICY "Users can manage their workspace webhooks"
  ON public.webhook_configs FOR ALL
  TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM get_user_workspaces(auth.uid())));

-- Webhook Logs Policies
CREATE POLICY "Platform admins can view all webhook logs"
  ON public.webhook_logs FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.webhook_configs wc
    WHERE wc.id = webhook_logs.webhook_id
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner'))
  ));

CREATE POLICY "Users can view their workspace webhook logs"
  ON public.webhook_logs FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.webhook_configs wc
    WHERE wc.id = webhook_logs.webhook_id
    AND wc.workspace_id IN (SELECT workspace_id FROM get_user_workspaces(auth.uid()))
  ));

-- System Metrics Policies
CREATE POLICY "Platform admins can view system metrics"
  ON public.system_metrics FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner'));

CREATE POLICY "System can insert metrics"
  ON public.system_metrics FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner'));

-- Platform Config Policies
CREATE POLICY "Platform admins can manage config"
  ON public.platform_config FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner'));

-- Indexes for performance
CREATE INDEX idx_audit_logs_workspace ON public.audit_logs(workspace_id);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity, entity_id);
CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX idx_webhook_configs_workspace ON public.webhook_configs(workspace_id);
CREATE INDEX idx_webhook_logs_webhook ON public.webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_created ON public.webhook_logs(created_at DESC);
CREATE INDEX idx_system_metrics_type ON public.system_metrics(metric_type, recorded_at DESC);

-- Function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _workspace_id uuid,
  _action text,
  _entity text,
  _entity_id text,
  _changes jsonb DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _log_id uuid;
BEGIN
  INSERT INTO public.audit_logs (
    workspace_id,
    user_id,
    action,
    entity,
    entity_id,
    changes,
    metadata
  ) VALUES (
    _workspace_id,
    auth.uid(),
    _action,
    _entity,
    _entity_id,
    _changes,
    _metadata
  )
  RETURNING id INTO _log_id;
  
  RETURN _log_id;
END;
$$;

-- Trigger to update webhook_configs updated_at
CREATE OR REPLACE FUNCTION public.update_webhook_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER webhook_configs_updated_at
  BEFORE UPDATE ON public.webhook_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_webhook_updated_at();