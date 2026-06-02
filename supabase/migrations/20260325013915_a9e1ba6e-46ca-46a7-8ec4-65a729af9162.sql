CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _initial_role public.app_role;
BEGIN
  _initial_role := CASE
    WHEN COALESCE(NEW.raw_user_meta_data->>'account_type', '') = 'customer' THEN 'customer'::public.app_role
    ELSE 'user'::public.app_role
  END;

  -- Insert role first so downstream profile triggers can make role-based decisions.
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _initial_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.profiles (id, first_name, last_name, email, business_name, onboarding_completed)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.email,
    NEW.raw_user_meta_data->>'business_name',
    CASE WHEN _initial_role = 'customer'::public.app_role THEN true ELSE false END
  );

  RETURN NEW;
END;
$function$;