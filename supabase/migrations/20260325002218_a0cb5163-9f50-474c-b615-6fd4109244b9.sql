
-- =====================================================
-- FIX 1: Security-definer function for public booking
-- Returns ONLY what the public booking page needs
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_public_booking_data(_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  ws_id uuid;
BEGIN
  -- Get workspace ID from slug
  SELECT id INTO ws_id FROM public.workspaces WHERE slug = _slug LIMIT 1;
  IF ws_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'workspace', jsonb_build_object('id', w.id, 'name', w.name),
    'settings', (
      SELECT jsonb_build_object(
        'business_name', bs.business_name,
        'business_phone', bs.business_phone,
        'logo_url', bs.logo_url,
        'city', bs.city,
        'state_province', bs.state_province,
        'business_category', bs.business_category,
        'cancellation_policy_hours', bs.cancellation_policy_hours
      )
      FROM public.business_settings bs WHERE bs.workspace_id = ws_id LIMIT 1
    ),
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', i.id, 'title', i.title, 'description', i.description,
        'price', i.price, 'item_type', i.item_type,
        'payment_timing', i.payment_timing, 'duration_minutes', i.duration_minutes
      ))
      FROM public.items i 
      WHERE i.workspace_id = ws_id AND i.is_active = true 
      AND i.item_type IN ('service', 'membership', 'camp')
    ), '[]'::jsonb),
    'resources', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name))
      FROM public.resources r
      WHERE r.workspace_id = ws_id AND r.is_active = true
    ), '[]'::jsonb)
  ) INTO result
  FROM public.workspaces w WHERE w.id = ws_id;

  RETURN result;
END;
$$;

-- Grant anon execute on the function
GRANT EXECUTE ON FUNCTION public.get_public_booking_data(text) TO anon;

-- Function to get booking slots (only times, no PII)
CREATE OR REPLACE FUNCTION public.get_public_booking_slots(_workspace_id uuid, _date date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'start_time', b.start_time,
      'end_time', b.end_time,
      'resource_id', b.resource_id
    ))
    FROM public.bookings b
    WHERE b.workspace_id = _workspace_id
    AND b.start_time >= _date::timestamptz
    AND b.start_time < (_date + interval '1 day')::timestamptz
    AND b.status != 'cancelled'
  ), '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_booking_slots(uuid, date) TO anon;

-- =====================================================
-- FIX 2: Remove overly permissive anon SELECT policies
-- =====================================================

DROP POLICY IF EXISTS "Public can read bookings by workspace" ON public.bookings;
DROP POLICY IF EXISTS "Public can read business_settings" ON public.business_settings;
DROP POLICY IF EXISTS "Public can read workspaces by slug" ON public.workspaces;
DROP POLICY IF EXISTS "Public can read items by workspace" ON public.items;
DROP POLICY IF EXISTS "Public can read resources by workspace" ON public.resources;

-- Keep the anon INSERT policies for bookings/leads (needed for free booking flow)
-- Those are already scoped by workspace_id

-- =====================================================
-- FIX 3: workspace_members INSERT privilege escalation
-- =====================================================

DROP POLICY IF EXISTS "Users can insert their own membership" ON public.workspace_members;

-- Only workspace owners can add members
CREATE POLICY "Only workspace owners can add members"
ON public.workspace_members FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspaces 
    WHERE id = workspace_id AND owner_id = auth.uid()
  )
  OR
  -- Or the system (service role) is adding via invitation flow
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.workspace_members wm 
    WHERE wm.workspace_id = workspace_members.workspace_id
  ) = false
);
