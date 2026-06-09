import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  // Surfaces a clear message during local dev if env vars are missing.
  console.warn(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Add them to .env.local (local) and your Vercel project settings (prod)."
  );
}

// Fall back to harmless placeholders if env vars are missing so the app
// builds and shows a clear console warning instead of crashing at import.
// Real NEXT_PUBLIC_* values are inlined at build time on Vercel.
export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  anon || "placeholder-anon-key",
  { auth: { persistSession: true, autoRefreshToken: true } }
);

export type Profile = {
  id: string;
  full_name: string;
  company: string;
  category: string;
  email: string;
  phone: string;
  website: string;
  bio: string;
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
