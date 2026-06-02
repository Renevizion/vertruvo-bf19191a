-- Enable realtime for leads table
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;

-- Enable realtime for contacts table
ALTER PUBLICATION supabase_realtime ADD TABLE public.contacts;

-- Enable realtime for activities table
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;

-- Enable realtime for tasks table
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;