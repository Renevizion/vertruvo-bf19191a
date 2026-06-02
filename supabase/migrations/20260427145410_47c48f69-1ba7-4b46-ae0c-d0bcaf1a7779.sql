CREATE OR REPLACE FUNCTION public.guard_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow admin role for the approved platform owner account.
  IF NEW.role = 'admin' AND NEW.user_id != 'c12d1cc0-097b-4634-accd-03874e78f53d' THEN
    RAISE EXCEPTION 'Admin role can only be assigned to the platform owner';
  END IF;
  RETURN NEW;
END;
$function$;

DELETE FROM public.user_roles
WHERE role = 'admin'
  AND user_id != 'c12d1cc0-097b-4634-accd-03874e78f53d';

INSERT INTO public.user_roles (user_id, role)
VALUES ('c12d1cc0-097b-4634-accd-03874e78f53d', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
VALUES ('c12d1cc0-097b-4634-accd-03874e78f53d', 'owner')
ON CONFLICT (user_id, role) DO NOTHING;