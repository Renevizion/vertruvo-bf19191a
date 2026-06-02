-- Create google_sheet_integrations table to store OAuth tokens and sheet configurations
CREATE TABLE public.google_sheet_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- OAuth tokens
  google_access_token TEXT,
  google_refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Sheet configuration
  sheet_id TEXT,
  sheet_tab TEXT DEFAULT 'Sheet1',
  
  -- Column mappings (JSON object mapping our field names to sheet columns)
  -- e.g., {"name": "A", "email": "B", "phone": "C", "company": "D", "status": "E"}
  column_mappings JSONB DEFAULT '{}'::jsonb,
  
  -- Sync settings
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_frequency TEXT DEFAULT 'manual' -- 'manual', 'hourly', 'daily'
);

-- Enable RLS
ALTER TABLE public.google_sheet_integrations ENABLE ROW LEVEL SECURITY;

-- Allow all operations (adjust based on your auth requirements)
CREATE POLICY "Allow all operations on google_sheet_integrations"
  ON public.google_sheet_integrations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_google_sheet_integrations_updated_at
  BEFORE UPDATE ON public.google_sheet_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();