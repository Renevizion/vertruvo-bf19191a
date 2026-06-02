-- Click-wrap license acceptance audit trail
-- Records every user's acceptance with timestamp, IP, user agent, and license version

create table if not exists public.license_acceptances (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  email         text,
  license_version text not null default '1.0',
  accepted_at   timestamptz not null default now(),
  ip_address    text,
  user_agent    text,
  workspace_id  uuid
);

-- Only the user themselves (or service role) can read their own record
alter table public.license_acceptances enable row level security;

create policy "Users can view own acceptance"
  on public.license_acceptances for select
  using (auth.uid() = user_id);

create policy "Service role can insert"
  on public.license_acceptances for insert
  with check (true);

-- Index for fast lookup on login
create index if not exists license_acceptances_user_id_idx
  on public.license_acceptances(user_id);
