-- Add 'customer' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'customer';

-- Add customer_user_id to leads table to link a lead to their customer auth account
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS customer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;