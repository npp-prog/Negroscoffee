-- Claim invites: an admin creates a private one-time link for a shop; the owner signs in, opens
-- it and becomes the verified owner without sending proof. Only a SHA-256 hash of the token is
-- stored, so a copy of this table can't be used to claim shops.

create table public.shop_claim_invites (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references public.profiles (id) on delete set null,
  revoked_at timestamptz
);
create index shop_claim_invites_shop_idx on public.shop_claim_invites (shop_id, created_at desc);
alter table public.shop_claim_invites enable row level security;
revoke all on public.shop_claim_invites from anon, authenticated;
grant select, insert, update, delete on public.shop_claim_invites to authenticated;
grant all on public.shop_claim_invites to service_role;

create policy "shop_claim_invites: admin all" on public.shop_claim_invites
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create function public.claim_invite_hash(p_token text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');
$$;

-- What an invite link is for, so the page can show the shop before sign-in.
-- status: valid | used | expired | revoked | owned (someone else already manages the shop)
create function public.claim_invite_info(p_token text)
returns table (shop_id uuid, shop_name text, shop_slug text, status text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_inv public.shop_claim_invites;
  v_shop public.shops;
begin
  if p_token is null or char_length(p_token) < 20 or char_length(p_token) > 100 then
    return;
  end if;
  select * into v_inv from public.shop_claim_invites where token_hash = public.claim_invite_hash(p_token);
  if v_inv.id is null then
    return;
  end if;
  select * into v_shop from public.shops where id = v_inv.shop_id;
  return query select v_shop.id, v_shop.name, v_shop.slug,
    case
      when v_inv.used_at is not null then 'used'
      when v_inv.revoked_at is not null then 'revoked'
      when v_inv.expires_at < now() then 'expired'
      when v_shop.claimed_by is not null and v_shop.claimed_by is distinct from auth.uid() then 'owned'
      else 'valid'
    end;
end;
$$;
revoke all on function public.claim_invite_info(text) from public;
grant execute on function public.claim_invite_info(text) to anon, authenticated;

-- Accept an invite as the signed-in user. Returns the shop id.
create function public.accept_claim_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_inv public.shop_claim_invites;
  v_owner uuid;
begin
  if v_uid is null then
    raise exception 'sign in first' using errcode = 'insufficient_privilege';
  end if;
  select * into v_inv from public.shop_claim_invites
  where token_hash = public.claim_invite_hash(p_token)
  for update;
  if v_inv.id is null or v_inv.used_at is not null or v_inv.revoked_at is not null
     or v_inv.expires_at < now() then
    raise exception 'invite_invalid: this invite link is no longer valid' using errcode = 'check_violation';
  end if;
  select claimed_by into v_owner from public.shops where id = v_inv.shop_id for update;
  if v_owner is not null and v_owner <> v_uid then
    raise exception 'invite_owned: this shop already has an owner' using errcode = 'check_violation';
  end if;
  update public.shops set claimed_by = v_uid, verified_at = coalesce(verified_at, now())
  where id = v_inv.shop_id;
  update public.profiles set role = 'owner' where id = v_uid and role = 'user';
  update public.shop_claim_invites set used_at = now(), used_by = v_uid where id = v_inv.id;
  return v_inv.shop_id;
end;
$$;
revoke all on function public.accept_claim_invite(text) from public;
grant execute on function public.accept_claim_invite(text) to authenticated;
