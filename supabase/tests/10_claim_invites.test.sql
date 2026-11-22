-- Claim invites (migration 20261122000009).
create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, false);
  set role authenticated;
end $$;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000ee', 'newowner@example.test');
update public.shops set claimed_by = null, verified_at = null where slug = 'kapihan-ni-lola';

-- Admin creates an invite (the app hashes the token).
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.shop_claim_invites (shop_id, token_hash, expires_at)
select id, public.claim_invite_hash('tok-valid-0123456789abcdef'), now() + interval '14 days' from public.shops where slug = 'kapihan-ni-lola';
insert into public.shop_claim_invites (shop_id, token_hash, expires_at)
select id, public.claim_invite_hash('tok-expired-0123456789abcdef'), now() - interval '1 day' from public.shops where slug = 'kapihan-ni-lola';
reset role;

-- Anyone can look an invite up by its token, nobody else can list invites.
set role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', false);
do $$
begin
  assert (select status from public.claim_invite_info('tok-valid-0123456789abcdef')) = 'valid', 'valid for anon';
  assert (select status from public.claim_invite_info('tok-expired-0123456789abcdef')) = 'expired', 'expired';
  assert not exists (select 1 from public.claim_invite_info('nope-nope-nope-nope-nope')), 'unknown token';
  begin
    perform count(*) from public.shop_claim_invites;
    raise exception 'anon read invites';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.accept_claim_invite('tok-valid-0123456789abcdef');
    raise exception 'anon accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000ee');
do $$
declare
  sid uuid;
begin
  assert (select count(*) from public.shop_claim_invites) = 0, 'users cannot list invites';
  begin
    perform public.accept_claim_invite('tok-expired-0123456789abcdef');
    raise exception 'expired accepted';
  exception when check_violation then null;
  end;
  sid := public.accept_claim_invite('tok-valid-0123456789abcdef');
  assert (select claimed_by = auth.uid() and verified_at is not null from public.shops where id = sid), 'now owner';
  assert (select role from public.profiles where id = auth.uid()) = 'owner', 'role owner';
  begin
    perform public.accept_claim_invite('tok-valid-0123456789abcdef');
    raise exception 'reused';
  exception when check_violation then null;
  end;
end $$;
reset role;

-- A second invite can't take over a shop that already has an owner.
insert into public.shop_claim_invites (shop_id, token_hash, expires_at)
select id, public.claim_invite_hash('tok-second-0123456789abcdef'), now() + interval '1 day' from public.shops where slug = 'kapihan-ni-lola';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$
begin
  assert (select status from public.claim_invite_info('tok-second-0123456789abcdef')) = 'owned', 'owned status';
  begin
    perform public.accept_claim_invite('tok-second-0123456789abcdef');
    raise exception 'took over owned shop';
  exception when check_violation then null;
  end;
  raise notice 'ok: claim invites';
end $$;
reset role;
update public.shops set claimed_by = null, verified_at = null where slug = 'kapihan-ni-lola';
delete from public.shop_claim_invites;
delete from auth.users where id = '00000000-0000-0000-0000-0000000000ee';
