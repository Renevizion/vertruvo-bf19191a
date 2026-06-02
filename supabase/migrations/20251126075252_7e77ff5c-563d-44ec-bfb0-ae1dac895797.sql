-- Create trigger to automatically score leads when created or updated
CREATE OR REPLACE FUNCTION apply_lead_scoring_rules()
RETURNS TRIGGER AS $$
DECLARE
  rule RECORD;
  total_score INTEGER := 0;
  score_breakdown JSONB := '[]'::JSONB;
BEGIN
  -- Get all active scoring rules for this workspace
  FOR rule IN 
    SELECT * FROM lead_scoring_rules 
    WHERE workspace_id = NEW.workspace_id 
    AND is_active = true
  LOOP
    -- Check if condition matches
    DECLARE
      condition_met BOOLEAN := false;
      field_value TEXT;
    BEGIN
      -- Extract field value from lead based on condition
      IF (rule.condition_config->>'field') = 'source' THEN
        field_value := NEW.source;
      ELSIF (rule.condition_config->>'field') = 'value' THEN
        field_value := NEW.value::TEXT;
      ELSIF (rule.condition_config->>'field') = 'email' THEN
        field_value := NEW.email;
      ELSIF (rule.condition_config->>'field') = 'company' THEN
        field_value := NEW.company;
      END IF;
      
      -- Apply operator logic
      IF (rule.condition_config->>'operator') = 'equals' THEN
        condition_met := field_value = (rule.condition_config->>'value');
      ELSIF (rule.condition_config->>'operator') = 'contains' THEN
        condition_met := field_value ILIKE '%' || (rule.condition_config->>'value') || '%';
      ELSIF (rule.condition_config->>'operator') = 'greater_than' THEN
        condition_met := field_value::NUMERIC > (rule.condition_config->>'value')::NUMERIC;
      ELSIF (rule.condition_config->>'operator') = 'less_than' THEN
        condition_met := field_value::NUMERIC < (rule.condition_config->>'value')::NUMERIC;
      END IF;
      
      -- Add score if condition met
      IF condition_met THEN
        total_score := total_score + rule.score_delta;
        score_breakdown := score_breakdown || jsonb_build_object(
          'rule', rule.name,
          'delta', rule.score_delta,
          'reason', rule.description
        );
      END IF;
    END;
  END LOOP;
  
  -- Update lead score
  NEW.score := total_score;
  NEW.score_factors := score_breakdown;
  NEW.last_scored_at := now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on leads table
DROP TRIGGER IF EXISTS trigger_apply_lead_scoring ON leads;
CREATE TRIGGER trigger_apply_lead_scoring
  BEFORE INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION apply_lead_scoring_rules();

-- Create function to aggregate form analytics into summary
CREATE OR REPLACE FUNCTION aggregate_form_analytics()
RETURNS void AS $$
DECLARE
  form_rec RECORD;
  period_start TIMESTAMPTZ;
  period_end TIMESTAMPTZ;
BEGIN
  -- Get last 30 days
  period_start := date_trunc('day', now() - interval '30 days');
  period_end := date_trunc('day', now());
  
  -- Aggregate for each form
  FOR form_rec IN SELECT DISTINCT form_id FROM form_metrics LOOP
    -- Delete existing summary for this period
    DELETE FROM form_analytics_summary 
    WHERE form_id = form_rec.form_id 
    AND period_start >= period_start;
    
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
      period_start,
      period_end,
      COUNT(*) as views,
      COUNT(*) FILTER (WHERE converted = true) as submissions,
      CASE 
        WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE converted = true)::FLOAT / COUNT(*) * 100)
        ELSE 0
      END as conversion_rate,
      AVG(time_to_submit) FILTER (WHERE time_to_submit IS NOT NULL) as avg_time_to_submit
    FROM form_metrics
    WHERE form_id = form_rec.form_id
    AND submitted_at >= period_start
    GROUP BY form_id, variant_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to track workflow execution
CREATE OR REPLACE FUNCTION track_workflow_execution(
  p_workflow_id UUID,
  p_status TEXT,
  p_duration_ms INTEGER,
  p_error TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO workflow_analytics (
    workflow_id,
    execution_count,
    success_count,
    error_count,
    avg_duration_ms,
    last_run_at,
    period_start,
    period_end
  )
  VALUES (
    p_workflow_id,
    1,
    CASE WHEN p_status = 'success' THEN 1 ELSE 0 END,
    CASE WHEN p_status = 'error' THEN 1 ELSE 0 END,
    p_duration_ms,
    now(),
    date_trunc('day', now()),
    date_trunc('day', now() + interval '1 day')
  )
  ON CONFLICT (workflow_id, period_start)
  DO UPDATE SET
    execution_count = workflow_analytics.execution_count + 1,
    success_count = workflow_analytics.success_count + CASE WHEN p_status = 'success' THEN 1 ELSE 0 END,
    error_count = workflow_analytics.error_count + CASE WHEN p_status = 'error' THEN 1 ELSE 0 END,
    avg_duration_ms = (workflow_analytics.avg_duration_ms * workflow_analytics.execution_count + p_duration_ms) / (workflow_analytics.execution_count + 1),
    last_run_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;