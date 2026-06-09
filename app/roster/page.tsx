"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { Nav } from "@/components/Nav";
import { useAuth } from "@/components/AuthProvider";
import { supabase, type Member } from "@/lib/supabaseClient";
import { initials } from "@/lib/ui";

export default function RosterPage() {
  return (
    <AuthGuard>
      <Nav />
      <Roster />
    </AuthGuard>
  );
}

const BLANK = {
  full_name: "",
  company: "",
  category: "",
  email: "",
  phone: "",
  website: "",
  bio: "",
  is_admin: false,
};
type FormState = typeof BLANK & { id?: string };

function Roster() {
  const { isAdmin, refreshMember } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<FormState | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("members").select("*").order("full_name");
    setMembers((data ?? []) as Member[]);
    setLoaded(true);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return members;
    return members.filter((m) =>
      [m.full_name, m.company, m.category, m.email].join(" ").toLowerCase().includes(t)
    );
  }, [q, members]);

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-16 text-center">
        <h1 className="font-display text-2xl text-ink">Admins only</h1>
        <p className="text-ink/55 mt-2">
          The roster manager is available to group admins. Ask a Chair to grant you access.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">Roster</h1>
          <p className="text-ink/55 text-sm mt-1">
            {members.length} members. Add or edit entries and manage admins.
          </p>
        </div>
        <button
          onClick={() => setEditing({ ...BLANK })}
          className="rounded-xl bg-pine hover:bg-pine-dark text-paper px-4 py-2.5 text-sm font-medium transition-colors"
        >
          Add member
        </button>
      </div>

      {editing && (
        <EditForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
            await refreshMember();
          }}
        />
      )}

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search the roster"
        className="w-full sm:w-72 rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink outline-none focus:border-pine focus:ring-2 focus:ring-pine/20 mt-6"
      />

      {!loaded ? (
        <p className="text-ink/40 mt-8">Loading roster…</p>
      ) : (
        <ul className="mt-5 space-y-2">
          {filtered.map((m) => (
            <li key={m.id} className="rounded-xl border border-line bg-white px-4 py-3 flex items-center gap-3">
              <span className="shrink-0 grid place-items-center w-9 h-9 rounded-full bg-sage text-pine-dark font-display">
                {initials(m.full_name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-ink truncate">{m.full_name || "—"}</span>
                  {m.is_admin && (
                    <span className="text-[11px] text-amber border border-amber/40 rounded-full px-1.5 py-0.5">Admin</span>
                  )}
                  <span
                    className={`text-[11px] rounded-full px-1.5 py-0.5 border ${
                      m.user_id ? "text-pine-dark border-pine/30 bg-sage" : "text-ink/45 border-line"
                    }`}
                  >
                    {m.user_id ? "Joined" : "Not joined"}
                  </span>
                </div>
                <p className="text-xs text-ink/50 truncate">
                  {[m.company, m.email].filter(Boolean).join(" · ")}
                </p>
              </div>
              <button
                onClick={() =>
                  setEditing({
                    id: m.id,
                    full_name: m.full_name ?? "",
                    company: m.company ?? "",
                    category: m.category ?? "",
                    email: m.email ?? "",
                    phone: m.phone ?? "",
                    website: m.website ?? "",
                    bio: m.bio ?? "",
                    is_admin: m.is_admin,
                  })
                }
                className="shrink-0 text-sm text-pine hover:underline"
              >
                Edit
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-ink/40 mt-6">
        Members are linked to a login automatically when someone signs up with the matching
        email. &quot;Not joined&quot; means they&apos;re on the roster but haven&apos;t created an
        account yet.
      </p>
    </main>
  );
}

function EditForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: FormState;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { member } = useAuth();
  const [form, setForm] = useState<FormState>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isSelf = form.id && member?.id === form.id;

  const set = (k: keyof FormState, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.full_name.trim()) {
      setErr("Add a name.");
      return;
    }
    setBusy(true);
    setErr(null);
    const payload = {
      full_name: form.full_name.trim(),
      company: form.company.trim(),
      category: form.category.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim(),
      website: form.website.trim(),
      bio: form.bio.trim(),
      is_admin: form.is_admin,
    };
    const res = form.id
      ? await supabase.from("members").update(payload).eq("id", form.id)
      : await supabase.from("members").insert(payload);
    setBusy(false);
    if (res.error) setErr(res.error.message);
    else onSaved();
  };

  const remove = async () => {
    if (!form.id) return;
    setBusy(true);
    const { error } = await supabase.from("members").delete().eq("id", form.id);
    setBusy(false);
    if (error) setErr(error.message);
    else onSaved();
  };

  return (
    <div className="rounded-2xl border border-line bg-white p-5 mt-5 rise">
      <h2 className="font-display text-xl text-ink">{form.id ? "Edit member" : "Add member"}</h2>

      <div className="grid sm:grid-cols-2 gap-4 mt-4">
        <Field label="Full name" value={form.full_name} onChange={(v) => set("full_name", v)} />
        <Field label="Business category" value={form.category} onChange={(v) => set("category", v)} />
        <Field label="Company" value={form.company} onChange={(v) => set("company", v)} />
        <Field label="Email" value={form.email} onChange={(v) => set("email", v)} type="email" />
        <Field label="Phone" value={form.phone} onChange={(v) => set("phone", v)} />
        <Field label="Website" value={form.website} onChange={(v) => set("website", v)} />
      </div>

      <label className="flex items-center gap-2 mt-4 cursor-pointer">
        <input
          type="checkbox"
          checked={form.is_admin}
          disabled={!!isSelf}
          onChange={(e) => set("is_admin", e.target.checked)}
          className="w-4 h-4 accent-pine"
        />
        <span className="text-sm text-ink/70">
          Admin (can manage the roster and log on anyone&apos;s behalf)
          {isSelf && <span className="text-ink/40"> — you can&apos;t change your own admin status</span>}
        </span>
      </label>

      {err && <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}

      <div className="flex items-center gap-3 mt-5">
        <button onClick={save} disabled={busy} className="rounded-xl bg-pine hover:bg-pine-dark text-paper px-5 py-2.5 font-medium transition-colors disabled:opacity-60">
          {busy ? "Saving…" : "Save"}
        </button>
        <button onClick={onClose} className="text-sm text-ink/55 hover:text-ink">Cancel</button>
        {form.id && !isSelf && (
          <button onClick={remove} disabled={busy} className="ml-auto text-sm text-red-700 hover:underline">
            Remove from roster
          </button>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-ink/60 uppercase tracking-wide">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink outline-none focus:border-pine focus:ring-2 focus:ring-pine/20"
      />
    </label>
  );
}
