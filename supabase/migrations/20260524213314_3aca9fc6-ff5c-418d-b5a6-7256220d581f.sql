
-- Drastically reduce cron frequency to cut Cloud burn with zero active users.
-- Email queue: 5s -> every 2 minutes (still responsive, 60x cheaper)
SELECT cron.unschedule('process-email-queue');
SELECT cron.schedule('process-email-queue', '*/2 * * * *', $$SELECT net.http_post(url:='https://dpbbylcycltexyknejcb.supabase.co/functions/v1/process-email-queue', headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwYmJ5bGN5Y2x0ZXh5a25lamNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMDkxNTYsImV4cCI6MjA3NzY4NTE1Nn0.qqVy66NwB6O18iD981OtCSYJCvYdhqfE80J_LBQ5zgc"}'::jsonb, body:='{}'::jsonb) AS request_id;$$);

-- Bulk outreach tick: every minute -> every 5 minutes
SELECT cron.unschedule('bulk-outreach-tick');
SELECT cron.schedule('bulk-outreach-tick', '*/5 * * * *', $$SELECT net.http_post(url:='https://dpbbylcycltexyknejcb.supabase.co/functions/v1/bulk-outreach-orchestrator', headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwYmJ5bGN5Y2x0ZXh5a25lamNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMDkxNTYsImV4cCI6MjA3NzY4NTE1Nn0.qqVy66NwB6O18iD981OtCSYJCvYdhqfE80J_LBQ5zgc"}'::jsonb, body:='{}'::jsonb) AS request_id;$$);

-- Scheduled posts: every minute -> every 5 minutes
SELECT cron.unschedule('process-scheduled-posts');
SELECT cron.schedule('process-scheduled-posts', '*/5 * * * *', $$SELECT net.http_post(url:='https://dpbbylcycltexyknejcb.supabase.co/functions/v1/process-scheduled-posts', headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwYmJ5bGN5Y2x0ZXh5a25lamNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMDkxNTYsImV4cCI6MjA3NzY4NTE1Nn0.qqVy66NwB6O18iD981OtCSYJCvYdhqfE80J_LBQ5zgc"}'::jsonb, body:='{}'::jsonb) AS request_id;$$);

-- Remove duplicate social coach tick
SELECT cron.unschedule('social-coach-tick-every-30m');
