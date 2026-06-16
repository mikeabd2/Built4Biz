-- =====================================================================
-- Built for Biz — enforce roster-only signups
-- Run this once in the Supabase SQL Editor. Safe to re-run.
--
-- After this:
--   * Signing up with an email that is NOT on the roster fails.
--   * Signing up with a roster email links that account to its entry.
--   * The signup form can pre-check via email_on_roster() for a clean message.
-- =====================================================================

-- Reject signups whose email isn't an unclaimed roster entry.
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

-- Public, read-only roster check for the signup form. Returns only a boolean.
create or replace function public.email_on_roster(p_email text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members
    where lower(email) = lower(p_email) and user_id is null
  );
$$;

grant execute on function public.email_on_roster(text) to anon, authenticated;
