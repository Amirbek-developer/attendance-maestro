create table public.active_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  session_token text not null,
  device text,
  user_agent text,
  last_seen timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.active_sessions enable row level security;

create policy "Sessions: select own" on public.active_sessions
  for select using (auth.uid() = user_id);
create policy "Sessions: insert own" on public.active_sessions
  for insert with check (auth.uid() = user_id);
create policy "Sessions: update own" on public.active_sessions
  for update using (auth.uid() = user_id);
create policy "Sessions: delete own" on public.active_sessions
  for delete using (auth.uid() = user_id);

create trigger active_sessions_set_updated_at
  before update on public.active_sessions
  for each row execute function public.set_updated_at();

alter table public.active_sessions replica identity full;
alter publication supabase_realtime add table public.active_sessions;