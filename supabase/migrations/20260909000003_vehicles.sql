-- The vehicle data model. Schema only: no UI, no claim or transfer RPCs.
--
-- Design principle: the vehicle is the root entity and ownership is a
-- time-bounded edge. Records attach to vehicle_id and are attributed to an
-- ownership period, which is what lets history follow the car through a sale
-- without a later migration.
--
-- Every function here is `security definer` with `set search_path = ''` and
-- fully-qualified references, for the reasons given in the admin migration.

create table if not exists public.vehicles (
  id           uuid primary key default gen_random_uuid(),
  -- Nullable: the planner is usable without a VIN. Unique for integrity only.
  -- There is deliberately no lookup-by-VIN path for anyone but a verified
  -- current owner, and no existence check — that would leak enumeration.
  vin          text unique,
  -- ISO 3779 check-digit result. A failure is recorded, never a hard reject:
  -- some grey-market and non-US-market vehicles legitimately fail it.
  vin_check_ok boolean,
  engine_id    text not null,
  chassis      text,
  trim         text,
  model_year   int check (model_year between 1980 and 2100),
  created_at   timestamptz not null default now(),
  -- Mirrors the hard rules in src/lib/vin.ts: 17 characters, no I, O or Q.
  constraint vehicles_vin_format check (vin is null or vin ~ '^[A-HJ-NPR-Z0-9]{17}$')
);

create table if not exists public.vehicle_ownerships (
  id           uuid primary key default gen_random_uuid(),
  vehicle_id   uuid not null references public.vehicles (id) on delete restrict,
  user_id      uuid not null references auth.users (id) on delete restrict,
  role         text not null default 'owner' check (role in ('owner', 'co_owner', 'shop')),
  started_on   date not null,
  ended_on     date,
  claim_status text not null default 'pending'
                 check (claim_status in ('pending', 'verified', 'disputed', 'rejected')),
  created_at   timestamptz not null default now(),
  check (ended_on is null or ended_on >= started_on)
);

-- One verified current owner per vehicle. Co-owners and shops are unrestricted.
create unique index if not exists one_current_owner on public.vehicle_ownerships (vehicle_id)
  where ended_on is null and claim_status = 'verified' and role = 'owner';
-- Requirement 11: index every column a policy filters on.
create index if not exists vehicle_ownerships_user_vehicle_idx
  on public.vehicle_ownerships (user_id, vehicle_id);

create table if not exists public.vehicle_events (
  id            uuid primary key default gen_random_uuid(),
  vehicle_id    uuid not null references public.vehicles (id) on delete restrict,
  ownership_id  uuid references public.vehicle_ownerships (id) on delete restrict,
  kind          text not null check (kind in
                  ('maintenance', 'repair', 'mod_install', 'mod_removal',
                   'inspection', 'odometer', 'title_event')),
  occurred_on   date not null check (occurred_on <= current_date),
  odometer_mi   int check (odometer_mi >= 0),
  -- A rollback is stored and flagged, never refused. It is either a typo, a
  -- cluster swap, or fraud, and all three are worth keeping. Set by trigger on
  -- insert, because the row can never be updated afterwards.
  odometer_rollback boolean not null default false,
  visibility    text not null default 'transferable'
                  check (visibility in ('transferable', 'private')),
  supersedes_id uuid references public.vehicle_events (id),
  voided_at     timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists vehicle_events_vehicle_occurred_idx
  on public.vehicle_events (vehicle_id, occurred_on desc);
create index if not exists vehicle_events_ownership_idx on public.vehicle_events (ownership_id);

-- Sibling detail tables, keyed on the event.
create table if not exists public.event_maintenance (
  event_id     uuid primary key references public.vehicle_events (id) on delete restrict,
  service_type text not null,
  shop_name    text,
  performed_by text,
  -- Money is numeric, never float.
  cost         numeric(10, 2) check (cost >= 0),
  next_due_mi  int check (next_due_mi >= 0),
  next_due_on  date,
  notes        text
);

create table if not exists public.event_mod_install (
  event_id   uuid primary key references public.vehicle_events (id) on delete restrict,
  -- The part is referenced, never copied. Storing a price here would mean the
  -- recorded history changes the next time a vendor runs a sale.
  part_id    text,
  vendor_sku text,
  brand      text,
  installed_by text,
  notes      text
);

-- External attestations, kept structurally apart from vehicle_events: official
-- records and self-reported records must never share a table.
create table if not exists public.title_reports (
  id         uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete restrict,
  provider   text not null,
  fetched_at timestamptz not null default now(),
  brands     text[] not null default '{}',
  payload    jsonb not null default '{}'::jsonb
);
create index if not exists title_reports_vehicle_idx on public.title_reports (vehicle_id);

-- ── append-only enforcement ─────────────────────────────────────────────────
--
-- No UPDATE or DELETE policy exists, so a browser cannot reach these. The
-- trigger goes further: it fires for the table owner and for a service-role
-- job too, so history cannot be silently rewritten by a future server-side
-- mistake. Corrections are new rows pointing at the old one via supersedes_id.

create or replace function public.vehicle_events_append_only()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception
    'vehicle_events is append-only: insert a correcting row referencing supersedes_id instead of %',
    tg_op
    using errcode = '42501';
end;
$$;

drop trigger if exists vehicle_events_no_update on public.vehicle_events;
create trigger vehicle_events_no_update
  before update on public.vehicle_events
  for each row execute function public.vehicle_events_append_only();

drop trigger if exists vehicle_events_no_delete on public.vehicle_events;
create trigger vehicle_events_no_delete
  before delete on public.vehicle_events
  for each row execute function public.vehicle_events_append_only();

-- ── odometer rollback flag ──────────────────────────────────────────────────

create or replace function public.flag_odometer_rollback()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous int;
begin
  if new.odometer_mi is null then
    return new;
  end if;

  select e.odometer_mi into v_previous
    from public.vehicle_events e
   where e.vehicle_id = new.vehicle_id
     and e.odometer_mi is not null
     and e.voided_at is null
     and e.occurred_on <= new.occurred_on
   order by e.occurred_on desc, e.created_at desc
   limit 1;

  if v_previous is not null and new.odometer_mi < v_previous then
    new.odometer_rollback := true;
  end if;

  return new;
end;
$$;

drop trigger if exists vehicle_events_odometer_check on public.vehicle_events;
create trigger vehicle_events_odometer_check
  before insert on public.vehicle_events
  for each row execute function public.flag_odometer_rollback();

-- ── ownership helper ────────────────────────────────────────────────────────
--
-- One definer helper rather than the same subquery repeated in every policy.

create or replace function public.owns_vehicle(p_vehicle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.vehicle_ownerships o
     where o.vehicle_id = p_vehicle_id
       and o.user_id = (select auth.uid())
       and o.claim_status = 'verified'
       and o.ended_on is null
  );
$$;

revoke all on function public.owns_vehicle(uuid) from public, anon, authenticated;
grant execute on function public.owns_vehicle(uuid) to anon, authenticated;

-- Can the caller see this event? Transferable history follows the car to its
-- current owner; private entries stay with the ownership period that wrote them.
create or replace function public.can_see_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.vehicle_events e
      left join public.vehicle_ownerships o on o.id = e.ownership_id
     where e.id = p_event_id
       and public.owns_vehicle(e.vehicle_id)
       and (e.visibility = 'transferable' or o.user_id = (select auth.uid()))
  );
$$;

revoke all on function public.can_see_event(uuid) from public, anon, authenticated;
grant execute on function public.can_see_event(uuid) to anon, authenticated;

-- ── RLS ─────────────────────────────────────────────────────────────────────
--
-- SELECT policies only, throughout. No non-admin user exists yet, but these are
-- the policies that must already be right when the first one arrives.

alter table public.vehicles            enable row level security;
alter table public.vehicle_ownerships  enable row level security;
alter table public.vehicle_events      enable row level security;
alter table public.event_maintenance   enable row level security;
alter table public.event_mod_install   enable row level security;
alter table public.title_reports       enable row level security;

drop policy if exists vehicles_read on public.vehicles;
create policy vehicles_read on public.vehicles
  for select to anon, authenticated
  using ((select public.is_admin()) or (select public.owns_vehicle(id)));

drop policy if exists vehicle_ownerships_read on public.vehicle_ownerships;
create policy vehicle_ownerships_read on public.vehicle_ownerships
  for select to anon, authenticated
  using ((select public.is_admin()) or user_id = (select auth.uid()));

drop policy if exists vehicle_events_read on public.vehicle_events;
create policy vehicle_events_read on public.vehicle_events
  for select to anon, authenticated
  using ((select public.is_admin()) or (select public.can_see_event(id)));

drop policy if exists event_maintenance_read on public.event_maintenance;
create policy event_maintenance_read on public.event_maintenance
  for select to anon, authenticated
  using ((select public.is_admin()) or (select public.can_see_event(event_id)));

drop policy if exists event_mod_install_read on public.event_mod_install;
create policy event_mod_install_read on public.event_mod_install
  for select to anon, authenticated
  using ((select public.is_admin()) or (select public.can_see_event(event_id)));

-- Official attestations: readable by the admin and the verified current owner.
-- No write policy in this build; nothing writes to it yet.
drop policy if exists title_reports_read on public.title_reports;
create policy title_reports_read on public.title_reports
  for select to anon, authenticated
  using ((select public.is_admin()) or (select public.owns_vehicle(vehicle_id)));

grant select on public.vehicles, public.vehicle_ownerships, public.vehicle_events,
                public.event_maintenance, public.event_mod_install, public.title_reports
  to anon, authenticated;

revoke insert, update, delete on public.vehicles, public.vehicle_ownerships,
                                 public.vehicle_events, public.event_maintenance,
                                 public.event_mod_install, public.title_reports
  from anon, authenticated;
