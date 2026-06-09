-- =====================================================================
-- Referral Circle — Supabase schema
-- Run this once in the Supabase SQL Editor (Dashboard → SQL → New query).
-- Safe to re-run: it drops and recreates policies/triggers idempotently.
-- =====================================================================

-- ---------- TABLES ----------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  company     text default '',
  category    text default '',
  email       text default '',
  phone       text default '',
  website     text default '',
  bio         text default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.referrals (
  id            uuid primary key default gen_random_uuid(),
  giver_id      uuid not null references public.profiles(id) on delete cascade,
  receiver_id   uuid not null references public.profiles(id) on delete cascade,
  contact_name  text not null default '',
  contact_phone text default '',
  contact_email text default '',
  description   text default '',
  status        text not null default 'new',  -- new | contacted | in_progress | closed_won | closed_lost
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists referrals_giver_idx    on public.referrals(giver_id);
create index if not exists referrals_receiver_idx on public.referrals(receiver_id);

create table if not exists public.one_on_ones (
  id                  uuid primary key default gen_random_uuid(),
  member_id           uuid not null references public.profiles(id) on delete cascade,
  met_with_id         uuid references public.profiles(id) on delete set null,
  meeting_date        date not null default current_date,
  strategic_alliances text[] not null default '{}',
  notes               text default '',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists one_on_ones_member_idx on public.one_on_ones(member_id);

-- ---------- ROW LEVEL SECURITY ----------------------------------------

alter table public.profiles  enable row level security;
alter table public.referrals enable row level security;
alter table public.one_on_ones enable row level security;

-- Profiles: every signed-in member can read the directory.
drop policy if exists "members read profiles" on public.profiles;
create policy "members read profiles" on public.profiles
  for select to authenticated using (true);

-- A member can create and edit only their own profile row.
drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- Referrals: members can see all referral activity in the group (transparency).
-- To make referrals PRIVATE (each member sees only their own), replace the
-- USING clause below with:
--   using (auth.uid() = giver_id or auth.uid() = receiver_id)
drop policy if exists "members read referrals" on public.referrals;
create policy "members read referrals" on public.referrals
  for select to authenticated using (true);

-- Only the giver can create a referral, and only as themselves.
drop policy if exists "giver inserts referral" on public.referrals;
create policy "giver inserts referral" on public.referrals
  for insert to authenticated with check (auth.uid() = giver_id);

-- Giver or receiver can update (e.g. the receiver advances the status).
drop policy if exists "giver or receiver updates referral" on public.referrals;
create policy "giver or receiver updates referral" on public.referrals
  for update to authenticated
  using (auth.uid() = giver_id or auth.uid() = receiver_id)
  with check (auth.uid() = giver_id or auth.uid() = receiver_id);

-- Only the giver can delete a referral they created.
drop policy if exists "giver deletes referral" on public.referrals;
create policy "giver deletes referral" on public.referrals
  for delete to authenticated using (auth.uid() = giver_id);

-- 1-on-1s are PRIVATE: each member can only see and manage their own notes.
drop policy if exists "owner reads own 1on1s" on public.one_on_ones;
create policy "owner reads own 1on1s" on public.one_on_ones
  for select to authenticated using (auth.uid() = member_id);

drop policy if exists "owner inserts 1on1" on public.one_on_ones;
create policy "owner inserts 1on1" on public.one_on_ones
  for insert to authenticated with check (auth.uid() = member_id);

drop policy if exists "owner updates 1on1" on public.one_on_ones;
create policy "owner updates 1on1" on public.one_on_ones
  for update to authenticated
  using (auth.uid() = member_id) with check (auth.uid() = member_id);

drop policy if exists "owner deletes 1on1" on public.one_on_ones;
create policy "owner deletes 1on1" on public.one_on_ones
  for delete to authenticated using (auth.uid() = member_id);

-- ---------- TRIGGERS --------------------------------------------------

-- Create a profile row automatically when a new user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at fresh on edits.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists referrals_touch on public.referrals;
create trigger referrals_touch before update on public.referrals
  for each row execute function public.touch_updated_at();

drop trigger if exists one_on_ones_touch on public.one_on_ones;
create trigger one_on_ones_touch before update on public.one_on_ones
  for each row execute function public.touch_updated_at();
