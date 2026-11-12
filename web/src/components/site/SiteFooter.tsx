import Link from "next/link";
import { Logo } from "@/components/ui";
import { CONTRACT, PRODUCTION_CONTRACT, REPO, accountUrl } from "@/lib/config";

const COLS: [string, [string, string][]][] = [
  ["Movement", [["/app", "Application"], ["/how-it-works", "How it works"], ["/tokenomics", "Tokenomics"], ["/good-wall", "Good Wall"], ["/about", "About"]]],
  ["Reference", [["/docs", "Documentation"], ["/security", "Security"], ["/faq", "FAQ"]]],
  ["Legal", [["/legal/terms", "Terms"], ["/legal/privacy", "Privacy"]]],
];

export function SiteFooter() {
  return (
    <footer className="paper-dark mt-0">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo light />
          <p className="display mt-4 text-4xl text-ember">Make good contagious.</p>
          <p className="mt-3 max-w-sm font-serif text-paper/75">One spark is small. Together, we keep the fire alive.</p>
        </div>
        {COLS.map(([title, links]) => (
          <div key={title}>
            <p className="eyebrow text-mustard">{title}</p>
            <ul className="mt-4 space-y-2">
              {links.map(([href, label]) => <li key={href}><Link href={href} className="hover:text-ember">{label}</Link></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-paper/15">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm text-paper/60 sm:px-6">
          <p>Built on NEAR testnet · contracts have no access keys · the backing floor is in NEAR, not a price guarantee.</p>
          <p className="flex gap-4">
            <a className="hover:text-ember" href={accountUrl(CONTRACT)} target="_blank" rel="noreferrer">Demo contract ↗</a>
            <a className="hover:text-ember" href={accountUrl(PRODUCTION_CONTRACT)} target="_blank" rel="noreferrer">Production contract ↗</a>
            <a className="hover:text-ember" href={REPO} target="_blank" rel="noreferrer">Source ↗</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
