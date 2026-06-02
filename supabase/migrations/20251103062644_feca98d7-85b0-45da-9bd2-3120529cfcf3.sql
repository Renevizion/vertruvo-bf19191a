-- Create deleted_leads table for 45-day retention
CREATE TABLE IF NOT EXISTS public.deleted_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_lead_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  source TEXT,
  value NUMERIC DEFAULT 0,
  notes TEXT,
  stage_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '45 days')
);

-- Enable RLS
ALTER TABLE public.deleted_leads ENABLE ROW LEVEL SECURITY;

-- Allow all operations on deleted_leads
CREATE POLICY "Allow all operations on deleted_leads"
ON public.deleted_leads
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for cleanup
CREATE INDEX idx_deleted_leads_expires_at ON public.deleted_leads(expires_at);

-- Create function to clean up expired deleted leads (runs daily)
CREATE OR REPLACE FUNCTION cleanup_expired_deleted_leads()
RETURNS void AS $$
BEGIN
  DELETE FROM public.deleted_leads
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;