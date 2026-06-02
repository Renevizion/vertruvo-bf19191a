CREATE TABLE IF NOT EXISTS public.shell_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,
  user_id UUID,
  shell TEXT NOT NULL,
  viewer_role TEXT,
  capability_key TEXT,
  status TEXT NOT NULL DEFAULT 'ok',
  latency_ms INTEGER,
  error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shell_telemetry_workspace ON public.shell_telemetry(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shell_telemetry_shell ON public.shell_telemetry(shell, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shell_telemetry_capability ON public.shell_telemetry(capability_key, created_at DESC);

ALTER TABLE public.shell_telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members insert workspace telemetry"
  ON public.shell_telemetry FOR INSERT
  WITH CHECK (
    workspace_id IS NULL
    OR public.is_workspace_member(workspace_id, auth.uid())
  );

CREATE POLICY "Members read workspace telemetry"
  ON public.shell_telemetry FOR SELECT
  USING (
    workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id, auth.uid())
  );

CREATE POLICY "Platform owner reads all telemetry"
  ON public.shell_telemetry FOR SELECT
  USING (auth.uid() = '1c391eff-d1bf-415c-ac43-1e64697220eb'::uuid);