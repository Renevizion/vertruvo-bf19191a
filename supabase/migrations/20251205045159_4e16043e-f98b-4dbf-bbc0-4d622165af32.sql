-- Create email lists table (separate from pipelines)
CREATE TABLE IF NOT EXISTS public.email_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create email list subscribers junction table
CREATE TABLE IF NOT EXISTS public.email_list_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID REFERENCES public.email_lists(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced')),
  source TEXT, -- e.g., 'form', 'import', 'manual'
  metadata JSONB DEFAULT '{}',
  UNIQUE(list_id, email)
);

-- Enable RLS
ALTER TABLE public.email_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_list_subscribers ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_lists (workspace-scoped)
CREATE POLICY "Users can view own workspace email lists" ON public.email_lists
  FOR SELECT USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "Users can insert own workspace email lists" ON public.email_lists
  FOR INSERT WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "Users can update own workspace email lists" ON public.email_lists
  FOR UPDATE USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "Users can delete own workspace email lists" ON public.email_lists
  FOR DELETE USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- RLS policies for email_list_subscribers (through list ownership)
CREATE POLICY "Users can view subscribers in own lists" ON public.email_list_subscribers
  FOR SELECT USING (list_id IN (
    SELECT id FROM email_lists WHERE workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  ));

CREATE POLICY "Users can insert subscribers in own lists" ON public.email_list_subscribers
  FOR INSERT WITH CHECK (list_id IN (
    SELECT id FROM email_lists WHERE workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  ));

CREATE POLICY "Users can update subscribers in own lists" ON public.email_list_subscribers
  FOR UPDATE USING (list_id IN (
    SELECT id FROM email_lists WHERE workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  ));

CREATE POLICY "Users can delete subscribers in own lists" ON public.email_list_subscribers
  FOR DELETE USING (list_id IN (
    SELECT id FROM email_lists WHERE workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  ));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_lists_workspace ON public.email_lists(workspace_id);
CREATE INDEX IF NOT EXISTS idx_email_list_subscribers_list ON public.email_list_subscribers(list_id);
CREATE INDEX IF NOT EXISTS idx_email_list_subscribers_email ON public.email_list_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_email_list_subscribers_contact ON public.email_list_subscribers(contact_id);

-- Add email_list_ids to email_campaigns to target specific lists
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS target_list_ids UUID[] DEFAULT '{}';

-- Trigger to update updated_at
CREATE OR REPLACE TRIGGER update_email_lists_updated_at
  BEFORE UPDATE ON public.email_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();