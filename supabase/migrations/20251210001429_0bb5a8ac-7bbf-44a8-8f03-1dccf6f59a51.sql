-- Fix 1: Update agent_insights context_type check to include 'workspace'
ALTER TABLE public.agent_insights DROP CONSTRAINT IF EXISTS agent_insights_context_type_check;
ALTER TABLE public.agent_insights ADD CONSTRAINT agent_insights_context_type_check 
  CHECK (context_type = ANY (ARRAY['lead'::text, 'contact'::text, 'kpi'::text, 'task'::text, 'conversation'::text, 'sheets'::text, 'workspace'::text]));

-- Fix 2: Update feedback RLS policies to check user_roles table for platform admin
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.feedback;
DROP POLICY IF EXISTS "Admins can update feedback" ON public.feedback;

CREATE POLICY "Platform admins can view all feedback" 
ON public.feedback 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Platform admins can update feedback" 
ON public.feedback 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix 3: Remove forms_public_read policy that lets all users see all active forms
-- Users should only see their own workspace's forms
DROP POLICY IF EXISTS "forms_public_read" ON public.forms;