
CREATE TABLE public.duplicate_ignores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  table_name TEXT NOT NULL CHECK (table_name IN ('contacts','leads')),
  fingerprint TEXT NOT NULL,
  record_ids UUID[] NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, table_name, fingerprint)
);

CREATE INDEX idx_duplicate_ignores_ws ON public.duplicate_ignores (workspace_id, table_name);

ALTER TABLE public.duplicate_ignores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members view ignores"
ON public.duplicate_ignores FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Workspace members create ignores"
ON public.duplicate_ignores FOR INSERT TO authenticated
WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Workspace members delete ignores"
ON public.duplicate_ignores FOR DELETE TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()));
