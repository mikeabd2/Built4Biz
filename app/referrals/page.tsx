"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { Nav } from "@/components/Nav";
import { useAuth } from "@/components/AuthProvider";
import { supabase, type Referral, type Member } from "@/lib/supabaseClient";
import { STATUSES, STATUS_LABEL, STATUS_CLASS, fmtDate, firstName } from "@/lib/ui";

export default function ReferralsPage() {
  return (
    <AuthGuard>
      <Nav />
      <Referrals />
    </AuthGuard>
  );
}

type NameMap = Record<string, string>;

function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function Referrals() {
  const { member, isAdmin } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [names, setNames] = useState<NameMap>({});
  const [refs, setRefs] = useState<Referral[]>([]);
  const [tab, setTab] = useState<"given" | "received">("given");
  const [showForm, setShowForm] = useState(false);
  const [preselect, setPreselect] = useState<string>("");

  const load = async () => {
    if (!member) return;
    const { data: ppl } = await supabase
      .from("members")
      .select("*")
      .order("full_name", { ascending: true });
    const list = (ppl ?? []) as Member[];
    setMembers(list);
    const map: NameMap = {};
    list.forEach((p) => (map[p.id] = p.full_name || "Member"));
    setNames(map);

    const { data } = await supabase
      .from("referrals")
      .select("*")
      .or(`giver_id.eq.${member.id},receiver_id.eq.${member.id}`)
      .order("referral_date", { ascending: false });
    setRefs((data ?? []) as Referral[]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member]);

  useEffect(() => {
    const to = new URLSearchParams(window.location.search).get("to");
    if (to) {
      setPreselect(to);
      setShowForm(true);
    }
  }, []);

  const given = useMemo(() => refs.filter((r) => r.giver_id === member?.id), [refs, member]);
  const received = useMemo(() => refs.filter((r) => r.receiver_id === member?.id), [refs, member]);
  const shown = tab === "given" ? given : received;

  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">Referrals</h1>
          <p className="text-ink/55 text-sm mt-1">
            Pass business to members and track what comes back.
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-xl bg-pine hover:bg-pine-dark text-paper px-4 py-2.5 text-sm font-medium transition-colors"
        >
          {showForm ? "Close" : "Pass a referral"}
        </button>
      </div>

      {showForm && member && (
        <NewReferral
          members={members}
          myId={member.id}
          isAdmin={isAdmin}
          preselect={preselect}
          onDone={() => {
            setShowForm(false);
            setPreselect("");
            load();
          }}
        />
      )}

      <div className="flex gap-1 mt-8 border-b border-line">
        <Tab active={tab === "given"} onClick={() => setTab("given")} label={`Given (${given.length})`} />
        <Tab active={tab === "received"} onClick={() => setTab("received")} label={`Received (${received.length})`} />
      </div>

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white/50 p-8 text-center mt-6">
          <p className="text-ink/55">
            {tab === "given" ? "You haven't passed any referrals yet." : "No referrals have come your way yet."}
          </p>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {shown.map((r) => (
            <ReferralRow
              key={r.id}
              referral={r}
              tab={tab}
              otherName={tab === "given" ? names[r.receiver_id] : names[r.giver_id]}
              canEditStatus={tab === "received" || r.giver_id === member?.id || isAdmin}
              onChanged={load}
            />
          ))}
        </ul>
      )}
    </main>
  );
}

function Tab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium -mb-px border-b-2 transition-colors ${
        active ? "border-pine text-pine" : "border-transparent text-ink/50 hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}

function NewReferral({
  members, myId, isAdmin, preselect, onDone,
}: {
  members: Member[]; myId: string; isAdmin: boolean; preselect: string; onDone: () => void;
}) {
  const [giver, setGiver] = useState(myId);
  const [receiver, setReceiver] = useState(preselect);
  const [date, setDate] = useState(todayISO());
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => setReceiver(preselect), [preselect]);

  const submit = async () => {
    if (!receiver) { setErr("Choose which member this referral is for."); return; }
    if (isAdmin && !giver) { setErr("Choose who is giving the referral."); return; }
    if (giver === receiver) { setErr("The giver and receiver can't be the same member."); return; }
    if (!contactName.trim()) { setErr("Add the name of the person or business being referred."); return; }
    setBusy(true);
    setErr(null);
    const { error } = await supabase.from("referrals").insert({
      giver_id: isAdmin ? giver : myId,
      receiver_id: receiver,
      referral_date: date,
      contact_name: contactName.trim(),
      contact_phone: contactPhone.trim(),
      contact_email: contactEmail.trim(),
      description: description.trim(),
      status: "new",
    });
    setBusy(false);
    if (error) setErr(error.message);
    else onDone();
  };

  return (
    <div className="rounded-2xl border border-line bg-white p-5 mt-5 rise">
      <h2 className="font-display text-xl text-ink">Pass a referral</h2>

      <div className="grid sm:grid-cols-2 gap-4 mt-4">
        {isAdmin && (
          <label className="block">
            <span className="text-xs font-medium text-amber uppercase tracking-wide">From (admin)</span>
            <select value={giver} onChange={(e) => setGiver(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink outline-none focus:border-pine focus:ring-2 focus:ring-pine/20">
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.full_name || "Member"}{m.id === myId ? " (you)" : ""}</option>
              ))}
            </select>
          </label>
        )}
        <label className="block">
          <span className="text-xs font-medium text-ink/60 uppercase tracking-wide">Refer to</span>
          <select value={receiver} onChange={(e) => setReceiver(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink outline-none focus:border-pine focus:ring-2 focus:ring-pine/20">
            <option value="">Select a member…</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.full_name || "Member"}{m.company ? ` — ${m.company}` : ""}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-ink/60 uppercase tracking-wide">Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink outline-none focus:border-pine focus:ring-2 focus:ring-pine/20" />
        </label>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mt-4">
        <Input label="Contact name" value={contactName} onChange={setContactName} placeholder="Who should they reach out to?" />
        <Input label="Contact phone" value={contactPhone} onChange={setContactPhone} />
        <Input label="Contact email" value={contactEmail} onChange={setContactEmail} />
      </div>

      <label className="block mt-4">
        <span className="text-xs font-medium text-ink/60 uppercase tracking-wide">What's the opportunity?</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Context the member needs: what's needed, timing, how you know them." className="mt-1 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink outline-none focus:border-pine focus:ring-2 focus:ring-pine/20 resize-y" />
      </label>

      {err && <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}

      <button onClick={submit} disabled={busy} className="mt-5 rounded-xl bg-pine hover:bg-pine-dark text-paper px-5 py-2.5 font-medium transition-colors disabled:opacity-60">
        {busy ? "Sending…" : "Send referral"}
      </button>
    </div>
  );
}

function ReferralRow({
  referral, tab, otherName, canEditStatus, onChanged,
}: {
  referral: Referral; tab: "given" | "received"; otherName?: string; canEditStatus: boolean; onChanged: () => void;
}) {
  const [status, setStatus] = useState(referral.status);
  const [saving, setSaving] = useState(false);

  const updateStatus = async (next: string) => {
    setStatus(next);
    setSaving(true);
    await supabase.from("referrals").update({ status: next }).eq("id", referral.id);
    setSaving(false);
    onChanged();
  };

  const who = firstName(otherName || "a member");

  return (
    <li className="rounded-2xl border border-line bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-ink">
            <span className="font-mono text-ink/70">{tab === "given" ? "You" : who}</span>
            <span className="text-amber px-1.5">→</span>
            <span className="font-mono text-ink/70">{tab === "given" ? who : "you"}</span>
          </p>
          <p className="font-medium text-ink mt-1">{referral.contact_name || "Unnamed contact"}</p>
          {(referral.contact_phone || referral.contact_email) && (
            <p className="text-sm text-ink/55 mt-0.5">
              {[referral.contact_phone, referral.contact_email].filter(Boolean).join(" · ")}
            </p>
          )}
          {referral.description && <p className="text-sm text-ink/60 mt-2">{referral.description}</p>}
          <p className="text-xs text-ink/40 mt-2">{fmtDate(referral.referral_date)}</p>
        </div>

        <div className="shrink-0 text-right">
          {canEditStatus ? (
            <select value={status} onChange={(e) => updateStatus(e.target.value)} disabled={saving} className={`text-xs rounded-full border px-2.5 py-1.5 outline-none ${STATUS_CLASS[status] ?? STATUS_CLASS.new}`}>
              {STATUSES.map((s) => (<option key={s} value={s}>{STATUS_LABEL[s]}</option>))}
            </select>
          ) : (
            <span className={`text-xs px-2.5 py-1 rounded-full border ${STATUS_CLASS[status] ?? STATUS_CLASS.new}`}>
              {STATUS_LABEL[status] ?? status}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-ink/60 uppercase tracking-wide">{label}</span>
      <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink outline-none focus:border-pine focus:ring-2 focus:ring-pine/20" />
    </label>
  );
}
