-- Add admin-granted subscription overrides table
-- This lets you grant tier access to associates without Stripe

CREATE TABLE IF NOT EXISTS public.subscription_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_tier TEXT NOT NULL CHECK (granted_tier IN ('starter', 'professional', 'enterprise')),
  granted_by UUID REFERENCES auth.users(id),
  reason TEXT, -- e.g., "Beta tester", "Partner", "Feedback program"
  expires_at TIMESTAMPTZ, -- NULL means never expires
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id) -- One override per user
);

-- Enable RLS
ALTER TABLE public.subscription_overrides ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage overrides
CREATE POLICY "Admins can manage subscription overrides"
ON public.subscription_overrides
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Index for fast lookups
CREATE INDEX idx_subscription_overrides_user ON public.subscription_overrides(user_id) WHERE is_active = true;

-- Add comment
COMMENT ON TABLE public.subscription_overrides IS 'Admin-granted tier access for associates, partners, and beta testers without requiring Stripe payment';