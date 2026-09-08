-- Scraper report tables, readable only by the administrator.
--
-- Rows are written later by a GitHub Actions job using the service role key,
-- which bypasses RLS. There are deliberately no INSERT, UPDATE or DELETE
-- policies, so there is no path from the browser that writes to these tables.

create table if not exists public.scrape_runs (
  id              uuid primary key default gen_random_uuid(),
  started_at      timestamptz not null,
  finished_at     timestamptz,
  trigger         text not null,
  requests_used   int not null default 0,
  request_limit   int not null,
  by_platform     jsonb not null default '{}',
  by_vendor       jsonb not null default '{}',
  not_modified    int not null default 0,
  discovered      int not null default 0,
  parts_created   int not null default 0,
  parts_updated   int not null default 0,
  parts_unchanged int not null default 0,
  price_changes   int not null default 0,
  gone            int not null default 0,
  errors          int not null default 0,
  stopped_reason  text,
  duration_seconds int,
  github_run_url  text
);

create table if not exists public.scrape_events (
  id        bigserial primary key,
  run_id    uuid not null references public.scrape_runs (id) on delete cascade,
  vendor_id text not null,
  url       text not null,
  kind      text not null,
  status    int,
  outcome   text not null,
  part_id   text,
  old_price numeric(10, 2),
  new_price numeric(10, 2),
  message   text,
  at        timestamptz not null default now()
);

create index if not exists scrape_events_run_outcome_idx on public.scrape_events (run_id, outcome);
-- The report lists runs newest first.
create index if not exists scrape_runs_started_idx on public.scrape_runs (started_at desc);

alter table public.scrape_runs   enable row level security;
alter table public.scrape_events enable row level security;

-- SELECT only, and only for the administrator. The policy covers anon too so a
-- logged-out request is filtered to zero rows rather than rejected outright --
-- that is what makes the unauthenticated REST check return [] instead of an
-- error, and it is the difference between "RLS filtered it" and "the endpoint
-- happened to fail".
drop policy if exists scrape_runs_admin_read on public.scrape_runs;
create policy scrape_runs_admin_read on public.scrape_runs
  for select to anon, authenticated
  using ((select public.is_admin()));

drop policy if exists scrape_events_admin_read on public.scrape_events;
create policy scrape_events_admin_read on public.scrape_events
  for select to anon, authenticated
  using ((select public.is_admin()));

grant select on public.scrape_runs   to anon, authenticated;
grant select on public.scrape_events to anon, authenticated;

-- No write policies exist; revoking the privileges as well means a write is
-- refused by grants before RLS is even consulted.
revoke insert, update, delete on public.scrape_runs   from anon, authenticated;
revoke insert, update, delete on public.scrape_events from anon, authenticated;
revoke all on sequence public.scrape_events_id_seq from anon, authenticated;
