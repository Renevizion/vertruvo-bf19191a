
-- Add policy for platform admins to view all workspaces
CREATE POLICY "Platform admins can view all workspaces"
ON public.workspaces
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role)
);
