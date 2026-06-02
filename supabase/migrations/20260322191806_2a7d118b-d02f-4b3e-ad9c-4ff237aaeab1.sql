-- Update plans to match actual Stripe products
UPDATE public.plans SET name = 'Starter', price_monthly = 60.00, description = 'Perfect for solopreneurs - 500 leads, basic AI, email/SMS campaigns', updated_at = now() WHERE id = 'a522314f-d2bb-4e85-a2b3-dc2ed0fb3816';

UPDATE public.plans SET name = 'Enterprise', price_monthly = 320.00, description = 'Unlimited leads, premium AI, AI voice calling, white-label, dedicated support', updated_at = now() WHERE id = 'f7d8d6ab-e7b8-4e44-88b4-cc6497b5a905';

-- Add Professional plan (currently missing)
INSERT INTO public.plans (id, name, description, price_monthly, is_active, trial_days)
VALUES (gen_random_uuid(), 'Professional', 'For growing businesses - 2500 leads, advanced AI, unlimited pipelines, API access', 140.00, true, 14)
ON CONFLICT DO NOTHING;

-- Add stripe_product_id and stripe_price_id columns to plans for mapping
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS stripe_product_id text;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS stripe_price_id text;

-- Map Stripe IDs to plans
UPDATE public.plans SET stripe_product_id = 'prod_TWJsiTC1NjHYNA', stripe_price_id = 'price_1SZHF99Rb4IZsqBDwjN98vzj' WHERE name = 'Starter';
UPDATE public.plans SET stripe_product_id = 'prod_TWJtzGu8NtKoOR', stripe_price_id = 'price_1SZHFN9Rb4IZsqBDaeV4d15Q' WHERE name = 'Professional';
UPDATE public.plans SET stripe_product_id = 'prod_TWJuL45k95WeVZ', stripe_price_id = 'price_1SZHGN9Rb4IZsqBDmT5yNY8j' WHERE name = 'Enterprise';