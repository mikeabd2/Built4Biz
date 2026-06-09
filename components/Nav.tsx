"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

const baseTabs = [
  { href: "/", label: "Home" },
  { href: "/directory", label: "Directory" },
  { href: "/referrals", label: "Referrals" },
  { href: "/one-on-ones", label: "1-on-1s" },
  { href: "/reports", label: "Reports" },
  { href: "/profile", label: "My profile" },
];

export function Nav() {
  const pathname = usePathname();
  const { signOut, isAdmin } = useAuth();

  const tabs = isAdmin
    ? [...baseTabs, { href: "/roster", label: "Roster" }]
    : baseTabs;

  return (
    <header className="border-b border-line bg-paper/85 backdrop-blur sticky top-0 z-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="inline-grid place-items-center w-8 h-8 rounded-lg bg-pine text-paper font-display text-base leading-none">
            B
          </span>
          <span className="font-display text-xl text-ink hidden sm:inline">
            Built for Biz
          </span>
        </Link>

        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((t) => {
            const active = pathname === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm transition-colors ${
                  active ? "bg-pine text-paper" : "text-ink/70 hover:bg-sage"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
          <button
            onClick={() => signOut()}
            className="whitespace-nowrap ml-1 px-3 py-1.5 rounded-full text-sm text-ink/45 hover:text-ink hover:bg-sage transition-colors"
          >
            Sign out
          </button>
        </nav>
      </div>
    </header>
  );
}
