-- Close the TRUNCATE path on vehicle_events.
--
-- The row-level triggers block UPDATE and DELETE, but TRUNCATE does not fire
-- row-level triggers at all — it takes a separate statement-level one. Without
-- this, "append-only" holds against every ordinary write and then loses the
-- whole table to a single statement.
--
-- Only the table owner can TRUNCATE, so neither the browser roles nor
-- service_role could reach it; this closes the remaining path deliberately
-- rather than leaving it to privilege alone. Dropping this trigger is now an
-- explicit, visible act rather than an oversight.

create or replace function public.vehicle_events_no_truncate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'vehicle_events is append-only: TRUNCATE would discard vehicle history'
    using errcode = '42501';
end;
$$;

revoke all on function public.vehicle_events_no_truncate() from public, anon, authenticated;

drop trigger if exists vehicle_events_no_truncate on public.vehicle_events;
create trigger vehicle_events_no_truncate
  before truncate on public.vehicle_events
  for each statement execute function public.vehicle_events_no_truncate();
