
-- Drop and recreate aggregate_form_analytics as a trigger function
DROP FUNCTION IF EXISTS public.aggregate_form_analytics();

CREATE OR REPLACE FUNCTION public.aggregate_form_analytics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  form_rec RECORD;
  period_start_calc TIMESTAMPTZ;
  period_end_calc TIMESTAMPTZ;
BEGIN
  -- Get last 30 days
  period_start_calc := date_trunc('day', now() - interval '30 days');
  period_end_calc := date_trunc('day', now());
  
  -- Aggregate for the form that was just inserted
  -- Delete existing summary for this period
  DELETE FROM form_analytics_summary 
  WHERE form_id = NEW.form_id 
  AND period_start >= period_start_calc;
  
  -- Insert new summary
  INSERT INTO form_analytics_summary (
    form_id,
    variant_id,
    period_start,
    period_end,
    views,
    submissions,
    conversion_rate,
    avg_time_to_submit
  )
  SELECT 
    form_id,
    variant_id,
    period_start_calc as period_start,
    period_end_calc as period_end,
    COUNT(*) as views,
    COUNT(*) FILTER (WHERE converted = true) as submissions,
    CASE 
      WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE converted = true)::FLOAT / COUNT(*) * 100)
      ELSE 0
    END as conversion_rate,
    AVG(time_to_submit) FILTER (WHERE time_to_submit IS NOT NULL) as avg_time_to_submit
  FROM form_metrics
  WHERE form_id = NEW.form_id
  AND submitted_at >= period_start_calc
  GROUP BY form_id, variant_id;
  
  RETURN NEW;
END;
$function$;

-- Create trigger to aggregate form analytics when form_metrics records are inserted
CREATE TRIGGER trigger_aggregate_form_analytics
AFTER INSERT ON public.form_metrics
FOR EACH ROW
EXECUTE FUNCTION aggregate_form_analytics();
