
-- Add attribution columns to leads for campaign tracking
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS attribution_source text,
ADD COLUMN IF NOT EXISTS attribution_id uuid;

-- Create index for attribution lookups
CREATE INDEX IF NOT EXISTS idx_leads_attribution ON public.leads(attribution_source, attribution_id) WHERE attribution_source IS NOT NULL;

COMMENT ON COLUMN public.leads.attribution_source IS 'Source type: email_campaign, instagram_dm, instagram_comment, social_post, etc.';
COMMENT ON COLUMN public.leads.attribution_id IS 'ID of the campaign/post/conversation that created this lead';
