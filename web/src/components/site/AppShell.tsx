"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { FlameMark } from "@/components/art";
import { Logo } from "@/components/ui";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { useStats } from "@/lib/useQueries";

export const APP_NAV = [
  { href: "/app", label: "The Fire", mobile: true },
  { href: "/app/good", label: "My GOOD", mobile: true },
  { href: "/app/hearth", label: "The Hearth", mobile: true },
  { href: "/app/history", label: "My History", mobile: true },
  { href: "/app/referrals", label: "Referrals", mobile: false },
  { href: "/app/transactions", label: "Transactions", mobile: false },
];
const PUBLIC = [{ href: "/docs", label: "Documentation" }, { href: "/security", label: "Security" }, { href: "/", label: "Public site" }];

function active(path: string, href: string) {
  return href === "/app" ? path === "/app" : path.startsWith(href);
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [more, setMore] = useState(false);
  const { data: stats } = useStats();
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="paper-dark sticky top-0 hidden h-screen flex-col gap-8 p-6 lg:flex">
        <Logo light />
        <nav className="flex flex-col gap-1" aria-label="Application">
          {APP_NAV.map((n) => (
            <Link key={n.href} href={n.href} className={`display flex items-center gap-3 px-2 py-1.5 text-2xl ${active(path, n.href) ? "bg-ember text-charcoal" : "text-paper hover:text-ember"}`}>
              {active(path, n.href) && <FlameMark width={12} height={15} color="#24221e" inner="#e8d9b9" />}{n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto">
          <p className="eyebrow text-mustard">Public</p>
          <nav className="mt-3 flex flex-col gap-2 text-sm text-paper/75">
            {PUBLIC.map((n) => <Link key={n.href} href={n.href} className="hover:text-ember">{n.label}</Link>)}
          </nav>
          {stats && (
            <p className="mt-6 border-t border-paper/15 pt-4 text-xs text-paper/60">
              Network: testnet · {stats.label} parameters
            </p>
          )}
        </div>
      </aside>
      <div className="flex min-w-0 flex-col pb-24 lg:pb-0">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b-2 border-ink bg-paper/95 px-4 backdrop-blur sm:px-8">
          <div className="lg:hidden"><Logo /></div>
          <p className="eyebrow hidden text-ink/60 lg:block">The operational centre of the movement</p>
          <ConnectButton />
        </header>
        <main className="flex-1 px-4 py-8 sm:px-8">{children}</main>
      </div>
      <nav className="paper-dark fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t-2 border-ember lg:hidden" aria-label="Application (mobile)">
        {APP_NAV.filter((n) => n.mobile).map((n) => (
          <Link key={n.href} href={n.href} className={`display py-3 text-center text-lg ${active(path, n.href) ? "text-ember" : "text-paper"}`}>{n.label.replace("My ", "").replace("The ", "")}</Link>
        ))}
        <button onClick={() => setMore((m) => !m)} aria-expanded={more} className="display py-3 text-lg text-paper">More</button>
        {more && (
          <div className="absolute bottom-full right-0 w-56 border-2 border-ember bg-charcoal p-2">
            {[...APP_NAV.filter((n) => !n.mobile), ...PUBLIC].map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setMore(false)} className="display block px-3 py-2 text-xl text-paper hover:text-ember">{n.label}</Link>
            ))}
          </div>
        )}
      </nav>
    </div>
  );
}
