"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AuthGuard } from "@/components/AuthGuard";
import { Nav } from "@/components/Nav";
import { useAuth } from "@/components/AuthProvider";
import { supabase, type Member } from "@/lib/supabaseClient";
import { initials, firstName } from "@/lib/ui";

export default function MemberDetailPage() {
  return (
    <AuthGuard>
      <Nav />
      <MemberDetail />
    </AuthGuard>
  );
}

const SOCIALS: { key: keyof Member; label: string }[] = [
  { key: "facebook",  label: "Facebook"  },
  { key: "instagram", label: "Instagram" },
  { key: "linkedin",  label: "LinkedIn"  },
  { key: "tiktok",    label: "TikTok"    },
  { key: "youtube",   label: "YouTube"   },
  { key: "x_twitter", label: "X / Twitter" },
];

function normalizeUrl(url: string) {
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function MemberDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { member: me, isAdmin } = useAuth();
  const [member, setMember] = useState<Member | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("members")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      setMember(data as Member ?? null);
      setLoaded(true);
    })();
  }, [id]);

  if (!loaded) {
    return (
      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-12">
        <p className="text-ink/40">Loading…</p>
      </main>
    );
  }

  if (!member) {
    return (
      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-12 text-center">
        <p className="text-ink/55">Member not found.</p>
        <Link href="/directory" className="text-pine text-sm hover:underline mt-2 inline-block">
          ← Back to directory
        </Link>
      </main>
    );
  }

  const isMe = me?.id === member.id;
  const socials = SOCIALS.filter((s) => !!(member[s.key] as string));

  return (
    <main className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
      {/* Back link */}
      <button
        onClick={() => router.back()}
        className="text-sm text-ink/50 hover:text-ink flex items-center gap-1 mb-6 transition-colors"
      >
        ← Back
      </button>

      {/* Header card */}
      <div className="rounded-2xl border border-line bg-white p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="shrink-0 grid place-items-center w-16 h-16 rounded-full bg-sage text-pine-dark font-display text-2xl">
            {initials(member.full_name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl text-ink">
                {member.full_name || "Member"}
              </h1>
              {isMe && (
                <span className="text-xs text-ink/45 border border-line rounded-full px-2 py-0.5">You</span>
              )}
              {member.is_admin && (
                <span className="text-xs text-amber border border-amber/40 rounded-full px-2 py-0.5">Admin</span>
              )}
            </div>
            {member.company && (
              <p className="text-ink/65 mt-0.5">{member.company}</p>
            )}
            {member.category && (
              <span className="inline-block mt-2 text-sm text-pine-dark bg-sage rounded-full px-3 py-1">
                {member.category}
              </span>
            )}
          </div>
        </div>

        {/* Bio */}
        {member.bio ? (
          <div className="mt-6 pt-6 border-t border-line">
            <h2 className="text-xs font-medium text-ink/50 uppercase tracking-wide mb-2">About</h2>
            <p className="text-ink/80 leading-relaxed whitespace-pre-line">{member.bio}</p>
          </div>
        ) : (
          <div className="mt-6 pt-6 border-t border-line">
            <p className="text-ink/40 text-sm italic">No bio added yet.</p>
          </div>
        )}

        {/* Contact */}
        <div className="mt-6 pt-6 border-t border-line">
          <h2 className="text-xs font-medium text-ink/50 uppercase tracking-wide mb-3">Contact</h2>
          <div className="flex flex-wrap gap-2">
            {member.phone && (
              <>
                <a href={`tel:${member.phone}`} className="rounded-lg border border-line px-3 py-2 text-sm text-ink/70 hover:bg-sage transition-colors">
                  📞 {member.phone}
                </a>
                <a href={`sms:${member.phone}`} className="rounded-lg border border-line px-3 py-2 text-sm text-ink/70 hover:bg-sage transition-colors">
                  💬 Text
                </a>
              </>
            )}
            {member.email && (
              <a href={`mailto:${member.email}`} className="rounded-lg border border-line px-3 py-2 text-sm text-ink/70 hover:bg-sage transition-colors">
                ✉️ {member.email}
              </a>
            )}
            {member.website && (
              <a href={normalizeUrl(member.website)} target="_blank" rel="noreferrer" className="rounded-lg border border-line px-3 py-2 text-sm text-ink/70 hover:bg-sage transition-colors">
                🌐 Website
              </a>
            )}
          </div>
        </div>

        {/* Social */}
        {socials.length > 0 && (
          <div className="mt-6 pt-6 border-t border-line">
            <h2 className="text-xs font-medium text-ink/50 uppercase tracking-wide mb-3">Social media</h2>
            <div className="flex flex-wrap gap-2">
              {socials.map((s) => (
                <a
                  key={s.key}
                  href={normalizeUrl(member[s.key] as string)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-line px-3 py-2 text-sm text-ink/70 hover:bg-sage transition-colors"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Google review */}
        {member.google_review_url && (
          <div className="mt-6 pt-6 border-t border-line">
            <a
              href={normalizeUrl(member.google_review_url)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-amber/40 bg-amber/5 hover:bg-amber/10 text-amber px-4 py-3 font-medium transition-colors"
            >
              ⭐ Leave a Google review for {firstName(member.full_name)}
            </a>
          </div>
        )}

        {/* Actions */}
        {!isMe && (
          <div className="mt-6 pt-6 border-t border-line flex flex-wrap gap-3">
            <Link
              href={`/referrals?to=${member.id}`}
              className="rounded-xl bg-pine hover:bg-pine-dark text-paper px-5 py-2.5 text-sm font-medium transition-colors"
            >
              Refer to {firstName(member.full_name)}
            </Link>
            <Link
              href={`/one-on-ones`}
              className="rounded-xl border border-line bg-white hover:bg-sage text-ink px-5 py-2.5 text-sm font-medium transition-colors"
            >
              Log a 1-on-1
            </Link>
          </div>
        )}

        {/* Edit shortcut for own profile or admin */}
        {(isMe || isAdmin) && (
          <div className="mt-4">
            <Link
              href="/profile"
              className="text-sm text-pine hover:underline"
            >
              {isMe ? "Edit your profile →" : "Edit in roster →"}
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
