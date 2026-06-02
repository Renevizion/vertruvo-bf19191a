-- Create table for tracking inbound email replies
CREATE TABLE IF NOT EXISTS public.inbound_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_email TEXT NOT NULL,
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  reply_token TEXT UNIQUE,
  original_message_id TEXT,
  resend_email_id TEXT,
  status TEXT DEFAULT 'received',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for fast lookup by reply token
CREATE INDEX idx_inbound_emails_reply_token ON public.inbound_emails(reply_token);
CREATE INDEX idx_inbound_emails_workspace ON public.inbound_emails(workspace_id);
CREATE INDEX idx_inbound_emails_conversation ON public.inbound_emails(conversation_id);

-- Enable RLS
ALTER TABLE public.inbound_emails ENABLE ROW LEVEL SECURITY;

-- RLS policies for workspace-scoped access
CREATE POLICY "Users can view inbound emails in their workspace"
  ON public.inbound_emails FOR SELECT
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "Users can insert inbound emails in their workspace"
  ON public.inbound_emails FOR INSERT
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- Allow service role to insert (for webhook)
CREATE POLICY "Service role can insert inbound emails"
  ON public.inbound_emails FOR INSERT
  WITH CHECK (true);

-- Add reply_to_token column to messages table for tracking which messages get replies
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_token TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS resend_email_id TEXT;

-- Create index for reply token lookup on messages
CREATE INDEX IF NOT EXISTS idx_messages_reply_token ON public.messages(reply_token);