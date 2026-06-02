-- Drop ALL workspace_members policies (using exact names)
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'workspace_members') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON workspace_members';
    END LOOP;
END $$;

-- Create simple policies without recursion
CREATE POLICY "Users can view their own workspace memberships"
ON workspace_members FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own workspace memberships"
ON workspace_members FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own workspace memberships"
ON workspace_members FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own workspace memberships"
ON workspace_members FOR DELETE
TO authenticated
USING (user_id = auth.uid());