
CREATE OR REPLACE FUNCTION public.guard_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow admin role for the approved platform owner
  IF NEW.role = 'admin' AND NEW.user_id != '1c391eff-d1bf-415c-ac43-1e64697220eb' THEN
    RAISE EXCEPTION 'Admin role can only be assigned to the platform owner';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_admin_role_guard
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_admin_role();
