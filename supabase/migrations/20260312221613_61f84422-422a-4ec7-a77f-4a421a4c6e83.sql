
ALTER TABLE public.workspaces 
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_onboarded BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS platform_fee_percent NUMERIC(5,2) DEFAULT 2.50;
