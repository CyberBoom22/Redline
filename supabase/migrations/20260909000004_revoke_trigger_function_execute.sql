-- Trigger functions must not be callable as RPCs.
--
-- Postgres grants EXECUTE on a new function to PUBLIC by default. The earlier
-- migrations wrote explicit revokes for the functions meant to be called
-- directly, but not for the two that exist only as trigger bodies — which left
-- them reachable at /rest/v1/rpc/... for anon and authenticated.
--
-- Neither does anything useful when called that way (one raises by design, the
-- other errors because a trigger function has no trigger context), so the
-- exposure is not exploitable. It is still API surface that should not exist,
-- and Supabase's own security linter flags it.
--
-- The other definer functions stay callable on purpose: is_admin(),
-- owns_vehicle() and can_see_event() are evaluated inside RLS policies as the
-- querying role, so revoking anon's EXECUTE would turn a logged-out read into
-- a permission error instead of an empty result. admin_exists() is required by
-- the spec to be anon-callable, and returns only a boolean.

revoke all on function public.vehicle_events_append_only() from public, anon, authenticated;
revoke all on function public.flag_odometer_rollback() from public, anon, authenticated;
