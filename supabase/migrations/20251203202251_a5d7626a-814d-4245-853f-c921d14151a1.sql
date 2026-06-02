-- Phase 1: Critical Security Fixes

-- 1. Fix google_sheet_integrations RLS - Remove dangerous "Allow all operations" policy
DROP POLICY IF EXISTS "Allow all operations" ON public.google_sheet_integrations;

-- Create proper user_id-based policies for google_sheet_integrations
CREATE POLICY "Users can view own integrations" ON public.google_sheet_integrations
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own integrations" ON public.google_sheet_integrations
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own integrations" ON public.google_sheet_integrations
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own integrations" ON public.google_sheet_integrations
FOR DELETE USING (user_id = auth.uid());

-- 2. Fix deleted_leads RLS - Remove dangerous "Allow all operations" policy
DROP POLICY IF EXISTS "Allow all operations" ON public.deleted_leads;

-- Add workspace_id column if it doesn't exist (for proper scoping)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'deleted_leads' 
    AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE public.deleted_leads ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id);
  END IF;
END $$;

-- Create workspace-owner-only policies for deleted_leads
CREATE POLICY "Workspace owners can view deleted leads" ON public.deleted_leads
FOR SELECT USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "Workspace owners can insert deleted leads" ON public.deleted_leads
FOR INSERT WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "Workspace owners can update deleted leads" ON public.deleted_leads
FOR UPDATE USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "Workspace owners can delete deleted leads" ON public.deleted_leads
FOR DELETE USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- 3. Tighten profiles RLS - Users should only see their own profile
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (id = auth.uid());

-- 4. Tighten webhook_configs - Owner/admin only for secrets
DROP POLICY IF EXISTS "Users can view workspace webhook configs" ON public.webhook_configs;
DROP POLICY IF EXISTS "Users can insert workspace webhook configs" ON public.webhook_configs;
DROP POLICY IF EXISTS "Users can update workspace webhook configs" ON public.webhook_configs;
DROP POLICY IF EXISTS "Users can delete workspace webhook configs" ON public.webhook_configs;

CREATE POLICY "Workspace owners can manage webhook configs" ON public.webhook_configs
FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- 5. Tighten twilio_phone_numbers - Owner only
DROP POLICY IF EXISTS "Users can manage workspace phone numbers" ON public.twilio_phone_numbers;

CREATE POLICY "Workspace owners can manage phone numbers" ON public.twilio_phone_numbers
FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- 6. Tighten business_settings - Owner only  
DROP POLICY IF EXISTS "Users can view workspace business settings" ON public.business_settings;
DROP POLICY IF EXISTS "Users can update workspace business settings" ON public.business_settings;
DROP POLICY IF EXISTS "Users can insert workspace business settings" ON public.business_settings;

CREATE POLICY "Workspace owners can manage business settings" ON public.business_settings
FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));