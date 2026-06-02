-- Create item type enum
CREATE TYPE public.item_type AS ENUM ('product', 'service', 'fee', 'class', 'other');

-- Create payment method enum
CREATE TYPE public.payment_method AS ENUM ('cash', 'check', 'card', 'card_on_file', 'charge_to_account', 'coupon', 'other');

-- Create sale status enum
CREATE TYPE public.sale_status AS ENUM ('pending', 'paid', 'refunded', 'cancelled');

-- Items table - products/services that can be sold
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  item_type public.item_type NOT NULL DEFAULT 'product',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sales/transactions table
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  status public.sale_status NOT NULL DEFAULT 'pending',
  payment_method public.payment_method,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  paid_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sale line items
CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  item_title TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Items RLS policies
CREATE POLICY "Users can view items in their workspace"
ON public.items FOR SELECT
USING (workspace_id IN (SELECT public.get_user_workspaces(auth.uid())));

CREATE POLICY "Users can create items in their workspace"
ON public.items FOR INSERT
WITH CHECK (workspace_id IN (SELECT public.get_user_workspaces(auth.uid())));

CREATE POLICY "Users can update items in their workspace"
ON public.items FOR UPDATE
USING (workspace_id IN (SELECT public.get_user_workspaces(auth.uid())));

CREATE POLICY "Users can delete items in their workspace"
ON public.items FOR DELETE
USING (workspace_id IN (SELECT public.get_user_workspaces(auth.uid())));

-- Sales RLS policies
CREATE POLICY "Users can view sales in their workspace"
ON public.sales FOR SELECT
USING (workspace_id IN (SELECT public.get_user_workspaces(auth.uid())));

CREATE POLICY "Users can create sales in their workspace"
ON public.sales FOR INSERT
WITH CHECK (workspace_id IN (SELECT public.get_user_workspaces(auth.uid())));

CREATE POLICY "Users can update sales in their workspace"
ON public.sales FOR UPDATE
USING (workspace_id IN (SELECT public.get_user_workspaces(auth.uid())));

CREATE POLICY "Users can delete sales in their workspace"
ON public.sales FOR DELETE
USING (workspace_id IN (SELECT public.get_user_workspaces(auth.uid())));

-- Sale items RLS policies (based on parent sale)
CREATE POLICY "Users can view sale items for their sales"
ON public.sale_items FOR SELECT
USING (sale_id IN (
  SELECT id FROM public.sales WHERE workspace_id IN (SELECT public.get_user_workspaces(auth.uid()))
));

CREATE POLICY "Users can create sale items for their sales"
ON public.sale_items FOR INSERT
WITH CHECK (sale_id IN (
  SELECT id FROM public.sales WHERE workspace_id IN (SELECT public.get_user_workspaces(auth.uid()))
));

CREATE POLICY "Users can update sale items for their sales"
ON public.sale_items FOR UPDATE
USING (sale_id IN (
  SELECT id FROM public.sales WHERE workspace_id IN (SELECT public.get_user_workspaces(auth.uid()))
));

CREATE POLICY "Users can delete sale items for their sales"
ON public.sale_items FOR DELETE
USING (sale_id IN (
  SELECT id FROM public.sales WHERE workspace_id IN (SELECT public.get_user_workspaces(auth.uid()))
));

-- Add updated_at triggers
CREATE TRIGGER update_items_updated_at
BEFORE UPDATE ON public.items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_updated_at
BEFORE UPDATE ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes
CREATE INDEX idx_items_workspace_id ON public.items(workspace_id);
CREATE INDEX idx_items_is_active ON public.items(is_active);
CREATE INDEX idx_sales_workspace_id ON public.sales(workspace_id);
CREATE INDEX idx_sales_lead_id ON public.sales(lead_id);
CREATE INDEX idx_sales_status ON public.sales(status);
CREATE INDEX idx_sale_items_sale_id ON public.sale_items(sale_id);