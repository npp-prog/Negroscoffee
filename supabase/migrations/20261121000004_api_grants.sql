-- Explicit Data API privileges.
--
-- Older Supabase projects grant the API roles access to every new table in `public`
-- automatically; newer projects can be created with that turned off, in which case tables
-- created by SQL are unreachable ("permission denied") even though RLS policies exist.
-- This restores Supabase's standard baseline explicitly so both kinds of project behave the
-- same. Every table has RLS enabled and shop_cards is security_invoker, so the RLS policies
-- (not these grants) decide which rows each role can read or change.
-- Idempotent: safe to run more than once.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;

-- Search RPCs (repeated from the RLS migration so this file is self-contained).
grant execute on function public.shops_near, public.shops_in_bbox, public.price_tier_for
  to anon, authenticated, service_role;

-- Tables added by later migrations get the same baseline.
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;
