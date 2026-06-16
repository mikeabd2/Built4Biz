-- =====================================================================
-- Built for Biz — Supabase schema
-- Run this once in the Supabase SQL Editor (Dashboard -> SQL -> New query).
-- Safe to re-run: policies/triggers are dropped and recreated idempotently.
--
-- UPGRADING from the earlier (profiles-based) version? Run these first:
--   drop table if exists public.one_on_ones cascade;
--   drop table if exists public.referrals  cascade;
--   drop table if exists public.profiles   cascade;
-- =====================================================================

-- ---------- TABLES ----------------------------------------------------

-- A member is a roster entry. It exists whether or not the person has
-- logged in yet. When someone signs up with a matching email, their auth
-- account is linked to their member row (user_id) automatically.
create table if not exists public.members (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid unique references auth.users(id) on delete set null,
  full_name   text not null default '',
  company     text default '',
  category    text default '',
  email       text unique,
  phone       text default '',
  website     text default '',
  bio         text default '',
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.referrals (
  id            uuid primary key default gen_random_uuid(),
  giver_id      uuid not null references public.members(id) on delete cascade,
  receiver_id   uuid not null references public.members(id) on delete cascade,
  contact_name  text not null default '',
  contact_phone text default '',
  contact_email text default '',
  description   text default '',
  status        text not null default 'new',  -- new | contacted | in_progress | closed_won | closed_lost
  referral_date date not null default current_date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists referrals_giver_idx    on public.referrals(giver_id);
create index if not exists referrals_receiver_idx on public.referrals(receiver_id);
create index if not exists referrals_date_idx     on public.referrals(referral_date);

create table if not exists public.one_on_ones (
  id                  uuid primary key default gen_random_uuid(),
  member_id           uuid not null references public.members(id) on delete cascade,
  met_with_id         uuid references public.members(id) on delete set null,
  meeting_date        date not null default current_date,
  strategic_alliances text[] not null default '{}',
  notes               text default '',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists one_on_ones_member_idx on public.one_on_ones(member_id);

-- ---------- HELPER FUNCTIONS (security definer to avoid RLS recursion) -

create or replace function public.current_member_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.members where user_id = auth.uid() limit 1;
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select is_admin from public.members where user_id = auth.uid() limit 1),
    false
  );
$$;

-- ---------- ROW LEVEL SECURITY ----------------------------------------

alter table public.members     enable row level security;
alter table public.referrals   enable row level security;
alter table public.one_on_ones enable row level security;

-- Members: everyone signed in can read the directory.
drop policy if exists "members read members" on public.members;
create policy "members read members" on public.members
  for select to authenticated using (true);

-- A member can edit their own row; admins can edit anyone.
drop policy if exists "update own or admin" on public.members;
create policy "update own or admin" on public.members
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- Only admins add or remove roster entries (signups are handled by a trigger).
drop policy if exists "admin inserts member" on public.members;
create policy "admin inserts member" on public.members
  for insert to authenticated with check (public.is_admin());

drop policy if exists "admin deletes member" on public.members;
create policy "admin deletes member" on public.members
  for delete to authenticated using (public.is_admin());

-- Referrals: visible to the whole group (transparency / accountability).
drop policy if exists "members read referrals" on public.referrals;
create policy "members read referrals" on public.referrals
  for select to authenticated using (true);

-- You can log a referral as yourself; admins can log on anyone's behalf.
drop policy if exists "insert referral" on public.referrals;
create policy "insert referral" on public.referrals
  for insert to authenticated
  with check (giver_id = public.current_member_id() or public.is_admin());

drop policy if exists "update referral" on public.referrals;
create policy "update referral" on public.referrals
  for update to authenticated
  using (
    giver_id = public.current_member_id()
    or receiver_id = public.current_member_id()
    or public.is_admin()
  )
  with check (
    giver_id = public.current_member_id()
    or receiver_id = public.current_member_id()
    or public.is_admin()
  );

drop policy if exists "delete referral" on public.referrals;
create policy "delete referral" on public.referrals
  for delete to authenticated
  using (giver_id = public.current_member_id() or public.is_admin());

-- 1-on-1s are private to the owner; admins can see and manage all.
drop policy if exists "read 1on1" on public.one_on_ones;
create policy "read 1on1" on public.one_on_ones
  for select to authenticated
  using (member_id = public.current_member_id() or public.is_admin());

drop policy if exists "insert 1on1" on public.one_on_ones;
create policy "insert 1on1" on public.one_on_ones
  for insert to authenticated
  with check (member_id = public.current_member_id() or public.is_admin());

drop policy if exists "update 1on1" on public.one_on_ones;
create policy "update 1on1" on public.one_on_ones
  for update to authenticated
  using (member_id = public.current_member_id() or public.is_admin())
  with check (member_id = public.current_member_id() or public.is_admin());

drop policy if exists "delete 1on1" on public.one_on_ones;
create policy "delete 1on1" on public.one_on_ones
  for delete to authenticated
  using (member_id = public.current_member_id() or public.is_admin());

-- ---------- TRIGGERS --------------------------------------------------

-- When a new auth user signs up, link them to their roster row by email.
-- Roster-only: if there's no matching unclaimed roster entry, the signup is
-- rejected (the auth user insert rolls back).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare existing uuid;
begin
  select id into existing
  from public.members
  where lower(email) = lower(new.email) and user_id is null
  limit 1;

  if existing is null then
    raise exception 'This email is not on the group roster.'
      using errcode = 'check_violation';
  end if;

  update public.members set user_id = new.id where id = existing;
  return new;
end;
$$;

-- Public, read-only check so the signup form can tell someone their email
-- isn't on the roster *before* attempting to register. Returns only a boolean.
create or replace function public.email_on_roster(p_email text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members
    where lower(email) = lower(p_email) and user_id is null
  );
$$;

grant execute on function public.email_on_roster(text) to anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists members_touch on public.members;
create trigger members_touch before update on public.members
  for each row execute function public.touch_updated_at();

drop trigger if exists referrals_touch on public.referrals;
create trigger referrals_touch before update on public.referrals
  for each row execute function public.touch_updated_at();

drop trigger if exists one_on_ones_touch on public.one_on_ones;
create trigger one_on_ones_touch before update on public.one_on_ones
  for each row execute function public.touch_updated_at();
