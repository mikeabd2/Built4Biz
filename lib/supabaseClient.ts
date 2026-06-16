import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.warn(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Add them to .env.local (local) and your Vercel project settings (prod)."
  );
}

export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  anon || "placeholder-anon-key",
  { auth: { persistSession: true, autoRefreshToken: true } }
);

export type Member = {
  id: string;
  user_id: string | null;
  full_name: string;
  company: string;
  category: string;
  email: string | null;
  phone: string;
  website: string;
  bio: string;
  is_admin: boolean;
  facebook: string;
  instagram: string;
  linkedin: string;
  tiktok: string;
  youtube: string;
  x_twitter: string;
  google_review_url: string;
};

export type Referral = {
  id: string;
  giver_id: string;
  receiver_id: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  description: string;
  status: string;
  referral_date: string;
  created_at: string;
};

export type OneOnOne = {
  id: string;
  member_id: string;
  met_with_id: string | null;
  meeting_date: string;
  strategic_alliances: string[];
  notes: string;
  created_at: string;
};
