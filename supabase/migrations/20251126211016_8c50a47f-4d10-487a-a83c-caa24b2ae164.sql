-- Add workspace_id to webhook_integrations for proper scoping
ALTER TABLE webhook_integrations ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- Add workspace_id to workflow_runs for better query performance  
ALTER TABLE workflow_runs ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflow_runs_workspace_id ON workflow_runs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_webhook_integrations_workspace_id ON webhook_integrations(workspace_id);

-- Seed workflow templates
INSERT INTO workflow_templates (name, description, category, trigger_type, nodes, edges, is_active, is_featured)
VALUES 
  ('New Member Welcome Flow', 'Automatically welcome new gym members with intro email and first task', 'gym', 'form_submitted',
   '[{"id": "trigger-1", "type": "trigger", "data": {"label": "New Member Signup"}}, {"id": "action-1", "type": "action", "data": {"label": "Create Welcome Task", "actionType": "Create Task"}}, {"id": "action-2", "type": "action", "data": {"label": "Send Welcome Email", "actionType": "Send Notification"}}]'::jsonb,
   '[{"id": "edge-1", "source": "trigger-1", "target": "action-1"}, {"id": "edge-2", "source": "action-1", "target": "action-2"}]'::jsonb,
   true, true),
   
  ('High-Value Lead Alert', 'Notify team when high-value lead enters pipeline', 'sales', 'lead_created',
   '[{"id": "trigger-1", "type": "trigger", "data": {"label": "New Lead"}}, {"id": "condition-1", "type": "condition", "data": {"label": "Lead Value > $5000", "conditionType": "Lead Value > Amount", "amount": 5000}}, {"id": "action-1", "type": "action", "data": {"label": "Alert Sales Team", "actionType": "Send Notification"}}]'::jsonb,
   '[{"id": "edge-1", "source": "trigger-1", "target": "condition-1"}, {"id": "edge-2", "source": "condition-1", "target": "action-1", "sourceHandle": "true"}]'::jsonb,
   true, true),
   
  ('Abandoned Lead Follow-Up', 'Auto-follow up with leads that haven''t been contacted in 7 days', 'sales', 'scheduled',
   '[{"id": "trigger-1", "type": "trigger", "data": {"label": "Daily Check"}}, {"id": "action-1", "type": "action", "data": {"label": "Create Follow-Up Task", "actionType": "Create Task", "taskTitle": "Follow up with {lead.name}"}}]'::jsonb,
   '[{"id": "edge-1", "source": "trigger-1", "target": "action-1"}]'::jsonb,
   true, false),
   
  ('Lead Nurture Sequence', 'Multi-touch email sequence for new leads', 'marketing', 'lead_created',
   '[{"id": "trigger-1", "type": "trigger", "data": {"label": "New Lead Created"}}, {"id": "action-1", "type": "action", "data": {"label": "Day 1: Welcome Email", "actionType": "Send Notification"}}, {"id": "action-2", "type": "action", "data": {"label": "Day 3: Value Proposition", "actionType": "Send Notification"}}, {"id": "action-3", "type": "action", "data": {"label": "Day 7: Case Study", "actionType": "Send Notification"}}]'::jsonb,
   '[{"id": "edge-1", "source": "trigger-1", "target": "action-1"}, {"id": "edge-2", "source": "action-1", "target": "action-2"}, {"id": "edge-3", "source": "action-2", "target": "action-3"}]'::jsonb,
   true, true);

-- Create default lead scoring rules for existing workspaces
INSERT INTO lead_scoring_rules (workspace_id, name, description, condition_type, condition_config, score_delta, is_active)
SELECT 
  w.id,
  'Website Visitor',
  'Lead came from website form',
  'source_equals',
  '{"field": "source", "operator": "equals", "value": "website"}'::jsonb,
  10,
  true
FROM workspaces w
ON CONFLICT DO NOTHING;

INSERT INTO lead_scoring_rules (workspace_id, name, description, condition_type, condition_config, score_delta, is_active)
SELECT 
  w.id,
  'Has Company Information',
  'Lead provided company name',
  'field_not_empty',
  '{"field": "company", "operator": "not_empty"}'::jsonb,
  15,
  true
FROM workspaces w
ON CONFLICT DO NOTHING;

INSERT INTO lead_scoring_rules (workspace_id, name, description, condition_type, condition_config, score_delta, is_active)
SELECT 
  w.id,
  'High Value Opportunity',
  'Lead value over $10,000',
  'value_greater_than',
  '{"field": "value", "operator": "greater_than", "value": "10000"}'::jsonb,
  25,
  true
FROM workspaces w
ON CONFLICT DO NOTHING;

-- Create trigger to auto-apply lead scoring
DROP TRIGGER IF EXISTS apply_lead_scoring ON leads;
CREATE TRIGGER apply_lead_scoring
  BEFORE INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION apply_lead_scoring_rules();

-- Rescore all existing leads
UPDATE leads SET updated_at = now() WHERE workspace_id = '1a46f6f1-4674-43c0-b547-6a34e2c70f2b';

-- Update RLS policies for webhook_integrations
DROP POLICY IF EXISTS "Users can view workspace webhook integrations" ON webhook_integrations;
DROP POLICY IF EXISTS "Users can create workspace webhook integrations" ON webhook_integrations;
DROP POLICY IF EXISTS "Users can update workspace webhook integrations" ON webhook_integrations;
DROP POLICY IF EXISTS "Users can delete workspace webhook integrations" ON webhook_integrations;

CREATE POLICY "Users can view workspace webhook integrations"
  ON webhook_integrations FOR SELECT
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "Users can create workspace webhook integrations"
  ON webhook_integrations FOR INSERT
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "Users can update workspace webhook integrations"
  ON webhook_integrations FOR UPDATE
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "Users can delete workspace webhook integrations"
  ON webhook_integrations FOR DELETE
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));