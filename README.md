# Built for Biz

A small, private web app for a networking group to share contact info, pass
referrals, and track 1-on-1 meetings. Built with Next.js 14 (App Router) +
Supabase + Tailwind.

Screens:

- **Directory** — every member's contact card, searchable by name / company /
  category, with call · text · email · website buttons and a "Refer to …"
  shortcut.
- **Referrals** — log a referral for another member, then track it through
  _New → Contacted → In progress → Closed_. Receivers can advance the status.
- **1-on-1s** — log a one-to-one meeting: the date, who you met with, the
  strategic-alliance categories you discussed, and what you learned. These
  notes are **private to you**.
- **My profile** — each member edits what the group sees about them.

Plus a simple **Home** dashboard: referrals given / received, 1-on-1s logged,
member count, and recent activity.

---

## Setup (about 10 minutes)

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Once it's ready, open **SQL Editor → New query**, paste in the contents of
   `supabase/schema.sql`, and **Run**. This creates the tables, row-level
   security, and the trigger that gives each new user a profile.
3. Go to **Project Settings → API** and copy the **Project URL** and the
   **anon / public** key.

### 2. Configure auth

- In **Authentication → Providers → Email**, make sure Email is enabled.
- For a smooth signup with a small group, you can turn **off** "Confirm email"
  (Authentication → Sign In / Providers) so members are signed in immediately
  after creating an account. Leave it on if you'd rather verify emails — in
  that case set up custom SMTP (Authentication → Emails) so confirmation
  messages actually deliver, since Supabase's built-in email is rate-limited.

### 3. Run locally

```bash
cp .env.local.example .env.local   # then fill in your URL + anon key
npm install
npm run dev
```

Open http://localhost:3000.

### 4. Deploy to Vercel

1. Push this folder to a GitHub repo.
2. In Vercel, **Add New → Project** and import the repo.
3. Add the two environment variables (**Settings → Environment Variables**):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy.

---

## How members join

Anyone with the app URL can create an account from the login screen. For a
trusted group that's usually fine — just share the link. To lock it down later,
a couple of options:

- **Invite-only:** turn off open signups in Supabase and add members yourself
  via **Authentication → Users → Add user**.
- **Allowlist:** keep a table of approved emails and check it in the signup
  flow.

## Notes & easy customizations

- **Privacy of referrals:** by default every member can read all referral
  activity (good for accountability in a referral group). To make referrals
  private to the two people involved, swap the `members read referrals` policy
  in `schema.sql` for the commented-out version right above it, and re-run.
- **Categories:** the profile "Business category" is free text. If your group
  uses fixed categories (one per seat, BNI-style), change that input to a
  `<select>` in `app/profile/page.tsx`.
- **Strategic alliances:** the 1-on-1 alliance options live in the
  `STRATEGIC_ALLIANCES` list in `lib/ui.ts` — add, remove, or reword them to
  match your group.
- **1-on-1 privacy:** 1-on-1 notes are owner-only. If you'd ever want the
  person you met with to see the entry too, broaden the `owner reads own 1on1s`
  policy in `schema.sql` to also allow `auth.uid() = met_with_id`.
- **Brand:** colors and fonts live in `tailwind.config.ts` and
  `app/layout.tsx`.
