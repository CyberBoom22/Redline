-- Member dyno logs.
--
-- Guests get one dyno log per day, kept in their own browser and never sent
-- here. Signed-in members log without a cap, and their runs live in this
-- table so they follow the account across devices.
--
-- Each row belongs to exactly one account. A member can read and add their
-- own runs and nothing else; there is no UPDATE or DELETE policy because the
-- app offers neither. The CHECK constraints mirror sanitizeRun() in
-- src/lib/dynoRuns.ts, so anything the app accepts the database accepts too.

create table if not exists public.dyno_runs (
  id             uuid primary key default gen_random_uuid(),
  -- Defaults to the caller, and the insert policy below refuses anything else,
  -- so a client cannot file a run under another account.
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  engine_id      text not null check (engine_id ~ '^[a-z0-9_]{1,40}$'),
  vehicle_label  text not null default '' check (char_length(vehicle_label) <= 160),
  run_date       date not null default current_date,
  title          text not null check (char_length(title) between 1 and 120),
  dyno_type      text not null check (dyno_type in ('Dynojet', 'Mustang Dyno', 'Mainline', 'Virtual Dyno')),
  peak_whp       int not null check (peak_whp between 1 and 3000),
  peak_wtq       int not null check (peak_wtq between 1 and 3000),
  max_boost_psi  numeric(4, 1) not null check (max_boost_psi between 0 and 99.9),
  fuel_type      text not null default '' check (char_length(fuel_type) <= 40),
  ambient_temp_f int not null check (ambient_temp_f between -40 and 150),
  notes          text not null default '' check (char_length(notes) <= 2000),
  created_at     timestamptz not null default now()
);

-- Every policy filters on user_id.
create index if not exists dyno_runs_user_idx on public.dyno_runs (user_id, run_date desc);

alter table public.dyno_runs enable row level security;

drop policy if exists dyno_runs_read_own on public.dyno_runs;
create policy dyno_runs_read_own on public.dyno_runs
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists dyno_runs_insert_own on public.dyno_runs;
create policy dyno_runs_insert_own on public.dyno_runs
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- Table privileges match the policies: nothing for anon, read and insert for
-- signed-in members. RLS would already refuse the rest; this keeps the grant
-- list honest about what the table is for.
revoke all on public.dyno_runs from public, anon, authenticated;
grant select, insert on public.dyno_runs to authenticated;
