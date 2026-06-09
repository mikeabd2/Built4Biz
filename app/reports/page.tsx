"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { Nav } from "@/components/Nav";
import { supabase, type Referral } from "@/lib/supabaseClient";
import { STATUS_LABEL } from "@/lib/ui";

export default function ReportsPage() {
  return (
    <AuthGuard>
      <Nav />
      <Reports />
    </AuthGuard>
  );
}

type NameMap = Record<string, string>;
type Preset =
  | "this_week"
  | "this_month"
  | "last_week"
  | "last_month"
  | "this_year"
  | "all"
  | "custom";

function iso(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}
function parse(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function rangeFor(preset: Preset, customStart: string, customEnd: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = iso(today);
  switch (preset) {
    case "this_week":
      return { start: iso(startOfWeek(today)), end };
    case "last_week": {
      const s = startOfWeek(today);
      s.setDate(s.getDate() - 7);
      const e = new Date(s);
      e.setDate(e.getDate() + 6);
      return { start: iso(s), end: iso(e) };
    }
    case "this_month":
      return { start: iso(new Date(today.getFullYear(), today.getMonth(), 1)), end };
    case "last_month": {
      const s = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const e = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: iso(s), end: iso(e) };
    }
    case "this_year":
      return { start: iso(new Date(today.getFullYear(), 0, 1)), end };
    case "all":
      return { start: "0001-01-01", end: "9999-12-31" };
    case "custom":
      return { start: customStart || "0001-01-01", end: customEnd || "9999-12-31" };
  }
}

const PRESETS: { key: Preset; label: string }[] = [
  { key: "this_week", label: "This week" },
  { key: "last_week", label: "Last week" },
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "this_year", label: "This year" },
  { key: "all", label: "All time" },
  { key: "custom", label: "Custom" },
];

function Reports() {
  const [all, setAll] = useState<Referral[]>([]);
  const [names, setNames] = useState<NameMap>({});
  const [preset, setPreset] = useState<Preset>("this_month");
  const [customStart, setCustomStart] = useState(
    iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  );
  const [customEnd, setCustomEnd] = useState(iso(new Date()));
  const [groupBy, setGroupBy] = useState<"week" | "month">("week");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: ppl } = await supabase.from("members").select("id, full_name");
      const map: NameMap = {};
      (ppl ?? []).forEach((p) => (map[p.id] = p.full_name || "Member"));
      setNames(map);
      const { data } = await supabase
        .from("referrals")
        .select("*")
        .order("referral_date", { ascending: true });
      setAll((data ?? []) as Referral[]);
      setLoaded(true);
    })();
  }, []);

  const { start, end } = rangeFor(preset, customStart, customEnd);

  const filtered = useMemo(
    () => all.filter((r) => r.referral_date >= start && r.referral_date <= end),
    [all, start, end]
  );

  const buckets = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of filtered) {
      const key =
        groupBy === "month"
          ? r.referral_date.slice(0, 7)
          : iso(startOfWeek(parse(r.referral_date)));
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered, groupBy]);

  const statusCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of filtered) m[r.status] = (m[r.status] ?? 0) + 1;
    return m;
  }, [filtered]);

  const leaderboard = useMemo(() => {
    const g: Record<string, number> = {};
    const rec: Record<string, number> = {};
    for (const r of filtered) {
      g[r.giver_id] = (g[r.giver_id] ?? 0) + 1;
      rec[r.receiver_id] = (rec[r.receiver_id] ?? 0) + 1;
    }
    const ids = new Set([...Object.keys(g), ...Object.keys(rec)]);
    return [...ids]
      .map((id) => ({
        id,
        name: names[id] || "Member",
        given: g[id] ?? 0,
        received: rec[id] ?? 0,
      }))
      .sort((a, b) => b.given - a.given || b.received - a.received);
  }, [filtered, names]);

  const maxBucket = Math.max(1, ...buckets.map((b) => b[1]));

  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
      <h1 className="font-display text-3xl text-ink">Reports</h1>
      <p className="text-ink/55 text-sm mt-1">Referral activity across the group.</p>

      <div className="flex flex-wrap gap-2 mt-6">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPreset(p.key)}
            className={`text-sm rounded-full px-3 py-1.5 border transition-colors ${
              preset === p.key
                ? "bg-pine text-paper border-pine"
                : "bg-white text-ink/70 border-line hover:bg-sage"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === "custom" && (
        <div className="flex flex-wrap items-end gap-4 mt-4">
          <label className="block">
            <span className="text-xs font-medium text-ink/60 uppercase tracking-wide">From</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="mt-1 block rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink outline-none focus:border-pine focus:ring-2 focus:ring-pine/20"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-ink/60 uppercase tracking-wide">To</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="mt-1 block rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink outline-none focus:border-pine focus:ring-2 focus:ring-pine/20"
            />
          </label>
        </div>
      )}

      {!loaded ? (
        <p className="text-ink/40 mt-10">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6">
            <Stat label="Total referrals" value={filtered.length} />
            <Stat label="Closed · won" value={statusCounts["closed_won"] ?? 0} />
            <Stat
              label="In progress"
              value={(statusCounts["contacted"] ?? 0) + (statusCounts["in_progress"] ?? 0)}
            />
            <Stat label="New" value={statusCounts["new"] ?? 0} />
          </div>

          <div className="flex items-center justify-between mt-10 mb-3">
            <h2 className="font-display text-xl text-ink">
              Referrals by {groupBy === "week" ? "week" : "month"}
            </h2>
            <div className="flex gap-1">
              <Toggle active={groupBy === "week"} onClick={() => setGroupBy("week")} label="Week" />
              <Toggle active={groupBy === "month"} onClick={() => setGroupBy("month")} label="Month" />
            </div>
          </div>

          {buckets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-white/50 p-8 text-center">
              <p className="text-ink/55">No referrals in this date range.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {buckets.map(([key, count]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-24 sm:w-28 shrink-0 text-sm text-ink/60 text-right">
                    {groupBy === "month" ? monthLabel(key) : weekLabel(key)}
                  </span>
                  <div className="flex-1 h-7 bg-sage/60 rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-pine rounded-lg flex items-center justify-end px-2 min-w-[1.75rem]"
                      style={{ width: `${(count / maxBucket) * 100}%` }}
                    >
                      <span className="font-mono text-xs text-paper">{count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h2 className="font-display text-xl text-ink mt-10 mb-3">By member</h2>
          {leaderboard.length === 0 ? (
            <p className="text-ink/45 text-sm">No activity in this range.</p>
          ) : (
            <div className="rounded-2xl border border-line bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink/50 border-b border-line">
                    <th className="px-4 py-2.5 font-medium">Member</th>
                    <th className="px-4 py-2.5 font-medium text-right">Given</th>
                    <th className="px-4 py-2.5 font-medium text-right">Received</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((row, i) => (
                    <tr key={row.id} className={i % 2 ? "bg-paper/40" : ""}>
                      <td className="px-4 py-2.5 text-ink">{row.name}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-pine">{row.given}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-ink/70">{row.received}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-ink/40 mt-6">Showing {fmtRange(start, end)}.</p>
        </>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <p className="font-mono text-3xl text-pine">{value}</p>
      <p className="text-ink/55 text-xs mt-1">{label}</p>
    </div>
  );
}
function Toggle({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`text-sm rounded-full px-3 py-1 border transition-colors ${
        active ? "bg-pine text-paper border-pine" : "bg-white text-ink/60 border-line hover:bg-sage"
      }`}
    >
      {label}
    </button>
  );
}
function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}
function weekLabel(key: string) {
  return "Wk " + parse(key).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function fmtRange(s: string, e: string) {
  if (s === "0001-01-01") return "all time";
  const f = (x: string) =>
    parse(x).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return `${f(s)} – ${f(e)}`;
}
