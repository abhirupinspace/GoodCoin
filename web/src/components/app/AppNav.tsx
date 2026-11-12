import Link from "next/link";

export const APP_NAV = [
  { href: "/app", label: "The Fire", mobile: true },
  { href: "/app/good", label: "My GOOD", mobile: true },
  { href: "/app/hearth", label: "The Hearth", mobile: true },
  { href: "/app/history", label: "My History", mobile: true },
  { href: "/app/referrals", label: "Referrals", mobile: false },
  { href: "/app/transactions", label: "Transactions", mobile: false },
];
const PUBLIC = [{ href: "/docs", label: "Documentation" }, { href: "/security", label: "Security" }];

/** Desktop sidebar. On mobile: bottom bar with the 4 `mobile` items + a More menu (TODO with designs). */
export function AppSidebar() {
  return (
    <aside className="app-sidebar">
      <Link href="/" className="brand">GOODCOIN</Link>
      <nav>{APP_NAV.map((n) => <Link key={n.href} href={n.href}>{n.label}</Link>)}</nav>
      <p className="label">Public</p>
      <nav>{PUBLIC.map((n) => <Link key={n.href} href={n.href}>{n.label}</Link>)}</nav>
    </aside>
  );
}

export function AppBottomNav() {
  return (
    <nav className="app-bottom-nav">
      {APP_NAV.filter((n) => n.mobile).map((n) => <Link key={n.href} href={n.href}>{n.label}</Link>)}
      <Link href="/app/transactions">More</Link>
    </nav>
  );
}
