
-- Add contact_type to leads for lead/prospect/customer segmentation
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS contact_type text NOT NULL DEFAULT 'lead';

-- Add index for filtering by contact_type
CREATE INDEX IF NOT EXISTS idx_leads_contact_type ON public.leads(contact_type);
