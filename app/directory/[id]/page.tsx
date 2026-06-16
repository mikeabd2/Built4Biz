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
  { key: "facebook",  label: "Facebook"     },
  { key: "instagram", label: "Instagram"    },
  { key: "linkedin",  label: "LinkedIn"     },
  { key: "tiktok",    label: "TikTok"       },
  { key: "youtube",   label: "YouTube"      },
  { key: "x_twitter", label: "X / Twitter" },
];

function normalizeUrl(url: string) {
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function buildVCard(m: Member): string {
  const lines: string[] = [];
  lines.push("BEGIN:VCARD");
  lines.push("VERSION:3.0");
  const parts = (m.full_name || "").trim().split(/\s+/);
  const last  = parts.length > 1 ? parts[parts.length - 1] : "";
  const first = parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0] ?? "";
  lines.push(`N:${last};${first};;;`);
  lines.push(`FN:${m.full_name || ""}`);
  if (m.company)  lines.push(`ORG:${m.company}`);
  if (m.category) lines.push(`TITLE:${m.category}`);
  if (m.phone)    lines.push(`TEL;TYPE=CELL:${m.phone}`);
  if (m.email)    lines.push(`EMAIL;TYPE=WORK:${m.email}`);
  if (m.website)  lines.push(`URL:${normalizeUrl(m.website)}`);
  if (m.bio)      lines.push(`NOTE:${m.bio.replace(/\n/g, "\\n")}`);
  for (const s of SOCIALS) {
    const val = m[s.key] as string;
    if (val) lines.push(`X-SOCIALPROFILE;type=${s.label.toLowerCase()}:${normalizeUrl(val)}`);
  }
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

function downloadVCard(m: Member) {
  const blob = new Blob([buildVCard(m)], { type: "text/vcard;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${(m.full_name || "contact").replace(/\s+/g, "_")}.vcf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function shareVCard(m: Member) {
  const vcf  = buildVCard(m);
  const file = new File([vcf], `${(m.full_name || "contact").replace(/\s+/g, "_")}.vcf`, {
    type: "text/vcard",
  });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: m.full_name || "Contact" });
  } else {
    downloadVCard(m);
  }
}

// ── Referral prompt shown after sharing ────────────────────────────────────

type ReferralPromptProps = {
  receiver: Member;
  myId: string;
  onDone: () => void;
  onSkip: () => void;
};

function ReferralPrompt({ receiver, myId, onDone, onSkip }: ReferralPromptProps) {
  const [contactName, setContactName]   = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [description, setDescription]  = useState("");
  const [date, setDate]                 = useState(todayISO());
  const [busy, setBusy]                 = useState(false);
  const [err, setErr]                   = useState<string | null>(null);
  const [saved, setSaved]               = useState(false);

  const submit = async () => {
    if (!contactName.trim()) {
      setErr("Enter the name of the person you shared the contact with.");
      return;
    }
    setBusy(true);
    setErr(null);
    const { error } = await supabase.from("referrals").insert({
      giver_id:      myId,
      receiver_id:   receiver.id,
      referral_date: date,
      contact_name:  contactName.trim(),
      contact_phone: contactPhone.trim(),
      contact_email: contactEmail.trim(),
      description:   description.trim(),
      status:        "new",
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
    } else {
      setSaved(true);
      setTimeout(onDone, 1400);
    }
  };

  if (saved) {
    return (
      <div className="mt-5 rounded-2xl border border-pine/30 bg-sage p-5 text-center">
        <p className="text-pine font-medium">Referral logged!</p>
        <p className="text-ink/55 text-sm mt-1">
          {firstName(receiver.full_name)} has been notified.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-2xl border border-pine/40 bg-sage/40 p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-ink">Log this as a referral?</p>
          <p className="text-sm text-ink/55 mt-0.5">
            Who did you share {firstName(receiver.full_name)}&apos;s contact with?
          </p>
        </div>
        <button onClick={onSkip} className="text-ink/30 hover:text-ink/60 text-lg leading-none mt-0.5">✕</button>
      </div>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="text-xs font-medium text-ink/60 uppercase tracking-wide">
            Their name <span className="text-red-500">*</span>
          </span>
          <input
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="e.g. John Smith"
            className="mt-1 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink outline-none focus:border-pine focus:ring-2 focus:ring-pine/20"
          />
        </label>

        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium text-ink/60 uppercase tracking-wide">Their phone</span>
            <input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="Optional"
              className="mt-1 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink outline-none focus:border-pine focus:ring-2 focus:ring-pine/20"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-ink/60 uppercase tracking-wide">Their email</span>
            <input
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="Optional"
              className="mt-1 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink outline-none focus:border-pine focus:ring-2 focus:ring-pine/20"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-xs font-medium text-ink/60 uppercase tracking-wide">Notes</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Any context for the referral (optional)"
            className="mt-1 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink outline-none focus:border-pine focus:ring-2 focus:ring-pine/20 resize-none"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-ink/60 uppercase tracking-wide">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink outline-none focus:border-pine focus:ring-2 focus:ring-pine/20"
          />
        </label>
      </div>

      {err && (
        <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>
      )}

      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={submit}
          disabled={busy}
          className="rounded-xl bg-pine hover:bg-pine-dark text-paper px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-60"
        >
          {busy ? "Saving…" : "Log referral"}
        </button>
        <button onClick={onSkip} className="text-sm text-ink/45 hover:text-ink transition-colors">
          Skip
        </button>
      </div>
    </div>
  );
}

// ── Main detail page ────────────────────────────────────────────────────────

function MemberDetail() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const { member: me, isAdmin } = useAuth();
  const [member, setMember]           = useState<Member | null>(null);
  const [loaded, setLoaded]           = useState(false);
  const [sharing, setSharing]         = useState(false);
  const [showPrompt, setShowPrompt]   = useState(false);

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

  const isMe    = me?.id === member.id;
  const socials = SOCIALS.filter((s) => !!(member[s.key] as string));

  const handleShare = async () => {
    setSharing(true);
    try {
      await shareVCard(member);
    } finally {
      setSharing(false);
      // Show the referral prompt after the share sheet closes (slight delay
      // lets the OS share sheet dismiss naturally on mobile)
      setTimeout(() => setShowPrompt(true), 400);
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
      <button
        onClick={() => router.back()}
        className="text-sm text-ink/50 hover:text-ink flex items-center gap-1 mb-6 transition-colors"
      >
        ← Back
      </button>

      <div className="rounded-2xl border border-line bg-white p-6 sm:p-8">

        {/* Header */}
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
            {member.company && <p className="text-ink/65 mt-0.5">{member.company}</p>}
            {member.category && (
              <span className="inline-block mt-2 text-sm text-pine-dark bg-sage rounded-full px-3 py-1">
                {member.category}
              </span>
            )}
          </div>
        </div>

        {/* Save / Share contact */}
        {!isMe && (
          <div className="mt-5">
            <button
              onClick={handleShare}
              disabled={sharing}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-pine hover:bg-pine-dark text-paper px-4 py-3 font-medium text-sm transition-colors disabled:opacity-60"
            >
              {sharing ? "Opening…" : "📇 Save / share contact"}
            </button>
            <p className="text-center text-xs text-ink/40 mt-1.5">
              Downloads a .vcf file · adds to contacts or share with anyone
            </p>
          </div>
        )}

        {/* Referral prompt — appears after sharing */}
        {showPrompt && me && !isMe && (
          <ReferralPrompt
            receiver={member}
            myId={me.id}
            onDone={() => setShowPrompt(false)}
            onSkip={() => setShowPrompt(false)}
          />
        )}

        {/* Bio */}
        <div className="mt-6 pt-6 border-t border-line">
          <h2 className="text-xs font-medium text-ink/50 uppercase tracking-wide mb-2">About</h2>
          {member.bio
            ? <p className="text-ink/80 leading-relaxed whitespace-pre-line">{member.bio}</p>
            : <p className="text-ink/40 text-sm italic">No bio added yet.</p>
          }
        </div>

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

        {/* Referral / 1-on-1 actions */}
        {!isMe && !showPrompt && (
          <div className="mt-6 pt-6 border-t border-line flex flex-wrap gap-3">
            <Link
              href={`/referrals?to=${member.id}`}
              className="rounded-xl bg-pine hover:bg-pine-dark text-paper px-5 py-2.5 text-sm font-medium transition-colors"
            >
              Refer to {firstName(member.full_name)}
            </Link>
            <Link
              href="/one-on-ones"
              className="rounded-xl border border-line bg-white hover:bg-sage text-ink px-5 py-2.5 text-sm font-medium transition-colors"
            >
              Log a 1-on-1
            </Link>
          </div>
        )}

        {(isMe || isAdmin) && (
          <div className="mt-4">
            <Link href="/profile" className="text-sm text-pine hover:underline">
              {isMe ? "Edit your profile →" : "Edit in roster →"}
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
