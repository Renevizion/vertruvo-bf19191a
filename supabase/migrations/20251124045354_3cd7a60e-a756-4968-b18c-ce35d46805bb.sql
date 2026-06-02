-- Fix RLS policies for ai_agents to use workspace membership correctly
DROP POLICY IF EXISTS "Users can delete their workspace ai_agents" ON public.ai_agents;
DROP POLICY IF EXISTS "Users can insert their workspace ai_agents" ON public.ai_agents;
DROP POLICY IF EXISTS "Users can update their workspace ai_agents" ON public.ai_agents;
DROP POLICY IF EXISTS "Users can view their workspace ai_agents" ON public.ai_agents;

CREATE POLICY "Users can create agents in their workspace"
ON public.ai_agents
FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM get_user_workspaces(auth.uid())
  )
);

CREATE POLICY "Users can view their workspace agents"
ON public.ai_agents
FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM get_user_workspaces(auth.uid())
  )
);

CREATE POLICY "Users can update their workspace agents"
ON public.ai_agents
FOR UPDATE
USING (
  workspace_id IN (
    SELECT workspace_id FROM get_user_workspaces(auth.uid())
  )
);

CREATE POLICY "Users can delete their workspace agents"
ON public.ai_agents
FOR DELETE
USING (
  workspace_id IN (
    SELECT workspace_id FROM get_user_workspaces(auth.uid())
  )
);

-- Add knowledge_base_id column to ai_agents to link them to knowledge bases
ALTER TABLE public.ai_agents 
ADD COLUMN IF NOT EXISTS knowledge_base_id uuid REFERENCES public.knowledge_bases(id) ON DELETE SET NULL;

-- Add agent_id to call_logs to track which agent handled the call
ALTER TABLE public.call_logs
ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES public.ai_agents(id) ON DELETE SET NULL;