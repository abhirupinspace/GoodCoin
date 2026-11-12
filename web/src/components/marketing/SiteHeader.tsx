import Link from "next/link";

const NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/tokenomics", label: "Tokenomics" },
  { href: "/good-wall", label: "Good Wall" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand">GOODCOIN</Link>
      <nav>{NAV.map((n) => <Link key={n.href} href={n.href}>{n.label}</Link>)}</nav>
      <Link href="/app" className="cta">Launch App ↗</Link>
    </header>
  );
}
