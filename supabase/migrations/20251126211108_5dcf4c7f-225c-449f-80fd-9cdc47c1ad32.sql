-- Fix the apply_lead_scoring_rules function to handle not_empty and improve logic
CREATE OR REPLACE FUNCTION public.apply_lead_scoring_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rule RECORD;
  total_score INTEGER := 0;
  score_breakdown JSONB := '[]'::JSONB;
  condition_met BOOLEAN;
  field_value TEXT;
BEGIN
  -- Get all active scoring rules for this workspace
  FOR rule IN 
    SELECT * FROM lead_scoring_rules 
    WHERE workspace_id = NEW.workspace_id 
    AND is_active = true
    ORDER BY id
  LOOP
    condition_met := false;
    field_value := NULL;
    
    -- Extract field value from lead based on condition
    IF (rule.condition_config->>'field') = 'source' THEN
      field_value := NEW.source;
    ELSIF (rule.condition_config->>'field') = 'value' THEN
      field_value := NEW.value::TEXT;
    ELSIF (rule.condition_config->>'field') = 'email' THEN
      field_value := NEW.email;
    ELSIF (rule.condition_config->>'field') = 'company' THEN
      field_value := NEW.company;
    ELSIF (rule.condition_config->>'field') = 'phone' THEN
      field_value := NEW.phone;
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
    ELSIF (rule.condition_config->>'operator') = 'not_empty' THEN
      condition_met := field_value IS NOT NULL AND field_value != '';
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
  END LOOP;
  
  -- Update lead score
  NEW.score := GREATEST(0, total_score);
  NEW.score_factors := score_breakdown;
  NEW.last_scored_at := now();
  
  RETURN NEW;
END;
$function$;