
CREATE OR REPLACE FUNCTION public.enforce_lead_plan_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tier text;
  _limit int;
  _count int;
  _owner uuid;
BEGIN
  IF NEW.workspace_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT owner_id INTO _owner FROM public.workspaces WHERE id = NEW.workspace_id;
  -- Hard-locked platform admin bypasses all limits
  IF _owner = '1c391eff-d1bf-415c-ac43-1e64697220eb'::uuid
     OR public.is_platform_admin(_owner) THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(s.plan_id, 'free') INTO _tier
  FROM public.subscriptions s
  WHERE s.workspace_id = NEW.workspace_id
    AND s.status IN ('active','trial')
  ORDER BY s.created_at DESC
  LIMIT 1;

  _tier := COALESCE(_tier, 'free');

  _limit := CASE _tier
    WHEN 'free'         THEN 25
    WHEN 'starter'      THEN 500
    WHEN 'professional' THEN 2500
    WHEN 'enterprise'   THEN -1
    ELSE 25
  END;

  IF _limit = -1 THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO _count
  FROM public.leads
  WHERE workspace_id = NEW.workspace_id;

  IF _count >= _limit THEN
    RAISE EXCEPTION 'Lead limit reached for % plan (% of % used). Upgrade to add more leads.', _tier, _count, _limit
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_lead_plan_limit_trg ON public.leads;
CREATE TRIGGER enforce_lead_plan_limit_trg
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_lead_plan_limit();
