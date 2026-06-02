-- Drop any existing lead scoring triggers to avoid conflicts
DROP TRIGGER IF EXISTS apply_lead_scoring_trigger ON public.leads;
DROP TRIGGER IF EXISTS apply_scoring_trigger ON public.leads;
DROP TRIGGER IF EXISTS lead_scoring_trigger ON public.leads;

-- Create a single consolidated trigger for lead scoring
CREATE TRIGGER apply_lead_scoring_trigger
  BEFORE INSERT OR UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_lead_scoring_rules();