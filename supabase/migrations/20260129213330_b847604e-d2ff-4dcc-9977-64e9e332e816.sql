-- Create item categories table for organizing items (like Revenue Categories, Sale Categories)
CREATE TABLE public.item_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category_number TEXT,
  parent_category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.item_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for item_categories
CREATE POLICY "Users can view their workspace item categories"
  ON public.item_categories FOR SELECT
  USING (workspace_id IN (SELECT get_user_workspaces(auth.uid())));

CREATE POLICY "Users can create item categories in their workspace"
  ON public.item_categories FOR INSERT
  WITH CHECK (workspace_id IN (SELECT get_user_workspaces(auth.uid())));

CREATE POLICY "Users can update their workspace item categories"
  ON public.item_categories FOR UPDATE
  USING (workspace_id IN (SELECT get_user_workspaces(auth.uid())));

CREATE POLICY "Users can delete their workspace item categories"
  ON public.item_categories FOR DELETE
  USING (workspace_id IN (SELECT get_user_workspaces(auth.uid())));

-- Add category_id to items table
ALTER TABLE public.items ADD COLUMN category_id UUID REFERENCES public.item_categories(id) ON DELETE SET NULL;

-- Make item_type more flexible (change from enum to text)
ALTER TABLE public.items ALTER COLUMN item_type TYPE TEXT;