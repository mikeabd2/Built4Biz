"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { Nav } from "@/components/Nav";
import { useAuth } from "@/components/AuthProvider";
import { supabase, type OneOnOne, type Member } from "@/lib/supabaseClient";
import { STRATEGIC_ALLIANCES, fmtDate, firstName } from "@/lib/ui";

export default function OneOnOnesPage() {
  return (
    <AuthGuard>
      <Nav />
      <OneOnOnes />
    </AuthGuard>
  );
}

type NameMap = Record<string, string>;

function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function OneOnOnes() {
  const { member, isAdmin } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [names, setNames] = useState<NameMap>({});
  const [items, setItems] = useState<OneOnOne[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    if (!member) return;
    const { data: ppl } = await supabase.from("members").select("*").order("full_name", { ascending: true });
    const list = (ppl ?? []) as Member[];
    setMembers(list);
    const map: NameMap = {};
    list.forEach((p) => (map[p.id] = p.full_name || "Member"));
    setNames(map);

    // Members see their own; admins can see all.
    let query = supabase.from("one_on_ones").select("*").order("meeting_date", { ascending: false });
    if (!isAdmin) query = query.eq("member_id", member.id);
    const { data } = await query;
    setItems((data ?? []) as OneOnOne[]);
    setLoaded(true);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member, isAdmin]);

  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">1-on-1s</h1>
          <p className="text-ink/55 text-sm mt-1">
            {isAdmin
              ? "Log one-to-one meetings. As an admin you can see and add for any member."
              : "Log your one-to-one meetings. These notes are private to you."}
          </p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="rounded-xl bg-pine hover:bg-pine-dark text-paper px-4 py-2.5 text-sm font-medium transition-colors">
          {showForm ? "Close" : "Log a 1-on-1"}
        </button>
      </div>

      {showForm && member && (
        <NewOneOnOne
          members={members}
          myId={member.id}
          isAdmin={isAdmin}
          onDone={() => { setShowForm(false); load(); }}
        />
      )}

      {!loaded ? (
        <p className="text-ink/40 mt-10">Loading 1-on-1s…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white/50 p-8 text-center mt-8">
          <p className="text-ink/55">No 1-on-1s logged yet.</p>
          <p className="text-ink/45 text-sm mt-1">After you meet with a member, capture who you met, what came up, and what you learned.</p>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {items.map((o) => (
            <Row
              key={o.id}
              item={o}
              ownerName={isAdmin && o.member_id !== member?.id ? names[o.member_id] : ""}
              withName={o.met_with_id ? names[o.met_with_id] : ""}
              onDeleted={load}
            />
          ))}
        </ul>
      )}
    </main>
  );
}

function NewOneOnOne({
  members, myId, isAdmin, onDone,
}: {
  members: Member[]; myId: string; isAdmin: boolean; onDone: () => void;
}) {
  const [owner, setOwner] = useState(myId);
  const [date, setDate] = useState(todayISO());
  const [metWith, setMetWith] = useState("");
  const [alliances, setAlliances] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggle = (a: string) =>
    setAlliances((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  const submit = async () => {
    const ownerId = isAdmin ? owner : myId;
    if (!metWith) { setErr("Choose which member you met with."); return; }
    if (!date) { setErr("Pick the date of the meeting."); return; }
    if (metWith === ownerId) { setErr("The two members can't be the same person."); return; }
    setBusy(true);
    setErr(null);
    const { error } = await supabase.from("one_on_ones").insert({
      member_id: ownerId,
      met_with_id: metWith,
      meeting_date: date,
      strategic_alliances: alliances,
      notes: notes.trim(),
    });
    setBusy(false);
    if (error) setErr(error.message);
    else onDone();
  };

  return (
    <div className="rounded-2xl border border-line bg-white p-5 mt-5 rise">
      <h2 className="font-display text-xl text-ink">Log a 1-on-1</h2>

      <div className="grid sm:grid-cols-2 gap-4 mt-4">
        {isAdmin && (
          <label className="block sm:col-span-2">
            <span className="text-xs font-medium text-amber uppercase tracking-wide">Whose 1-on-1 (admin)</span>
            <select value={owner} onChange={(e) => setOwner(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink outline-none focus:border-pine focus:ring-2 focus:ring-pine/20">
              {members.map((m) => (<option key={m.id} value={m.id}>{m.full_name || "Member"}{m.id === myId ? " (you)" : ""}</option>))}
            </select>
          </label>
        )}
        <label className="block">
          <span className="text-xs font-medium text-ink/60 uppercase tracking-wide">Date of 1-on-1</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink outline-none focus:border-pine focus:ring-2 focus:ring-pine/20" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-ink/60 uppercase tracking-wide">Who did you meet with?</span>
          <select value={metWith} onChange={(e) => setMetWith(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink outline-none focus:border-pine focus:ring-2 focus:ring-pine/20">
            <option value="">Select a member…</option>
            {members.map((m) => (<option key={m.id} value={m.id}>{m.full_name || "Member"}{m.company ? ` — ${m.company}` : ""}</option>))}
          </select>
        </label>
      </div>

      <div className="mt-4">
        <span className="text-xs font-medium text-ink/60 uppercase tracking-wide">Strategic alliances discussed</span>
        <div className="flex flex-wrap gap-2 mt-2">
          {STRATEGIC_ALLIANCES.map((a) => {
            const on = alliances.includes(a);
            return (
              <button key={a} type="button" onClick={() => toggle(a)} className={`text-sm rounded-full px-3 py-1.5 border transition-colors ${on ? "bg-pine text-paper border-pine" : "bg-white text-ink/70 border-line hover:bg-sage"}`}>
                {a}
              </button>
            );
          })}
        </div>
      </div>

      <label className="block mt-4">
        <span className="text-xs font-medium text-ink/60 uppercase tracking-wide">Things I learned</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Their ideal client, who you can refer to them, follow-ups, anything worth remembering." className="mt-1 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink outline-none focus:border-pine focus:ring-2 focus:ring-pine/20 resize-y" />
      </label>

      {err && <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}

      <button onClick={submit} disabled={busy} className="mt-5 rounded-xl bg-pine hover:bg-pine-dark text-paper px-5 py-2.5 font-medium transition-colors disabled:opacity-60">
        {busy ? "Saving…" : "Save 1-on-1"}
      </button>
    </div>
  );
}

function Row({
  item, ownerName, withName, onDeleted,
}: {
  item: OneOnOne; ownerName?: string; withName?: string; onDeleted: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  const remove = async () => {
    await supabase.from("one_on_ones").delete().eq("id", item.id);
    onDeleted();
  };

  return (
    <li className="rounded-2xl border border-line bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm">
            <span className="font-mono text-ink/70">{fmtDate(item.meeting_date)}</span>
            <span className="text-ink/45"> · </span>
            {ownerName && <span className="text-ink/45">{firstName(ownerName)} met </span>}
            {!ownerName && <span className="text-ink/45">with </span>}
            <span className="text-ink font-medium">{firstName(withName || "a former member")}</span>
          </p>

          {item.strategic_alliances?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {item.strategic_alliances.map((a) => (
                <span key={a} className="text-xs text-pine-dark bg-sage rounded-full px-2 py-0.5">{a}</span>
              ))}
            </div>
          )}

          {item.notes && <p className="text-sm text-ink/65 mt-2 whitespace-pre-line">{item.notes}</p>}
        </div>

        <div className="shrink-0">
          {confirming ? (
            <div className="flex items-center gap-2">
              <button onClick={remove} className="text-xs text-red-700 hover:underline">Delete</button>
              <button onClick={() => setConfirming(false)} className="text-xs text-ink/50 hover:underline">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setConfirming(true)} aria-label="Delete 1-on-1" className="text-ink/30 hover:text-ink/70 transition-colors">✕</button>
          )}
        </div>
      </div>
    </li>
  );
}
