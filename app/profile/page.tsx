"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { Nav } from "@/components/Nav";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

export default function ProfilePage() {
  return (
    <AuthGuard>
      <Nav />
      <ProfileForm />
    </AuthGuard>
  );
}

type Form = {
  full_name: string;
  company: string;
  category: string;
  email: string;
  phone: string;
  website: string;
  bio: string;
  facebook: string;
  instagram: string;
  linkedin: string;
  tiktok: string;
  youtube: string;
  x_twitter: string;
  google_review_url: string;
};

const EMPTY: Form = {
  full_name: "", company: "", category: "", email: "",
  phone: "", website: "", bio: "",
  facebook: "", instagram: "", linkedin: "",
  tiktok: "", youtube: "", x_twitter: "",
  google_review_url: "",
};

const SOCIALS: { key: keyof Form; label: string; placeholder: string; icon: string }[] = [
  { key: "facebook",  label: "Facebook",  placeholder: "facebook.com/yourpage",       icon: "f" },
  { key: "instagram", label: "Instagram", placeholder: "instagram.com/yourhandle",     icon: "in" },
  { key: "linkedin",  label: "LinkedIn",  placeholder: "linkedin.com/in/yourprofile",  icon: "li" },
  { key: "tiktok",    label: "TikTok",    placeholder: "tiktok.com/@yourhandle",        icon: "tt" },
  { key: "youtube",   label: "YouTube",   placeholder: "youtube.com/@yourchannel",      icon: "yt" },
  { key: "x_twitter", label: "X / Twitter", placeholder: "x.com/yourhandle",           icon: "𝕏" },
];

function ProfileForm() {
  const { member, user, refreshMember } = useAuth();
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!member) return;
    setForm({
      full_name:        member.full_name        ?? "",
      company:          member.company          ?? "",
      category:         member.category         ?? "",
      email:            member.email            ?? user?.email ?? "",
      phone:            member.phone            ?? "",
      website:          member.website          ?? "",
      bio:              member.bio              ?? "",
      facebook:         member.facebook         ?? "",
      instagram:        member.instagram        ?? "",
      linkedin:         member.linkedin         ?? "",
      tiktok:           member.tiktok           ?? "",
      youtube:          member.youtube          ?? "",
      x_twitter:        member.x_twitter        ?? "",
      google_review_url: member.google_review_url ?? "",
    });
  }, [member, user]);

  const set = (k: keyof Form) => (v: string) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const save = async () => {
    if (!member || !form) return;
    setBusy(true);
    setErr(null);
    setSaved(false);
    const { error } = await supabase.from("members").update(form).eq("id", member.id);
    setBusy(false);
    if (error) {
      setErr(error.message);
    } else {
      setSaved(true);
      await refreshMember();
      setTimeout(() => setSaved(false), 2500);
    }
  };

  if (!form) {
    return (
      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
        <p className="text-ink/40">Loading your profile…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
      <h1 className="font-display text-3xl text-ink">My profile</h1>
      <p className="text-ink/55 text-sm mt-1">
        This is what the rest of the group sees in the directory.
      </p>

      {/* ── Basic info ── */}
      <h2 className="font-display text-lg text-ink mt-8 mb-3">Basic info</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Full name"         value={form.full_name} onChange={set("full_name")} />
        <Field label="Business category" value={form.category}  onChange={set("category")}  placeholder="e.g. Realtor, Financial Advisor" />
        <Field label="Company"           value={form.company}   onChange={set("company")}   full />
        <Field label="Email"             value={form.email}     onChange={set("email")}     type="email" />
        <Field label="Phone"             value={form.phone}     onChange={set("phone")}     type="tel" />
        <Field label="Website"           value={form.website}   onChange={set("website")}   full placeholder="yourbusiness.com" />
      </div>

      <label className="block mt-4">
        <span className="text-xs font-medium text-ink/60 uppercase tracking-wide">Short bio</span>
        <textarea
          value={form.bio}
          onChange={(e) => set("bio")(e.target.value)}
          rows={4}
          placeholder="What you do, who you help, and the kind of referral that's a great fit for you."
          className="mt-1 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink outline-none focus:border-pine focus:ring-2 focus:ring-pine/20 resize-y"
        />
      </label>

      {/* ── Social media ── */}
      <h2 className="font-display text-lg text-ink mt-8 mb-1">Social media</h2>
      <p className="text-ink/50 text-sm mb-3">
        Add any profiles you want the group to see. Leave blank to hide.
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        {SOCIALS.map((s) => (
          <label key={s.key} className="block">
            <span className="text-xs font-medium text-ink/60 uppercase tracking-wide flex items-center gap-1.5">
              <span className="inline-grid place-items-center w-5 h-5 rounded bg-ink/10 text-ink text-[10px] font-bold shrink-0">
                {s.icon}
              </span>
              {s.label}
            </span>
            <input
              type="url"
              value={(form as Record<string, string>)[s.key]}
              placeholder={s.placeholder}
              onChange={(e) => set(s.key)(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink outline-none focus:border-pine focus:ring-2 focus:ring-pine/20"
            />
          </label>
        ))}
      </div>

      {/* ── Google review ── */}
      <h2 className="font-display text-lg text-ink mt-8 mb-1">Google review link</h2>
      <p className="text-ink/50 text-sm mb-3">
        Paste your Google review URL and the group will see a "Leave a review" button on your card.
        To find your link: search your business on Google → click "Get more reviews" → copy the link.
      </p>
      <Field
        label="Google review URL"
        value={form.google_review_url}
        onChange={set("google_review_url")}
        full
        placeholder="https://g.page/r/…/review"
      />

      {err && (
        <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>
      )}

      <div className="flex items-center gap-3 mt-7">
        <button
          onClick={save}
          disabled={busy}
          className="rounded-xl bg-pine hover:bg-pine-dark text-paper px-5 py-2.5 font-medium transition-colors disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save profile"}
        </button>
        {saved && <span className="text-sm text-pine-dark">Saved.</span>}
      </div>
    </main>
  );
}

function Field({
  label, value, onChange, type = "text", placeholder, full,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; full?: boolean;
}) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-xs font-medium text-ink/60 uppercase tracking-wide">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink outline-none focus:border-pine focus:ring-2 focus:ring-pine/20"
      />
    </label>
  );
}
