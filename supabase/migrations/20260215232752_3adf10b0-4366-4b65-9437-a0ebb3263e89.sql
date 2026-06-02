
-- Create promotions table
CREATE TABLE public.promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed_amount', 'bogo', 'custom')),
  discount_value NUMERIC NOT NULL DEFAULT 0,
  promo_code TEXT,
  item_ids UUID[] DEFAULT '{}',
  applies_to_all_items BOOLEAN DEFAULT false,
  starts_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  terms TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- Workspace-scoped policies
CREATE POLICY "Users can view own workspace promotions"
ON public.promotions FOR SELECT
TO authenticated
USING (workspace_id IN (SELECT public.get_user_workspaces(auth.uid())));

CREATE POLICY "Users can create promotions in own workspace"
ON public.promotions FOR INSERT
TO authenticated
WITH CHECK (workspace_id IN (SELECT public.get_user_workspaces(auth.uid())));

CREATE POLICY "Users can update own workspace promotions"
ON public.promotions FOR UPDATE
TO authenticated
USING (workspace_id IN (SELECT public.get_user_workspaces(auth.uid())));

CREATE POLICY "Users can delete own workspace promotions"
ON public.promotions FOR DELETE
TO authenticated
USING (workspace_id IN (SELECT public.get_user_workspaces(auth.uid())));

-- Trigger for updated_at
CREATE TRIGGER update_promotions_updated_at
BEFORE UPDATE ON public.promotions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for quick lookup of active non-expired promos
CREATE INDEX idx_promotions_active ON public.promotions (workspace_id, is_active) WHERE is_active = true;
