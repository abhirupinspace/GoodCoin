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
      <aside className="sticky top-0 hidden h-screen flex-col gap-10 border-r border-line bg-paper p-6 lg:flex">
        <Logo light />
        <nav className="flex flex-col gap-1" aria-label="Application">
          {APP_NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={active(path, n.href) ? "page" : undefined} className={`meta flex items-center gap-3 border-l-2 py-2.5 pl-3 transition-colors ${active(path, n.href) ? "border-red text-ink" : "border-transparent text-mute hover:text-ink"}`}>
              {n.label}{active(path, n.href) && <FlameMark width={9} height={12} className="ml-auto" />}
            </Link>
          ))}
        </nav>
        <div className="mt-auto">
          <p className="meta text-mute">Public</p>
          <nav className="mt-4 flex flex-col gap-2.5 text-sm text-ink/75">
            {PUBLIC.map((n) => <Link key={n.href} href={n.href} className="hover:text-ember">{n.label}</Link>)}
          </nav>
          {stats && (
            <p className="mt-6 border-t border-line pt-4 text-xs text-ink/60">
              Network: testnet · {stats.label} parameters
            </p>
          )}
        </div>
      </aside>
      <div className="flex min-w-0 flex-col pb-24 lg:pb-0">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-line bg-paper/80 px-4 backdrop-blur-md sm:px-8">
          <div className="lg:hidden"><Logo /></div>
          <p className="meta hidden text-mute lg:block">The operational centre of the movement</p>
          <ConnectButton />
        </header>
        <main className="flex-1 px-4 py-10 sm:px-10">{children}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-line bg-paper/95 backdrop-blur-md lg:hidden" aria-label="Application (mobile)">
        {APP_NAV.filter((n) => n.mobile).map((n) => (
          <Link key={n.href} href={n.href} className={`meta border-t-2 py-4 text-center ${active(path, n.href) ? "border-red text-ink" : "border-transparent text-mute"}`}>{n.label.replace("My ", "").replace("The ", "")}</Link>
        ))}
        <button onClick={() => setMore((m) => !m)} aria-expanded={more} className="meta border-t-2 border-transparent py-4 text-mute">More</button>
        {more && (
          <div className="absolute bottom-full right-0 w-60 border border-line bg-raised p-2">
            {[...APP_NAV.filter((n) => !n.mobile), ...PUBLIC].map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setMore(false)} className="meta block px-3 py-3 text-ink/85 hover:text-ink">{n.label}</Link>
            ))}
          </div>
        )}
      </nav>
    </div>
  );
}
