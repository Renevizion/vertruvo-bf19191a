-- COMPREHENSIVE SECURITY FIX: Add RLS policies to ALL sensitive tables

-- 1. CONTACTS table - Workspace member access only
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage workspace contacts" ON public.contacts;
CREATE POLICY "Users can manage workspace contacts" ON public.contacts
FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- 2. LEADS table - Workspace member access only  
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage workspace leads" ON public.leads;
CREATE POLICY "Users can manage workspace leads" ON public.leads
FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- 3. SOCIAL_MEDIA_ACCOUNTS table - User's own accounts only
ALTER TABLE public.social_media_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own social accounts" ON public.social_media_accounts;
CREATE POLICY "Users can manage own social accounts" ON public.social_media_accounts
FOR ALL USING (user_id = auth.uid());

-- 4. SUBSCRIPTIONS table - Workspace owner only
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Workspace owners can view subscriptions" ON public.subscriptions;
CREATE POLICY "Workspace owners can view subscriptions" ON public.subscriptions
FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- 5. CALL_LOGS table - Workspace member access only
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage workspace call logs" ON public.call_logs;
CREATE POLICY "Users can manage workspace call logs" ON public.call_logs
FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- 6. CONVERSATIONS table - Workspace member access only
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage workspace conversations" ON public.conversations;
CREATE POLICY "Users can manage workspace conversations" ON public.conversations
FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- 7. MESSAGES table - Access via conversation ownership
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage conversation messages" ON public.messages;
CREATE POLICY "Users can manage conversation messages" ON public.messages
FOR ALL USING (
  conversation_id IN (
    SELECT id FROM conversations 
    WHERE workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  )
);

-- 8. WEBHOOK_CONFIGS table - Already fixed but ensure policy exists
ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;

-- 9. AI_AGENTS table - Workspace member access only
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage workspace agents" ON public.ai_agents;
CREATE POLICY "Users can manage workspace agents" ON public.ai_agents
FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- 10. WORKFLOWS table - Workspace member access only
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage workspace workflows" ON public.workflows;
CREATE POLICY "Users can manage workspace workflows" ON public.workflows
FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- 11. EMAIL_CAMPAIGNS table - Workspace member access only
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage workspace campaigns" ON public.email_campaigns;
CREATE POLICY "Users can manage workspace campaigns" ON public.email_campaigns
FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- 12. KNOWLEDGE_BASES table - Workspace member access only
ALTER TABLE public.knowledge_bases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage workspace knowledge bases" ON public.knowledge_bases;
CREATE POLICY "Users can manage workspace knowledge bases" ON public.knowledge_bases
FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- 13. TASKS table - Workspace member access only  
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage workspace tasks" ON public.tasks;
CREATE POLICY "Users can manage workspace tasks" ON public.tasks
FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- 14. ACTIVITIES table - Workspace member access only
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage workspace activities" ON public.activities;
CREATE POLICY "Users can manage workspace activities" ON public.activities
FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- 15. PIPELINES table - Workspace member access only
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage workspace pipelines" ON public.pipelines;
CREATE POLICY "Users can manage workspace pipelines" ON public.pipelines
FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- 16. FORMS table - Workspace member access (but public read for active forms)
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage workspace forms" ON public.forms;
DROP POLICY IF EXISTS "Anyone can read active forms" ON public.forms;
CREATE POLICY "Users can manage workspace forms" ON public.forms
FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "Anyone can read active forms" ON public.forms
FOR SELECT USING (is_active = true);

-- 17. AGENT_MEMORY table - Workspace member access only
ALTER TABLE public.agent_memory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage workspace agent memory" ON public.agent_memory;
CREATE POLICY "Users can manage workspace agent memory" ON public.agent_memory
FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- 18. AGENT_INSIGHTS table - Workspace member access only
ALTER TABLE public.agent_insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage workspace insights" ON public.agent_insights;
CREATE POLICY "Users can manage workspace insights" ON public.agent_insights
FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- 19. CONTENT_POSTS table - Workspace member access only
ALTER TABLE public.content_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage workspace content" ON public.content_posts;
CREATE POLICY "Users can manage workspace content" ON public.content_posts
FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- 20. AUDIT_LOGS table - Workspace owner only
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Workspace owners can view audit logs" ON public.audit_logs;
CREATE POLICY "Workspace owners can view audit logs" ON public.audit_logs
FOR SELECT USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));