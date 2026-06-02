
-- 1. form_submissions: require form is active
DROP POLICY IF EXISTS "Anyone can submit forms" ON public.form_submissions;
CREATE POLICY "Anyone can submit to active forms"
ON public.form_submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.forms f
    WHERE f.id = form_submissions.form_id AND f.is_active = true
  )
);

-- 2. subscriptions: read-only for owners; revoke direct mutation
DROP POLICY IF EXISTS "Workspace owners can manage subscriptions" ON public.subscriptions;
-- keep existing SELECT policy "Workspace owners can view subscriptions"
REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated, anon;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

-- 3. realtime.messages: restrict channel subscriptions to user's workspaces
-- Topic convention: "workspace:<workspace_id>" or "workspace:<workspace_id>:*"
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can subscribe to own workspace topics" ON realtime.messages;
CREATE POLICY "Authenticated can subscribe to own workspace topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.owner_id = auth.uid()
      AND (
        realtime.topic() = 'workspace:' || w.id::text
        OR realtime.topic() LIKE 'workspace:' || w.id::text || ':%'
      )
  )
  OR EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid()
      AND (
        realtime.topic() = 'workspace:' || wm.workspace_id::text
        OR realtime.topic() LIKE 'workspace:' || wm.workspace_id::text || ':%'
      )
  )
);

DROP POLICY IF EXISTS "Authenticated can broadcast to own workspace topics" ON realtime.messages;
CREATE POLICY "Authenticated can broadcast to own workspace topics"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.owner_id = auth.uid()
      AND (
        realtime.topic() = 'workspace:' || w.id::text
        OR realtime.topic() LIKE 'workspace:' || w.id::text || ':%'
      )
  )
  OR EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid()
      AND (
        realtime.topic() = 'workspace:' || wm.workspace_id::text
        OR realtime.topic() LIKE 'workspace:' || wm.workspace_id::text || ':%'
      )
  )
);
