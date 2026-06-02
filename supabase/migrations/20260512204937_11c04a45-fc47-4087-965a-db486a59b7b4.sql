
-- Function: upsert a contact for every lead, scoped to workspace, dedup by email/phone
CREATE OR REPLACE FUNCTION public.sync_lead_to_contact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existing_id uuid;
BEGIN
  IF NEW.workspace_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Try to find an existing contact in the same workspace by email or phone
  SELECT id INTO _existing_id
  FROM public.contacts
  WHERE workspace_id = NEW.workspace_id
    AND (
      (NEW.email IS NOT NULL AND NEW.email <> '' AND lower(email) = lower(NEW.email))
      OR (NEW.phone IS NOT NULL AND NEW.phone <> '' AND regexp_replace(phone, '\D', '', 'g') = regexp_replace(NEW.phone, '\D', '', 'g'))
    )
  LIMIT 1;

  IF _existing_id IS NULL THEN
    INSERT INTO public.contacts (name, email, phone, company, workspace_id)
    VALUES (NEW.name, NEW.email, NEW.phone, NEW.company, NEW.workspace_id);
  ELSE
    UPDATE public.contacts
       SET name    = COALESCE(NULLIF(NEW.name, ''), name),
           email   = COALESCE(NULLIF(NEW.email, ''), email),
           phone   = COALESCE(NULLIF(NEW.phone, ''), phone),
           company = COALESCE(NULLIF(NEW.company, ''), company),
           updated_at = now()
     WHERE id = _existing_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_sync_contact_ins ON public.leads;
CREATE TRIGGER leads_sync_contact_ins
AFTER INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.sync_lead_to_contact();

DROP TRIGGER IF EXISTS leads_sync_contact_upd ON public.leads;
CREATE TRIGGER leads_sync_contact_upd
AFTER UPDATE OF name, email, phone, company ON public.leads
FOR EACH ROW
WHEN (OLD.name IS DISTINCT FROM NEW.name
   OR OLD.email IS DISTINCT FROM NEW.email
   OR OLD.phone IS DISTINCT FROM NEW.phone
   OR OLD.company IS DISTINCT FROM NEW.company)
EXECUTE FUNCTION public.sync_lead_to_contact();

-- Backfill: create contacts for every existing lead that has no matching contact
INSERT INTO public.contacts (name, email, phone, company, workspace_id)
SELECT DISTINCT ON (l.workspace_id, COALESCE(lower(l.email), regexp_replace(COALESCE(l.phone,''), '\D', '', 'g'), l.id::text))
       l.name, l.email, l.phone, l.company, l.workspace_id
FROM public.leads l
WHERE l.workspace_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.workspace_id = l.workspace_id
      AND (
        (l.email IS NOT NULL AND l.email <> '' AND lower(c.email) = lower(l.email))
        OR (l.phone IS NOT NULL AND l.phone <> '' AND regexp_replace(c.phone, '\D', '', 'g') = regexp_replace(l.phone, '\D', '', 'g'))
      )
  );
