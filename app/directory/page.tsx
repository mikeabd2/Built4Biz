"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/AuthGuard";
import { Nav } from "@/components/Nav";
import { useAuth } from "@/components/AuthProvider";
import { supabase, type Member } from "@/lib/supabaseClient";
import { initials, firstName } from "@/lib/ui";

export default function DirectoryPage() {
  return (
    <AuthGuard>
      <Nav />
      <Directory />
    </AuthGuard>
  );
}

type Social = { key: keyof Member; label: string; color: string };

const SOCIALS: Social[] = [
  { key: "facebook",  label: "Facebook",  color: "#1877F2" },
  { key: "instagram", label: "Instagram", color: "#E1306C" },
  { key: "linkedin",  label: "LinkedIn",  color: "#0A66C2" },
  { key: "tiktok",    label: "TikTok",    color: "#010101" },
  { key: "youtube",   label: "YouTube",   color: "#FF0000" },
  { key: "x_twitter", label: "X",         color: "#000000" },
];

function normalizeUrl(url: string) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

function Directory() {
  const { member } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [q, setQ] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("members")
        .select("*")
        .order("full_name", { ascending: true });
      setMembers((data ?? []) as Member[]);
      setLoaded(true);
    })();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return members;
    return members.filter((m) =>
      [m.full_name, m.company, m.category].join(" ").toLowerCase().includes(term)
    );
  }, [q, members]);

  return (
    <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">Directory</h1>
          <p className="text-ink/55 text-sm mt-1">
            {members.length} member{members.length === 1 ? "" : "s"} in the group.
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
            {members.length === 0 ? "No members yet." : "No members match that search."}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 mt-6">
          {filtered.map((m) => (
            <MemberCard
              key={m.id}
              m={m}
              isMe={m.id === member?.id}
              onRefer={() => router.push(`/referrals?to=${m.id}`)}
            />
          ))}
        </div>
      )}
    </main>
  );
}

function MemberCard({
  m, isMe, onRefer,
}: {
  m: Member; isMe: boolean; onRefer: () => void;
}) {
  const socials = SOCIALS.filter((s) => !!(m[s.key] as string));

  return (
    <article className="rounded-2xl border border-line bg-white p-5 flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-start gap-3">
        <span className="shrink-0 grid place-items-center w-11 h-11 rounded-full bg-sage text-pine-dark font-display text-lg">
          {initials(m.full_name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/directory/${m.id}`} className="font-medium text-ink truncate hover:text-pine transition-colors">{m.full_name || "Member"}</Link>
            {isMe && (
              <span className="text-[11px] text-ink/45 border border-line rounded-full px-1.5 py-0.5">You</span>
            )}
            {m.is_admin && (
              <span className="text-[11px] text-amber border border-amber/40 rounded-full px-1.5 py-0.5">Admin</span>
            )}
          </div>
          {m.company && <p className="text-sm text-ink/65 truncate">{m.company}</p>}
          {m.category && (
            <span className="inline-block mt-1.5 text-xs text-pine-dark bg-sage rounded-full px-2 py-0.5">
              {m.category}
            </span>
          )}
        </div>
      </div>

      {/* Bio */}
      {m.bio && <p className="text-sm text-ink/60 line-clamp-3">{m.bio}</p>}

      {/* Contact buttons */}
      <div className="flex flex-wrap gap-2">
        {m.phone && (
          <a href={`tel:${m.phone}`} className="text-xs rounded-lg border border-line px-2.5 py-1.5 text-ink/70 hover:bg-sage transition-colors">Call</a>
        )}
        {m.phone && (
          <a href={`sms:${m.phone}`} className="text-xs rounded-lg border border-line px-2.5 py-1.5 text-ink/70 hover:bg-sage transition-colors">Text</a>
        )}
        {m.email && (
          <a href={`mailto:${m.email}`} className="text-xs rounded-lg border border-line px-2.5 py-1.5 text-ink/70 hover:bg-sage transition-colors">Email</a>
        )}
        {m.website && (
          <a href={normalizeUrl(m.website)} target="_blank" rel="noreferrer" className="text-xs rounded-lg border border-line px-2.5 py-1.5 text-ink/70 hover:bg-sage transition-colors">Website</a>
        )}
        {!isMe && (
          <button
            onClick={onRefer}
            className="ml-auto text-xs rounded-lg bg-pine hover:bg-pine-dark text-paper px-2.5 py-1.5 font-medium transition-colors"
          >
            Refer to {firstName(m.full_name)}
          </button>
        )}
      </div>

      {/* Social icons */}
      {socials.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-line">
          <span className="text-xs text-ink/40 mr-1">Social</span>
          {socials.map((s) => (
            <a
              key={s.key}
              href={normalizeUrl(m[s.key] as string)}
              target="_blank"
              rel="noreferrer"
              title={s.label}
              className="text-xs rounded-lg border border-line px-2.5 py-1.5 text-ink/70 hover:bg-sage transition-colors"
            >
              {s.label}
            </a>
          ))}
        </div>
      )}

      {/* Google review */}
      {m.google_review_url && (
        <a
          href={normalizeUrl(m.google_review_url)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl border border-amber/40 bg-amber/5 hover:bg-amber/10 text-amber px-3 py-2 text-xs font-medium transition-colors"
        >
          ⭐ Leave a Google review for {firstName(m.full_name)}
        </a>
      )}
    </article>
  );
}
