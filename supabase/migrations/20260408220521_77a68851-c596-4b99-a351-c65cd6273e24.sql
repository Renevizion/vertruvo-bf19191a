
-- ============================================================
-- 1. FIX workspace_members: Remove dangerous INSERT/UPDATE policies
-- ============================================================
DROP POLICY IF EXISTS "Users can insert their own workspace memberships" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can update their own workspace memberships" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can delete their own workspace memberships" ON public.workspace_members;

CREATE POLICY "Workspace owners or admins can add members"
ON public.workspace_members
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = workspace_members.workspace_id
    AND workspaces.owner_id = auth.uid()
  )
  OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "Workspace owners or admins can update members"
ON public.workspace_members
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = workspace_members.workspace_id
    AND workspaces.owner_id = auth.uid()
  )
  OR public.is_platform_admin(auth.uid())
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = workspace_members.workspace_id
    AND workspaces.owner_id = auth.uid()
  )
  OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "Workspace owners can view all members"
ON public.workspace_members
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = workspace_members.workspace_id
    AND workspaces.owner_id = auth.uid()
  )
  OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "Workspace owners can delete members"
ON public.workspace_members
FOR DELETE TO authenticated
USING (
  (
    EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE workspaces.id = workspace_members.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
    OR public.is_platform_admin(auth.uid())
  )
  AND NOT (
    user_id = auth.uid()
    AND role = 'owner'
  )
);

-- ============================================================
-- 2. FIX Realtime data leak
-- ============================================================
ALTER PUBLICATION supabase_realtime DROP TABLE public.leads;
ALTER PUBLICATION supabase_realtime DROP TABLE public.contacts;
ALTER PUBLICATION supabase_realtime DROP TABLE public.tasks;
ALTER PUBLICATION supabase_realtime DROP TABLE public.activities;

-- ============================================================
-- 3. FIX Storage: Remove overly permissive policies
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can upload to assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can update assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete assets" ON storage.objects;

-- ============================================================
-- 4. FIX Broken RLS on knowledge_bases
-- ============================================================
DROP POLICY IF EXISTS "Users can delete their workspace knowledge_bases" ON public.knowledge_bases;
DROP POLICY IF EXISTS "Users can insert their workspace knowledge_bases" ON public.knowledge_bases;
DROP POLICY IF EXISTS "Users can update their workspace knowledge_bases" ON public.knowledge_bases;
DROP POLICY IF EXISTS "Users can view their workspace knowledge_bases" ON public.knowledge_bases;

-- ============================================================
-- 5. FIX Broken RLS on activities
-- ============================================================
DROP POLICY IF EXISTS "Users can insert their workspace activities" ON public.activities;
DROP POLICY IF EXISTS "Users can view their workspace activities" ON public.activities;

-- ============================================================
-- 6. FIX Functions missing search_path
-- ============================================================
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
 RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_platform_api_configs_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
