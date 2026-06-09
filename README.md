# Built for Biz

A private web app for a networking group to share contacts, pass referrals,
track 1-on-1s, and report on activity. Next.js 14 (App Router) + Supabase +
Tailwind.

Screens:

- **Directory** — every member's contact card, searchable, with call · text ·
  email · website and a "Refer to …" shortcut.
- **Referrals** — log a referral (with a date), track it through
  _New → Contacted → In progress → Closed_. Receivers can advance the status.
- **1-on-1s** — log a meeting: date, who you met, strategic-alliance categories,
  and what you learned. Private to you (admins can see/add for anyone).
- **Reports** — referral activity by week or month, with presets (this/last
  week, this/last month, this year, all time) and custom date ranges, plus a
  per-member given/received table.
- **My profile** — each member edits what the group sees.
- **Roster** (admins only) — add/edit members, manage admins, see who has
  joined.

## How membership works

Members are **roster entries** that exist whether or not the person has logged
in. When someone signs up with an email that matches a roster entry, their
login is linked to that entry automatically. This lets you pre-load the whole
roster and lets admins log referrals/1-on-1s for people who haven't signed up
yet.

## Setup

### 1. Create the database
1. New Supabase project → **SQL Editor → New query** → paste `supabase/schema.sql` → Run.
2. New query → paste `supabase/seed_roster.sql` → Run. This loads the 33-member
   Built 4 Biz roster (re-running is safe; it matches on email).
3. **Settings → API**: copy the Project URL and the anon/public key.

### 2. Auth
- **Authentication → Providers → Email**: enabled.
- For easy onboarding, you can turn **off** "Confirm email" so members are in
  immediately after signing up. If you keep it on, set up custom SMTP
  (Authentication → Emails), since Supabase's built-in email is rate-limited.

### 3. Run / deploy
```bash
cp .env.local.example .env.local   # fill in URL + anon key
npm install
npm run dev
```
Deploy to Vercel: push to GitHub, import the repo, add
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, deploy.

## Admins

The seed marks **Gerard Giacona (Chair)**, **Brad Quail (Co-Chair)**, and
**Michael Abdelnour** as admins. Admins can:
- manage the roster (add/edit/remove members, grant or revoke admin),
- log referrals and 1-on-1s on any member's behalf (handy for backfilling),
- see all 1-on-1s.

Admin status is just the `is_admin` flag on a member. Change admins anytime from
the **Roster** tab, or in SQL:
```sql
update public.members set is_admin = true where email = 'someone@example.com';
```

## Notes & customizations

- **Strategic alliances:** the 1-on-1 options are the `STRATEGIC_ALLIANCES` list
  in `lib/ui.ts`.
- **Referral privacy:** referrals are group-visible for accountability and
  reporting. To restrict, edit the `members read referrals` policy in
  `schema.sql`.
- **Reports scope:** reports use each referral's `referral_date`, so admin
  backfilled entries land in the right week/month.
- **Brand:** colors and fonts live in `tailwind.config.ts` and `app/layout.tsx`.
