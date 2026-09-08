-- Single-administrator account.
--
-- The "exactly one admin" guarantee lives here, not in the React route guard.
-- The guard is UX; this is the enforcement. Assume the registration page will
-- be found by a stranger.
--
-- Every function below is `security definer` with `set search_path = ''`.
-- Without the pinned path, a caller who can create objects in a schema they
-- control could shadow an unqualified reference and hijack a function running
-- with the definer's privileges. With it, every object must be fully
-- qualified — `public.admins`, `auth.uid()` — and there is nothing to shadow.

create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  claimed_at timestamptz not null default now()
);

-- Belt and braces: even if claim_admin() were bypassed or buggy, the database
-- physically cannot hold a second row.
create unique index if not exists admins_singleton on public.admins ((true));

alter table public.admins enable row level security;

-- Deliberately no INSERT, UPDATE or DELETE policy. The admin may read their own
-- row and nothing else; no other user's uid is ever exposed.
drop policy if exists admins_read_self on public.admins;
create policy admins_read_self on public.admins
  for select to authenticated
  using (user_id = (select auth.uid()));

revoke insert, update, delete on public.admins from anon, authenticated;
grant select on public.admins to authenticated;

-- Is the caller the administrator?
--
-- Granted to anon as well as authenticated. RLS policy expressions are
-- evaluated as the querying role, so without the anon grant a logged-out REST
-- read of a protected table fails with "permission denied for function"
-- instead of returning an empty array. The function itself leaks nothing: for
-- anon, auth.uid() is null and the answer is always false.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

revoke all on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- Has the single admin slot been taken? Returns a boolean and nothing else --
-- never a count, an id or an email — so the registration page can close itself
-- without revealing who the administrator is.
create or replace function public.admin_exists()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins);
$$;

revoke all on function public.admin_exists() from public, anon, authenticated;
grant execute on function public.admin_exists() to anon, authenticated;

-- Claim the administrator slot. Succeeds exactly once, ever.
create or replace function public.claim_admin()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- Two people submitting the form in the same moment would both see an empty
  -- table without this. The lock serialises the check and the insert.
  lock table public.admins in exclusive mode;

  if exists (select 1 from public.admins) then
    -- Clear to the operator, and says nothing about who holds the slot.
    raise exception 'An administrator already exists' using errcode = '42501';
  end if;

  insert into public.admins (user_id) values (v_uid);
end;
$$;

revoke all on function public.claim_admin() from public, anon, authenticated;
grant execute on function public.claim_admin() to authenticated;
