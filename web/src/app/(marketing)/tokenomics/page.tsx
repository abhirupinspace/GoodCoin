import type { Metadata } from "next";
import Link from "next/link";
import { HearthArt, KindleArt, Seal } from "@/components/art";
import { HearthNumbers } from "@/components/hearth/HearthNumbers";
import { KindleReach } from "@/components/public/LiveFacts";
import { Callout, Chapter, Curious, EndBand, Ledger, PageHero } from "@/components/public/Page";
import { LedgerArt } from "@/components/public/art";
import { FireCharts, KindleTable, ProtocolStats, SupplyNumbers, SupplyReductions, TokenFacts } from "@/components/public/tok-Live";
import { Button, Stamp } from "@/components/ui";
import { units } from "@/lib/format";
import { bounty, fee, mintable, share } from "@/lib/protocol";

export const metadata: Metadata = {
  title: "Tokenomics",
  description: "GOOD: a NEP-141 token created only when a fire catches, backed by the Hearth, with a backing floor in NEAR that never decreases and a maximum supply that only shrinks.",
};

/* Illustrative example: fire №0 of the demo deployment, recomputed with the site's exact protocol math. */
const N = (x: string) => {
  const [w, f = ""] = x.split(".");
  return BigInt(w) * 10n ** 24n + BigInt((f + "0".repeat(24)).slice(0, 24));
};
function demoExample() {
  const minGift = N("0.1");
  const gifts = { alice: N("1"), bob: N("0.1"), carol: N("0.1"), dave: N("0.1") };
  const b = bounty(gifts.bob, minGift, 2500n); // bob's first-ever gift, sparked by alice
  const w = { alice: gifts.alice + b, bob: gifts.bob - b, carol: gifts.carol, dave: gifts.dave };
  const X = Object.values(gifts).reduce((a, g) => a + g, 0n);
  const W = Object.values(w).reduce((a, g) => a + g, 0n);
  const H = N("1"), B = N("1000000");
  const A = N("2500000"); // 0.25% of the 1,000,000,000 GOOD genesis headroom
  const f = fee(X, 1000n);
  const M = mintable(f, B, H, 2500n, A);
  const shares = Object.fromEntries(Object.entries(w).map(([k, v]) => [k, share(M, v, W)])) as Record<keyof typeof w, bigint>;
  const floorBefore = (H * 10n ** 24n) / B, floorAfter = ((H + f) * 10n ** 24n) / (B + M);
  const carolNear = (shares.carol * (H + f)) / (B + M);
  const carolPct = (Number((carolNear * 1000n) / gifts.carol) / 10).toFixed(1);
  return { X, f, pay: X - f, M, b, w, shares, floorBefore, floorAfter, carolNear, carolPct };
}
const fmt = (v: bigint, d = 3) => units(v, d).replace(/\.?0+$/, "") || "0";
const fl = (v: bigint) => `${units(v, 10)}`;

export default function Tokenomics() {
  const ex = demoExample();
  return (
    <>
      <PageHero
        kicker="Chapter three · The technical manual"
        title={<>GOOD, by the <span className="text-red">numbers.</span></>}
        intro={<p>A plain account of how GOOD is made, what backs it and what can never happen to it. Every live figure on this page is read from the contract; every derived figure says what it was derived from.</p>}
        art={<LedgerArt className="w-72 rotate-2 drop-shadow-[8px_8px_0_rgba(36,34,30,0.9)] md:w-96" />}
      />

      {/* LIVE PANEL */}
      <section className="paper-dark relative overflow-hidden border-b-[3px] border-ink" aria-labelledby="stats-title">
        <div className="halftone-ember absolute inset-y-0 right-0 w-1/4 opacity-15" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-mustard">Live from the contract · refreshed every few seconds</p>
              <h2 id="stats-title" className="display misprint-paper mt-2 text-5xl sm:text-6xl">Protocol statistics</h2>
            </div>
            <Stamp tone="ember">Testnet</Stamp>
          </div>
          <div className="mt-10"><ProtocolStats /></div>
        </div>
      </section>

      <Chapter id="overview" no="01" kicker="The token" title="GOOD at a glance"
        aside={<div className="frame bg-paper p-6"><TokenFacts /></div>}>
        <p>GOOD is a standard NEAR fungible token (NEP-141, with 24 decimals). You can hold it, send it, and redeem it with the contract for its share of the Hearth at any time.</p>
        <p>It is created in exactly one way: when a fire catches, its givers receive new GOOD, paid for out of the 10% of their gifts that goes into the Hearth. Nothing else creates GOOD: no owner, no mint function, no emissions outside the fires.</p>
      </Chapter>

      <Chapter id="supply" no="02" kicker="A cap that only moves down" title="Maximum supply" tone="parchment"
        aside={<div className="frame bg-paper p-6"><SupplyNumbers /></div>}>
        <p>GOOD started with a maximum supply of <b>1,000,000,000</b>. That number can never increase. It decreases when:</p>
        <ul className="list-none space-y-3 font-sans text-base">
          <li className="border-l-4 border-red pl-4"><b>A fire is smothered.</b> That week&apos;s allowance is destroyed: GOOD that was never minted, and now never can be.</li>
          <li className="border-l-4 border-ink pl-4"><b>A week is closed.</b> 52 weeks after a catch, any GOOD its givers never claimed is cancelled, and the cap falls by the same amount.</li>
        </ul>
        <p>Burning GOOD (by kindling or redeeming) reduces the GOOD in existence, but it never frees room under the cap.</p>
      </Chapter>

      <Chapter id="launch" no="03" kicker="Fair launch, explained honestly" title="No premine. No team. One locked seed."
        aside={<div className="frame parchment relative overflow-hidden p-8"><div className="rays absolute inset-0 opacity-50" aria-hidden /><Seal className="relative mx-auto w-48" text="NO PREMINE · NO TEAM ALLOCATION · NO ADMIN KEY · " /></div>}>
        <p>There is <b>no premine</b>, <b>no team allocation</b>, <b>no vesting</b> and <b>no owner</b>. After the contract was created, every access key on its account was deleted, so nobody, including the people who deployed it, can change the rules, the parameters or the causes.</p>
        <p>There is one thing at launch that needs explaining: the <b>locked seed</b>. The deployer put 1 NEAR into the Hearth, and the contract records a matching 1,000,000 GOOD as an internal counter. That seed is not a balance in anyone&apos;s wallet. Nobody owns it; it can&apos;t be transferred, redeemed or burned.</p>
        <p>It exists for one reason: so the backed supply is never zero. That keeps the floor defined from the very first fire and closes the &ldquo;first depositor&rdquo; trick by which an early holder could otherwise distort the floor.</p>
      </Chapter>

      <Chapter id="minting" no="04" kicker="Where every GOOD comes from" title="How GOOD is minted" tone="dark"
        aside={<div className="frame-ember border-paper bg-charcoal p-6 font-sans text-paper sm:p-8">
          <p className="eyebrow text-mustard">The minting rule</p>
          <p className="display mt-3 text-4xl leading-tight">Each new GOOD is paid for with at least 1.25× the floor. Nothing else creates GOOD.</p>
        </div>}>
        <p>When a fire catches, 10% of its gifts go into the Hearth. That fee buys the fire&apos;s new GOOD at <b>1.25 times the current backing floor</b>, but never more than the week&apos;s <b>allowance</b>: a quarter of one percent of the remaining headroom under the cap.</p>
        <p>The GOOD is earmarked for the fire&apos;s givers the moment it settles and shared among them by weight. Each giver claims their own share.</p>
        <Curious light>
          <p>M = min(A, ⌊fee · B ÷ (H · 1.25)⌋), with fee = ⌊total · 10%⌋, H the Hearth and B the backed GOOD before the catch, A = ⌊0.25% · headroom⌋. All arithmetic is exact integer math, rounded in the Hearth&apos;s favour.</p>
        </Curious>
      </Chapter>

      <Chapter id="hearth" no="05" kicker="What stands behind GOOD" title="Hearth backing" tone="parchment"
        aside={<div className="frame bg-paper p-6"><HearthArt className="mx-auto w-full max-w-xs" /></div>}>
        <p>The Hearth is the NEAR held by the contract to back GOOD. It grows only from the fees of fires that catch. Nobody can deposit into it directly, and nobody can withdraw from it except by redeeming GOOD at the floor.</p>
        <p>It backs every <b>backed GOOD</b>: the GOOD in wallets, the GOOD earmarked for givers who haven&apos;t claimed yet, and the locked seed.</p>
        <div className="font-sans text-base"><HearthNumbers /></div>
      </Chapter>

      <Chapter id="floor" no="06" kicker="What you can always get back" title="The redemption floor">
        <p>The <b>backing floor</b> is the Hearth&apos;s NEAR divided by all backed GOOD. Anyone can burn GOOD and receive exactly that much NEAR per GOOD, at any time. No fee, no delay, no admin, even while earlier fires await settlement.</p>
        <p>The floor never goes down. A catch raises it, because new GOOD is paid for above it. A redemption leaves it unchanged, because it rounds in the Hearth&apos;s favour. A kindle or a closed week raises it. A smother leaves it where it is. The contract stores the highest floor ever reached and checks after every state change that it hasn&apos;t fallen.</p>
        <div className="py-2"><Callout>THE BACKING FLOOR IS DENOMINATED IN NEAR. IT IS NOT A GUARANTEED MARKET PRICE OR USD VALUE.</Callout></div>
        <p className="text-base text-ink/70">If GOOD trades anywhere, its market price can be above the floor or below it. The floor only says how much NEAR the contract will hand back for it.</p>
      </Chapter>

      <Chapter id="ratchet" no="07" kicker="The goal that grows with us" title="The ratchet" tone="parchment"
        aside={<div className="frame bg-paper p-6 font-sans">
          <table className="w-full border-collapse text-sm">
            <caption className="eyebrow mb-2 text-left text-burnt">Next week&apos;s goal</caption>
            <tbody className="divide-y divide-ink/20">
              <tr><th scope="row" className="py-2.5 text-left font-normal">Caught on its own</th><td className="py-2.5 text-right font-bold text-forest">≈ +10%</td></tr>
              <tr><th scope="row" className="py-2.5 text-left font-normal">Caught with a kindle</th><td className="py-2.5 text-right font-bold">Unchanged</td></tr>
              <tr><th scope="row" className="py-2.5 text-left font-normal">Smothered</th><td className="py-2.5 text-right font-bold text-red">≈ −10%</td></tr>
            </tbody>
          </table>
        </div>}>
        <p>The weekly goal is a number of distinct givers. After a fire catches on its own, the goal steps up by about 10%; after a smother, it steps back down. A fire rescued by kindling doesn&apos;t move it, so holders can&apos;t pump the goal by buying catches.</p>
        <p>The steps are exact fractions, so a catch followed by a smother lands exactly where it started, and the goal stays within fixed bounds.</p>
      </Chapter>

      <section id="reductions" className="scroll-mt-20">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
          <p className="eyebrow text-burnt"><span className="mr-3">08</span>The record so far</p>
          <h2 className="display misprint mt-3 text-5xl sm:text-6xl md:text-7xl">Supply reductions &amp; fire ledger</h2>
          <p className="mt-6 max-w-3xl font-serif text-lg leading-relaxed text-ink/85">What the cap has lost to smothers and closures, and what each caught fire put into the Hearth and created as GOOD, all derived from the contract&apos;s own fire history.</p>
          <div className="mt-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <SupplyReductions />
            <div className="font-serif text-lg leading-relaxed text-ink/85">
              <p>Smothers don&apos;t touch anyone&apos;s GOOD: they lower the ceiling, not the circulating supply. A week in which nobody gives is smothered too, so an idle protocol slowly lowers its own cap.</p>
            </div>
          </div>
          <div className="mt-10"><FireCharts /></div>
        </div>
      </section>

      <Chapter id="kindle" no="09" kicker="A rescue, paid in GOOD" title="Kindle economics" tone="dark"
        aside={<KindleTable />}>
        <p>In the last 10% of a week, when a fire is at most a quarter of its goal short (always at least one; this week, <KindleReach />), a holder can burn GOOD to lower the goal by one giver.</p>
        <p>The first kindle costs <b>one gift&apos;s Hearth share</b> (10% of a minimum gift) worth of GOOD at the floor. That is exactly what a real giver would have added to the Hearth. Each further kindle in the same fire costs double.</p>
        <p>Burned GOOD is gone, and the NEAR behind it stays in the Hearth for everyone else, so every kindle raises the floor. A holder who owns a share <i>s</i> of all backed GOOD gets <i>s</i> of the burn back through the floor; their net cost is the rest.</p>
        <p>Kindles are never refunded and never raise next week&apos;s goal. The cause still receives only real gifts.</p>
        <div className="pt-2"><KindleArt className="h-28 w-auto" /></div>
      </Chapter>

      <Chapter id="example" no="10" kicker="Illustrative example" title="A worked example: fire №0"
        aside={<div className="frame bg-paper p-6">
          <div className="flex items-center justify-between gap-3"><p className="eyebrow text-burnt">Recomputed with the site&apos;s protocol math</p><Stamp tone="ink">Example</Stamp></div>
          <div className="mt-4"><Ledger rows={[
            ["Gifts", `${fmt(ex.X)} NEAR`],
            ["To the cause (90%)", `${fmt(ex.pay)} NEAR`],
            ["To the Hearth (10%)", `${fmt(ex.f)} NEAR`],
            ["GOOD issued", `${units(ex.M, 0)} GOOD`],
            ["Alice (gave 1, sparked Bob)", `${units(ex.shares.alice, 0)} GOOD`],
            ["Bob (gave 0.1, first-ever gift)", `${units(ex.shares.bob, 0)} GOOD`],
            ["Carol · Dave (0.1 each)", `${units(ex.shares.carol, 0)} GOOD each`],
            ["Floor before (NEAR / GOOD)", fl(ex.floorBefore)],
            ["Floor after", fl(ex.floorAfter)],
          ]} /></div>
        </div>}>
        <p>The first fire on the demo deployment (6-minute fires, minimum gift 0.1 NEAR, goal 4) is a good small example. These figures are recomputed here from its inputs with the same exact arithmetic the contract uses; you can check them against fire №0 on the <Link className="underline underline-offset-4" href="/good-wall/0">Good Wall</Link>.</p>
        <p>Alice gave 1 NEAR. Bob gave 0.1 NEAR as his first-ever gift and named Alice as his spark, so {fmt(ex.b)} NEAR of his weight moved to her. Carol and Dave gave 0.1 NEAR each. Four givers met the goal of four, and the fire caught.</p>
        <p>The Hearth started from its seed: 1 NEAR backing 1,000,000 GOOD. The fee of {fmt(ex.f)} NEAR bought {units(ex.M, 0)} GOOD at 1.25 times that floor, and the floor rose.</p>
        <p className="text-base text-ink/70">Each giver also paid the 0.005 NEAR record fee on their first gift; it pays for storage and is not part of the gifts above. Notice the proportions: Carol&apos;s {units(ex.shares.carol, 0)} GOOD redeems for about {fmt(ex.carolNear, 4)} NEAR at the new floor, about {ex.carolPct}% of her 0.1 NEAR gift. Giving is giving.</p>
      </Chapter>

      <EndBand title="Every GOOD was made by giving." body="Check the live numbers, then join the fire.">
        <Button href="/app" size="lg">Join this week&apos;s fire</Button>
        <Button href="/app/hearth" size="lg" tone="outline">Open the Hearth</Button>
        <Button href="/how-it-works" size="lg" tone="outline">How it works</Button>
      </EndBand>
    </>
  );
}
