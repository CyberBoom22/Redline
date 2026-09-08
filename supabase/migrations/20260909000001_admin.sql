-- Single-administrator account.
--
-- The "exactly one admin" guarantee lives here, not in the React route guard.
-- The guard is UX; this is the enforcement. Assume the registration page will
-- be found by someone who was not invited to it.
--
-- The only way into `admins` is claim_admin(). The table has no INSERT policy,
-- so an authenticated user holding the anon key cannot write to it directly.

create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  claimed_at timestamptz not null default now()
);

-- Belt and braces: even if claim_admin() were bypassed or buggy, the database
-- physically cannot hold a second row. A unique index on a constant expression
-- permits exactly one.
create unique index if not exists admins_singleton on public.admins ((true));

alter table public.admins enable row level security;

-- Deliberately no INSERT, UPDATE or DELETE policy. The admin may read their own
-- row and nothing else; the uid is never exposed to anyone else.
drop policy if exists admins_read_self on public.admins;
create policy admins_read_self on public.admins
  for select to authenticated
  using (user_id = auth.uid());

revoke insert, update, delete on public.admins from anon, authenticated;
grant select on public.admins to authenticated;

-- Is the caller the administrator?
--
-- security definer so it can read `admins` past that table's RLS. Granted to
-- anon as well as authenticated: RLS policies are evaluated as the querying
-- role, so without the anon grant a logged-out REST query would fail with a
-- permission error instead of returning an empty array.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Has the single admin slot been taken? Returns only a boolean, never the uid,
-- so the registration page can close itself without leaking who the admin is.
create or replace function public.admin_exists()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.admins);
$$;

revoke all on function public.admin_exists() from public;
grant execute on function public.admin_exists() to anon, authenticated;

-- Claim the administrator slot. Succeeds exactly once, ever.
create or replace function public.claim_admin()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- Two people submitting the registration form at the same moment would both
  -- see an empty table without this. The lock serialises the check and insert.
  lock table public.admins in exclusive mode;

  if exists (select 1 from public.admins) then
    raise exception 'An administrator already exists' using errcode = '42501';
  end if;

  insert into public.admins (user_id) values (v_uid);
end;
$$;

revoke all on function public.claim_admin() from public;
grant execute on function public.claim_admin() to authenticated;
