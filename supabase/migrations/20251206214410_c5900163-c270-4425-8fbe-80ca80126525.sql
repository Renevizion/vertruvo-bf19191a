-- Fix opportunity_settings public read policy
-- This table is global settings, not workspace-scoped
-- Restrict to authenticated users only

DROP POLICY IF EXISTS "Anyone can view opportunity settings" ON opportunity_settings;
CREATE POLICY "Authenticated users can view opportunity settings" ON opportunity_settings
  FOR SELECT TO authenticated
  USING (true);