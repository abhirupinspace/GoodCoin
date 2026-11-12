import Link from "next/link";

const LINKS = [
  ["/about", "About"], ["/faq", "FAQ"], ["/docs", "Docs"], ["/security", "Security"],
  ["/status", "Status"], ["/brand", "Brand"], ["/contact", "Contact"], ["/sitemap", "Sitemap"],
  ["/legal/terms", "Terms"], ["/legal/privacy", "Privacy"], ["/legal/risk-disclosure", "Risk disclosure"],
] as const;

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <nav>{LINKS.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}</nav>
      <p>Testnet. Contracts have no access keys. GOOD's floor never goes down (in NEAR).</p>
    </footer>
  );
}
