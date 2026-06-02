-- Fix search_path for cleanup function
DROP FUNCTION IF EXISTS public.cleanup_expired_deleted_leads();

CREATE OR REPLACE FUNCTION public.cleanup_expired_deleted_leads()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.deleted_leads
  WHERE expires_at < now();
END;
$$;