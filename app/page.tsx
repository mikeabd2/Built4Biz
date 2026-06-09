"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/AuthGuard";
import { Nav } from "@/components/Nav";
import { useAuth } from "@/components/AuthProvider";
import { supabase, type Referral } from "@/lib/supabaseClient";
import {
  STATUS_LABEL,
  STATUS_CLASS,
  fmtDate,
  firstName,
} from "@/lib/ui";

type NameMap = Record<string, string>;

export default function HomePage() {
  return (
    <AuthGuard>
      <Nav />
      <Dashboard />
    </AuthGuard>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const [names, setNames] = useState<NameMap>({});
  const [given, setGiven] = useState(0);
  const [received, setReceived] = useState(0);
  const [oneOnOnes, setOneOnOnes] = useState(0);
  const [members, setMembers] = useState(0);
  const [recent, setRecent] = useState<Referral[]>([]);
  const [myName, setMyName] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name");
      const map: NameMap = {};
      (profiles ?? []).forEach((p) => {
        map[p.id] = p.full_name || "Member";
      });
      setNames(map);
      setMembers((profiles ?? []).length);
      setMyName(map[user.id] || "");

      const { data: refs } = await supabase
        .from("referrals")
        .select("*")
        .or(`giver_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      const list = (refs ?? []) as Referral[];
      setGiven(list.filter((r) => r.giver_id === user.id).length);
      setReceived(list.filter((r) => r.receiver_id === user.id).length);
      setRecent(list.slice(0, 6));

      const { count } = await supabase
        .from("one_on_ones")
        .select("id", { count: "exact", head: true })
        .eq("member_id", user.id);
      setOneOnOnes(count ?? 0);
    })();
  }, [user]);

  return (
    <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
      <p className="text-ink/55 text-sm">
        {greeting()}
        {myName ? `, ${firstName(myName)}` : ""}.
      </p>
      <h1 className="font-display text-3xl text-ink mt-1">Your network</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6">
        <Stat label="Referrals given" value={given} />
        <Stat label="Referrals received" value={received} />
        <Stat label="1-on-1s logged" value={oneOnOnes} />
        <Stat label="Members" value={members} />
      </div>

      <div className="flex flex-wrap gap-3 mt-6">
        <Link
          href="/referrals"
          className="rounded-xl bg-pine hover:bg-pine-dark text-paper px-4 py-2.5 text-sm font-medium transition-colors"
        >
          Pass a referral
        </Link>
        <Link
          href="/one-on-ones"
          className="rounded-xl border border-line bg-white hover:bg-sage text-ink px-4 py-2.5 text-sm font-medium transition-colors"
        >
          Log a 1-on-1
        </Link>
        <Link
          href="/directory"
          className="rounded-xl border border-line bg-white hover:bg-sage text-ink px-4 py-2.5 text-sm font-medium transition-colors"
        >
          Browse the directory
        </Link>
      </div>

      <h2 className="font-display text-xl text-ink mt-10 mb-3">
        Recent activity
      </h2>
      {recent.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white/50 p-8 text-center">
          <p className="text-ink/55">No referrals yet.</p>
          <p className="text-ink/45 text-sm mt-1">
            When you pass a referral or someone sends one your way, it shows up
            here.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {recent.map((r) => {
            const iGave = r.giver_id === user?.id;
            const other = iGave
              ? names[r.receiver_id]
              : names[r.giver_id];
            return (
              <li
                key={r.id}
                className="rounded-xl border border-line bg-white px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm text-ink truncate">
                    <span className="font-mono text-ink/70">
                      {iGave ? "You" : firstName(other || "")}
                    </span>
                    <span className="text-amber px-1.5">→</span>
                    <span className="font-mono text-ink/70">
                      {iGave ? firstName(other || "") : "you"}
                    </span>
                    <span className="text-ink/45">
                      {" "}
                      · {r.contact_name || "a contact"}
                    </span>
                  </p>
                  <p className="text-xs text-ink/40 mt-0.5">
                    {fmtDate(r.created_at)}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-xs px-2.5 py-1 rounded-full border ${
                    STATUS_CLASS[r.status] ?? STATUS_CLASS.new
                  }`}
                >
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
      <p className="font-mono text-3xl sm:text-4xl text-pine">{value}</p>
      <p className="text-ink/55 text-xs sm:text-sm mt-1">{label}</p>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
