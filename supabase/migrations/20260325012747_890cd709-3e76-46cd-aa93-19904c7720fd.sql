-- Fix handle_new_user: don't assign 'user' role if created via admin API with customer intent
-- The edge function handles role assignment separately
-- No change needed here — the trigger always assigns 'user', 
-- but we need ensure_user_workspace to NOT create a workspace for customers

CREATE OR REPLACE FUNCTION public.ensure_user_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Skip workspace creation for customer-role users
  -- Customer accounts are created by the create-customer-account edge function
  -- which assigns 'customer' role. Check if this user already has a customer role.
  IF EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = NEW.id AND role = 'customer'
  ) THEN
    RETURN NEW;
  END IF;

  -- Create a default workspace for the user if they don't have one
  IF NOT EXISTS (
    SELECT 1 FROM public.workspaces WHERE owner_id = NEW.id
  ) THEN
    INSERT INTO public.workspaces (owner_id, name)
    VALUES (NEW.id, COALESCE(NEW.business_name, NEW.first_name || '''s Workspace', 'My Workspace'));
    
    -- Add user as owner in workspace_members
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    SELECT id, NEW.id, 'owner'
    FROM public.workspaces
    WHERE owner_id = NEW.id
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$function$;