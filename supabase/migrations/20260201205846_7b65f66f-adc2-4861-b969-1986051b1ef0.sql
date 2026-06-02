-- Instagram Messages table for DM caching
CREATE TABLE public.instagram_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  instagram_conversation_id TEXT NOT NULL,
  instagram_message_id TEXT UNIQUE,
  sender_id TEXT NOT NULL,
  sender_username TEXT,
  content TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_timestamp TIMESTAMPTZ NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Instagram Comments table
CREATE TABLE public.instagram_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  media_id TEXT NOT NULL,
  comment_id TEXT UNIQUE NOT NULL,
  content TEXT,
  from_id TEXT,
  from_username TEXT,
  parent_comment_id TEXT,
  replied BOOLEAN DEFAULT false,
  hidden BOOLEAN DEFAULT false,
  comment_timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Instagram Analytics Snapshots table
CREATE TABLE public.instagram_analytics_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  followers_count INTEGER DEFAULT 0,
  follows_count INTEGER DEFAULT 0,
  media_count INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  profile_views INTEGER DEFAULT 0,
  website_clicks INTEGER DEFAULT 0,
  email_contacts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, snapshot_date)
);

-- Instagram Products table for product tagging
CREATE TABLE public.instagram_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT,
  price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  is_available BOOLEAN DEFAULT true,
  synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, product_id)
);

-- Enable RLS on all tables
ALTER TABLE public.instagram_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for instagram_messages
CREATE POLICY "Users can view their workspace messages"
ON public.instagram_messages FOR SELECT
USING (workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid())));

CREATE POLICY "Users can insert messages in their workspace"
ON public.instagram_messages FOR INSERT
WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid())));

CREATE POLICY "Users can update their workspace messages"
ON public.instagram_messages FOR UPDATE
USING (workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid())));

CREATE POLICY "Users can delete their workspace messages"
ON public.instagram_messages FOR DELETE
USING (workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid())));

-- RLS Policies for instagram_comments
CREATE POLICY "Users can view their workspace comments"
ON public.instagram_comments FOR SELECT
USING (workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid())));

CREATE POLICY "Users can insert comments in their workspace"
ON public.instagram_comments FOR INSERT
WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid())));

CREATE POLICY "Users can update their workspace comments"
ON public.instagram_comments FOR UPDATE
USING (workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid())));

CREATE POLICY "Users can delete their workspace comments"
ON public.instagram_comments FOR DELETE
USING (workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid())));

-- RLS Policies for instagram_analytics_snapshots
CREATE POLICY "Users can view their workspace analytics"
ON public.instagram_analytics_snapshots FOR SELECT
USING (workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid())));

CREATE POLICY "Users can insert analytics in their workspace"
ON public.instagram_analytics_snapshots FOR INSERT
WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid())));

CREATE POLICY "Users can update their workspace analytics"
ON public.instagram_analytics_snapshots FOR UPDATE
USING (workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid())));

-- RLS Policies for instagram_products
CREATE POLICY "Users can view their workspace products"
ON public.instagram_products FOR SELECT
USING (workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid())));

CREATE POLICY "Users can insert products in their workspace"
ON public.instagram_products FOR INSERT
WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid())));

CREATE POLICY "Users can update their workspace products"
ON public.instagram_products FOR UPDATE
USING (workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid())));

CREATE POLICY "Users can delete their workspace products"
ON public.instagram_products FOR DELETE
USING (workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces(auth.uid())));

-- Indexes for better query performance
CREATE INDEX idx_instagram_messages_workspace ON public.instagram_messages(workspace_id);
CREATE INDEX idx_instagram_messages_conversation ON public.instagram_messages(instagram_conversation_id);
CREATE INDEX idx_instagram_comments_workspace ON public.instagram_comments(workspace_id);
CREATE INDEX idx_instagram_comments_media ON public.instagram_comments(media_id);
CREATE INDEX idx_instagram_analytics_workspace_date ON public.instagram_analytics_snapshots(workspace_id, snapshot_date);
CREATE INDEX idx_instagram_products_workspace ON public.instagram_products(workspace_id);