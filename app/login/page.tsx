"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  const submit = async () => {
    if (!email || !password) {
      setErr("Enter your email and a password.");
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        if (data.session) {
          router.replace("/");
        } else {
          setMsg(
            "Account created. Check your email to confirm, then sign in."
          );
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.replace("/");
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      {/* Left: the thesis — referrals passing between members */}
      <section className="relative hidden lg:flex flex-col justify-between bg-pine text-paper p-12 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="inline-grid place-items-center w-9 h-9 rounded-lg bg-paper/15 text-paper font-display text-lg">
            B
          </span>
          <span className="font-display text-2xl">Built for Biz</span>
        </div>

        <div className="relative">
          <p className="font-display text-4xl leading-tight max-w-md">
            Where the group swaps contacts, passes referrals, and tracks every
            1-on-1.
          </p>
          <div className="mt-10 space-y-3 max-w-sm">
            {[
              ["Maria Chen", "→", "passed you a referral"],
              ["You", "→", "referred a client to David"],
              ["Sam Okafor", "→", "passed you a referral"],
            ].map(([a, arrow, b], i) => (
              <div
                key={i}
                className="rise flex items-center gap-3 rounded-xl bg-paper/10 border border-paper/15 px-4 py-3"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <span className="font-mono text-sm">{a}</span>
                <span className="text-amber">{arrow}</span>
                <span className="text-sm text-paper/80">{b}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-paper/50 text-sm">
          A private space for your networking group.
        </p>
      </section>

      {/* Right: the form */}
      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <span className="inline-grid place-items-center w-8 h-8 rounded-lg bg-pine text-paper font-display">
              B
            </span>
            <span className="font-display text-xl text-ink">
              Built for Biz
            </span>
          </div>

          <h1 className="font-display text-2xl text-ink">
            {mode === "signin" ? "Sign in" : "Create your account"}
          </h1>
          <p className="text-ink/55 text-sm mt-1">
            {mode === "signin"
              ? "Welcome back to the group."
              : "Join the group and set up your member profile."}
          </p>

          <div className="mt-7 space-y-3">
            {mode === "signup" && (
              <Field
                label="Full name"
                value={name}
                onChange={setName}
                placeholder="Your name"
              />
            )}
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
            />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              onEnter={submit}
            />
          </div>

          {err && (
            <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {err}
            </p>
          )}
          {msg && (
            <p className="mt-4 text-sm text-pine-dark bg-sage border border-pine/20 rounded-lg px-3 py-2">
              {msg}
            </p>
          )}

          <button
            onClick={submit}
            disabled={busy}
            className="mt-6 w-full rounded-xl bg-pine hover:bg-pine-dark text-paper py-3 font-medium transition-colors disabled:opacity-60"
          >
            {busy
              ? "Working…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>

          <p className="mt-5 text-sm text-ink/55 text-center">
            {mode === "signin" ? "New to the group? " : "Already a member? "}
            <button
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setErr(null);
                setMsg(null);
              }}
              className="text-pine font-medium hover:underline"
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  onEnter,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  onEnter?: () => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-ink/60 uppercase tracking-wide">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnter) onEnter();
        }}
        className="mt-1 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink outline-none focus:border-pine focus:ring-2 focus:ring-pine/20"
      />
    </label>
  );
}
