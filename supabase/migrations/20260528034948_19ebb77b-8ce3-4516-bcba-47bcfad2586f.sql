-- Phase 3: agent handoffs table
CREATE TABLE public.agent_handoffs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES public.ai_agents(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  call_log_id uuid REFERENCES public.call_logs(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'voice',
  reason text NOT NULL,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'pending',
  recap jsonb NOT NULL DEFAULT '[]'::jsonb,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  acknowledged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agent_handoffs_priority_check CHECK (priority IN ('low','normal','high','urgent')),
  CONSTRAINT agent_handoffs_status_check CHECK (status IN ('pending','acknowledged','resolved','returned_to_ai'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_handoffs TO authenticated;
GRANT ALL ON public.agent_handoffs TO service_role;

ALTER TABLE public.agent_handoffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members view handoffs"
  ON public.agent_handoffs FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Workspace members update handoffs"
  ON public.agent_handoffs FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Service inserts handoffs"
  ON public.agent_handoffs FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE INDEX idx_agent_handoffs_workspace_status ON public.agent_handoffs (workspace_id, status, created_at DESC);

CREATE TRIGGER trg_agent_handoffs_updated_at
  BEFORE UPDATE ON public.agent_handoffs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_handoffs;
ALTER TABLE public.agent_handoffs REPLICA IDENTITY FULL;

-- Phase 1: unified contact timeline RPC (on-the-fly union, no new table needed)
CREATE OR REPLACE FUNCTION public.get_contact_timeline(_contact_id uuid, _limit integer DEFAULT 100)
RETURNS TABLE(
  occurred_at timestamptz,
  kind text,
  source text,
  title text,
  summary text,
  ref_table text,
  ref_id uuid,
  payload jsonb
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ws_id uuid;
  _email text;
  _phone text;
  _lead_ids uuid[];
BEGIN
  SELECT workspace_id, email, phone INTO _ws_id, _email, _phone
  FROM public.contacts WHERE id = _contact_id;

  IF _ws_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT public.is_workspace_member(_ws_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Resolve linked lead ids by email/phone/name in same workspace
  SELECT array_agg(id) INTO _lead_ids
  FROM public.leads
  WHERE workspace_id = _ws_id
    AND (
      (_email IS NOT NULL AND _email <> '' AND lower(email) = lower(_email))
      OR (_phone IS NOT NULL AND _phone <> '' AND regexp_replace(phone, '\D', '', 'g') = regexp_replace(_phone, '\D', '', 'g'))
    );

  RETURN QUERY
  WITH events AS (
    -- Activities (notes/tasks)
    SELECT a.created_at AS occurred_at, 'system'::text AS kind, COALESCE(a.type,'note')::text AS source,
           COALESCE(a.title, a.type, 'Activity')::text AS title,
           a.description::text AS summary, 'activities'::text AS ref_table, a.id AS ref_id,
           jsonb_build_object('type', a.type) AS payload
    FROM public.activities a
    WHERE a.contact_id = _contact_id OR (a.lead_id = ANY(_lead_ids))

    UNION ALL
    -- Calls
    SELECT cl.created_at, 'conversation'::text, 'voice'::text,
           ('Call · ' || COALESCE(cl.status,''))::text,
           COALESCE(cl.summary, left(cl.transcript, 240))::text,
           'call_logs'::text, cl.id,
           jsonb_build_object('duration', cl.duration, 'phone', cl.phone_number, 'agent_id', cl.agent_id, 'objective_met', cl.objective_met)
    FROM public.call_logs cl
    WHERE cl.contact_id = _contact_id OR (cl.lead_id = ANY(_lead_ids))

    UNION ALL
    -- Messages via conversations linked to contact
    SELECT m.created_at, 'conversation'::text, m.channel::text,
           (initcap(m.channel) || ' · ' || m.direction)::text,
           left(m.content, 240)::text,
           'messages'::text, m.id,
           jsonb_build_object('direction', m.direction, 'channel', m.channel, 'ai_generated', m.ai_generated)
    FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
    WHERE c.contact_id = _contact_id

    UNION ALL
    -- Form submissions
    SELECT fs.created_at, 'system'::text, 'form'::text,
           'Form submission'::text,
           NULL::text,
           'form_submissions'::text, fs.id,
           jsonb_build_object('form_id', fs.form_id, 'data', fs.data)
    FROM public.form_submissions fs
    WHERE fs.lead_id = ANY(_lead_ids)

    UNION ALL
    -- Bookings
    SELECT b.created_at, 'booking'::text, 'booking'::text,
           ('Booking · ' || b.title)::text,
           ('Status: ' || COALESCE(b.status,'open'))::text,
           'bookings'::text, b.id,
           jsonb_build_object('start_time', b.start_time, 'end_time', b.end_time, 'status', b.status, 'sale_id', b.sale_id)
    FROM public.bookings b
    WHERE b.lead_id = ANY(_lead_ids)

    UNION ALL
    -- Instagram DMs (workspace-level; filter by sender match if available)
    SELECT im.created_at, 'conversation'::text, 'instagram'::text,
           'Instagram message'::text,
           left(im.message_text, 240)::text,
           'instagram_messages'::text, im.id,
           jsonb_build_object('sender_id', im.sender_id)
    FROM public.instagram_messages im
    WHERE im.workspace_id = _ws_id
      AND _phone IS NOT NULL  -- gated; refine when ig identity mapping exists
      AND FALSE  -- disabled until contact<->ig handle mapping exists
  )
  SELECT events.occurred_at, events.kind, events.source, events.title, events.summary, events.ref_table, events.ref_id, events.payload
  FROM events
  ORDER BY events.occurred_at DESC
  LIMIT _limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_contact_timeline(uuid, integer) TO authenticated;