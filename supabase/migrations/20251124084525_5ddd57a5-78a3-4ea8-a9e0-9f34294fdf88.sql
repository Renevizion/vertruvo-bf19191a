-- Fix function search path for security
DROP TRIGGER IF EXISTS webhook_configs_updated_at ON public.webhook_configs;
DROP FUNCTION IF EXISTS public.update_webhook_updated_at();

CREATE OR REPLACE FUNCTION public.update_webhook_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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