"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/AuthGuard";
import { Nav } from "@/components/Nav";
import { useAuth } from "@/components/AuthProvider";
import { supabase, type Profile } from "@/lib/supabaseClient";
import { initials, firstName } from "@/lib/ui";

export default function DirectoryPage() {
  return (
    <AuthGuard>
      <Nav />
      <Directory />
    </AuthGuard>
  );
}

function Directory() {
  const { user } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<Profile[]>([]);
  const [q, setQ] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name", { ascending: true });
      setMembers((data ?? []) as Profile[]);
      setLoaded(true);
    })();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return members;
    return members.filter((m) =>
      [m.full_name, m.company, m.category]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [q, members]);

  return (
    <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">Directory</h1>
          <p className="text-ink/55 text-sm mt-1">
            {members.length} member{members.length === 1 ? "" : "s"} in the
            circle.
          </p>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, company, or category"
          className="w-full sm:w-72 rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink outline-none focus:border-pine focus:ring-2 focus:ring-pine/20"
        />
      </div>

      {!loaded ? (
        <p className="text-ink/40 mt-10">Loading members…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white/50 p-8 text-center mt-8">
          <p className="text-ink/55">
            {members.length === 0
              ? "No members yet."
              : "No members match that search."}
          </p>
          {members.length === 0 && (
            <p className="text-ink/45 text-sm mt-1">
              As people join and fill out their profiles, they'll appear here.
            </p>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 mt-6">
          {filtered.map((m) => (
            <article
              key={m.id}
              className="rounded-2xl border border-line bg-white p-5"
            >
              <div className="flex items-start gap-3">
                <span className="shrink-0 grid place-items-center w-11 h-11 rounded-full bg-sage text-pine-dark font-display text-lg">
                  {initials(m.full_name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-medium text-ink truncate">
                      {m.full_name || "Member"}
                    </h2>
                    {m.id === user?.id && (
                      <span className="text-[11px] text-ink/45 border border-line rounded-full px-1.5 py-0.5">
                        You
                      </span>
                    )}
                  </div>
                  {m.company && (
                    <p className="text-sm text-ink/65 truncate">{m.company}</p>
                  )}
                  {m.category && (
                    <span className="inline-block mt-1.5 text-xs text-pine-dark bg-sage rounded-full px-2 py-0.5">
                      {m.category}
                    </span>
                  )}
                </div>
              </div>

              {m.bio && (
                <p className="text-sm text-ink/60 mt-3 line-clamp-3">{m.bio}</p>
              )}

              <div className="flex flex-wrap gap-2 mt-4">
                {m.phone && (
                  <a
                    href={`tel:${m.phone}`}
                    className="text-xs rounded-lg border border-line px-2.5 py-1.5 text-ink/70 hover:bg-sage transition-colors"
                  >
                    Call
                  </a>
                )}
                {m.phone && (
                  <a
                    href={`sms:${m.phone}`}
                    className="text-xs rounded-lg border border-line px-2.5 py-1.5 text-ink/70 hover:bg-sage transition-colors"
                  >
                    Text
                  </a>
                )}
                {m.email && (
                  <a
                    href={`mailto:${m.email}`}
                    className="text-xs rounded-lg border border-line px-2.5 py-1.5 text-ink/70 hover:bg-sage transition-colors"
                  >
                    Email
                  </a>
                )}
                {m.website && (
                  <a
                    href={normalizeUrl(m.website)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs rounded-lg border border-line px-2.5 py-1.5 text-ink/70 hover:bg-sage transition-colors"
                  >
                    Website
                  </a>
                )}
                {m.id !== user?.id && (
                  <button
                    onClick={() => router.push(`/referrals?to=${m.id}`)}
                    className="ml-auto text-xs rounded-lg bg-pine hover:bg-pine-dark text-paper px-2.5 py-1.5 font-medium transition-colors"
                  >
                    Refer to {firstName(m.full_name)}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

function normalizeUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}
