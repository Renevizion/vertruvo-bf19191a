-- Drop old permissive RLS policies that are conflicting with workspace-scoped policies
DROP POLICY IF EXISTS "Anyone can view business settings" ON business_settings;
DROP POLICY IF EXISTS "Authenticated users can insert business settings" ON business_settings;
DROP POLICY IF EXISTS "Only admins can update business settings" ON business_settings;
DROP POLICY IF EXISTS "Only admins can delete business settings" ON business_settings;

-- Delete duplicate business_settings records, keeping only the most recent per workspace
DELETE FROM business_settings
WHERE id NOT IN (
  SELECT DISTINCT ON (workspace_id) id
  FROM business_settings
  WHERE workspace_id IS NOT NULL
  ORDER BY workspace_id, created_at DESC
);

-- Add unique constraint to prevent multiple business_settings per workspace
ALTER TABLE business_settings
ADD CONSTRAINT unique_business_settings_per_workspace UNIQUE (workspace_id);