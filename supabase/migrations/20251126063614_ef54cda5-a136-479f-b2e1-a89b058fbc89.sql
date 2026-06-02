-- Break circular dependency between workspaces and workspace_members

-- Step 1: Simplify workspace_members to have NO subqueries at all
DROP POLICY IF EXISTS "Users can view own membership" ON workspace_members;
DROP POLICY IF EXISTS "Workspace owners can view all members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace owners can manage members" ON workspace_members;

-- Only allow users to see their own memberships - no subqueries
CREATE POLICY "Users can view own membership"
  ON workspace_members FOR SELECT
  USING (user_id = auth.uid());

-- Step 2: Simplify workspaces policy to NOT reference workspace_members
DROP POLICY IF EXISTS "Users can view their workspaces" ON workspaces;

-- Only check owner_id directly - don't query workspace_members
CREATE POLICY "Owners can view their workspaces"
  ON workspaces FOR SELECT
  USING (owner_id = auth.uid());

-- Step 3: The get_user_workspaces function will handle combining both sources
-- This function is SECURITY DEFINER so it bypasses RLS
-- It's already defined and working correctly