-- Per-class roster with renewal status, source of truth for "who's in this class and what are they doing next period"
CREATE TYPE public.roster_status AS ENUM ('pending', 'renewing', 'moving', 'not_renewing', 'waitlist');

CREATE TABLE public.program_rosters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  source_booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  period_label text NOT NULL DEFAULT 'Current',
  contact_name text NOT NULL,
  contact_email text,
  contact_phone text,
  status public.roster_status NOT NULL DEFAULT 'pending',
  notes text,
  status_updated_at timestamptz,
  status_updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX program_rosters_unique_enrollee
  ON public.program_rosters (workspace_id, item_id, period_label, COALESCE(lead_id::text, contact_email, contact_phone, contact_name));

CREATE INDEX program_rosters_workspace_item_idx ON public.program_rosters (workspace_id, item_id, period_label);

ALTER TABLE public.program_rosters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view rosters"
  ON public.program_rosters FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Workspace members can insert rosters"
  ON public.program_rosters FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Workspace members can update rosters"
  ON public.program_rosters FOR UPDATE
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Workspace members can delete rosters"
  ON public.program_rosters FOR DELETE
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE TRIGGER program_rosters_updated_at
  BEFORE UPDATE ON public.program_rosters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Track who/when changed status
CREATE OR REPLACE FUNCTION public.touch_roster_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_updated_at = now();
    NEW.status_updated_by = auth.uid();
  ELSIF TG_OP = 'INSERT' AND NEW.status IS DISTINCT FROM 'pending'::public.roster_status THEN
    NEW.status_updated_at = COALESCE(NEW.status_updated_at, now());
    NEW.status_updated_by = COALESCE(NEW.status_updated_by, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER program_rosters_touch_status
  BEFORE INSERT OR UPDATE ON public.program_rosters
  FOR EACH ROW EXECUTE FUNCTION public.touch_roster_status();

-- Sync from bookings: pulls all leads booked into an item within an optional date window into the roster
CREATE OR REPLACE FUNCTION public.sync_program_roster_from_bookings(
  _workspace_id uuid,
  _item_id uuid,
  _period_label text,
  _from timestamptz DEFAULT NULL,
  _to timestamptz DEFAULT NULL
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _added integer := 0;
BEGIN
  IF NOT public.is_workspace_member(_workspace_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not a workspace member';
  END IF;

  WITH candidates AS (
    SELECT DISTINCT ON (b.lead_id)
      b.lead_id, b.id AS booking_id, l.name, l.email, l.phone
    FROM public.bookings b
    JOIN public.leads l ON l.id = b.lead_id
    WHERE b.workspace_id = _workspace_id
      AND b.item_id = _item_id
      AND b.status <> 'cancelled'
      AND b.lead_id IS NOT NULL
      AND (_from IS NULL OR b.start_time >= _from)
      AND (_to   IS NULL OR b.start_time <= _to)
    ORDER BY b.lead_id, b.start_time DESC
  )
  INSERT INTO public.program_rosters (
    workspace_id, item_id, lead_id, source_booking_id, period_label,
    contact_name, contact_email, contact_phone, status
  )
  SELECT _workspace_id, _item_id, c.lead_id, c.booking_id, _period_label,
         COALESCE(c.name, 'Unknown'), c.email, c.phone, 'pending'
  FROM candidates c
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS _added = ROW_COUNT;
  RETURN _added;
END;
$$;