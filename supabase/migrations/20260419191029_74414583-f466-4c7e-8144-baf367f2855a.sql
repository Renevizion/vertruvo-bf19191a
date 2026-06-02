
DROP POLICY IF EXISTS "members manage campaign leads" ON public.outreach_campaign_leads;

CREATE POLICY "members insert campaign leads" ON public.outreach_campaign_leads
  FOR INSERT WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "members update campaign leads" ON public.outreach_campaign_leads
  FOR UPDATE USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "members delete campaign leads" ON public.outreach_campaign_leads
  FOR DELETE USING (public.is_workspace_member(workspace_id, auth.uid()));
