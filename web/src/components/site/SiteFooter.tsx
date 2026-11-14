import Link from "next/link";
import { Flame } from "@/components/brand";
import { CONTRACT, PRODUCTION_CONTRACT, REPO, accountUrl } from "@/lib/config";

const COLS: [string, [string, string][]][] = [
  ["Movement", [["/app", "Application"], ["/how-it-works", "How it works"], ["/tokenomics", "Tokenomics"], ["/good-wall", "Good Wall"], ["/about", "About"]]],
  ["Reference", [["/docs", "Documentation"], ["/security", "Security"], ["/faq", "FAQ"]]],
  ["Legal", [["/legal/terms", "Terms"], ["/legal/privacy", "Privacy"]]],
];

/** The closing page of the campaign. */
export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-line bg-paper">
      <div className="shell pt-24">
        <div className="flex items-end gap-6">
          <p className="mega text-ink">Make good <span className="text-red">contagious.</span></p>
        </div>
        <div className="mt-20 grid gap-12 border-t border-line pt-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="flex items-start gap-4">
            <Flame size={36} />
            <div>
              <p className="display text-3xl text-ink">GOODCOIN</p>
              <p className="mt-2 max-w-xs text-sm text-mute">One cause. One community. One fire every week.</p>
            </div>
          </div>
          {COLS.map(([title, links]) => (
            <div key={title}>
              <p className="meta text-mute">{title}</p>
              <ul className="mt-5 space-y-3">
                {links.map(([href, label]) => <li key={href}><Link href={href} className="tlink text-sm text-ink/85 hover:text-ink">{label}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-20 border-t border-line">
        <div className="shell flex flex-wrap items-center justify-between gap-4 py-6">
          <p className="meta text-mute">NEAR testnet · no access keys · the floor is in NEAR, not a price</p>
          <p className="meta flex flex-wrap gap-6 text-mute">
            <a className="hover:text-ink" href={accountUrl(CONTRACT)} target="_blank" rel="noreferrer">Demo contract ↗</a>
            <a className="hover:text-ink" href={accountUrl(PRODUCTION_CONTRACT)} target="_blank" rel="noreferrer">Production contract ↗</a>
            <a className="hover:text-ink" href={REPO} target="_blank" rel="noreferrer">Source ↗</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
