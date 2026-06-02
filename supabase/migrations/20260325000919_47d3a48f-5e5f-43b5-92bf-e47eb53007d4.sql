-- Add payment_timing to items (upfront, at_close, free)
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS payment_timing text NOT NULL DEFAULT 'free';

-- Add cancellation_policy_hours to business_settings
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS cancellation_policy_hours integer NOT NULL DEFAULT 24;