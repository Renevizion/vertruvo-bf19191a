-- Migrate existing business_settings records to populate workspace_id
-- Match business_settings to workspaces based on user profiles

UPDATE business_settings
SET workspace_id = (
  SELECT w.id 
  FROM workspaces w
  JOIN profiles p ON p.id = w.owner_id
  WHERE p.business_name = business_settings.business_name
  LIMIT 1
)
WHERE workspace_id IS NULL;

-- For any remaining records without workspace_id, assign to first workspace of the system
UPDATE business_settings
SET workspace_id = (
  SELECT id FROM workspaces ORDER BY created_at ASC LIMIT 1
)
WHERE workspace_id IS NULL;