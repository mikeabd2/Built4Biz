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
};

function ProfileForm() {
  const { member, user, refreshMember } = useAuth();
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!member) return;
    setForm({
      full_name: member.full_name ?? "",
      company: member.company ?? "",
      category: member.category ?? "",
      email: member.email ?? user?.email ?? "",
      phone: member.phone ?? "",
      website: member.website ?? "",
      bio: member.bio ?? "",
    });
  }, [member, user]);

  const set = (k: keyof Form) => (v: string) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const save = async () => {
    if (!member || !form) return;
    setBusy(true);
    setErr(null);
    setSaved(false);
    const { error } = await supabase
      .from("members")
      .update(form)
      .eq("id", member.id);
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

      <div className="mt-7 grid sm:grid-cols-2 gap-4">
        <Field label="Full name" value={form.full_name} onChange={set("full_name")} />
        <Field label="Business category" value={form.category} onChange={set("category")} placeholder="e.g. Realtor, Financial Advisor" />
        <Field label="Company" value={form.company} onChange={set("company")} full />
        <Field label="Email" value={form.email} onChange={set("email")} type="email" />
        <Field label="Phone" value={form.phone} onChange={set("phone")} type="tel" />
        <Field label="Website" value={form.website} onChange={set("website")} full placeholder="yourbusiness.com" />
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

      {err && (
        <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>
      )}

      <div className="flex items-center gap-3 mt-6">
        <button onClick={save} disabled={busy} className="rounded-xl bg-pine hover:bg-pine-dark text-paper px-5 py-2.5 font-medium transition-colors disabled:opacity-60">
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
