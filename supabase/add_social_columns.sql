-- Built for Biz — add social media + Google review columns to members
-- Run once in the Supabase SQL Editor. Safe to re-run (uses IF NOT EXISTS).

alter table public.members
  add column if not exists facebook          text not null default '',
  add column if not exists instagram         text not null default '',
  add column if not exists linkedin          text not null default '',
  add column if not exists tiktok            text not null default '',
  add column if not exists youtube           text not null default '',
  add column if not exists x_twitter        text not null default '',
  add column if not exists google_review_url text not null default '';
