import type { Metadata } from "next";
import Link from "next/link";
import { Accordion, type QA } from "@/components/public/Accordion";
import { KindleReach, MinGift, RecordFee, SparkCap, WeekLength } from "@/components/public/LiveFacts";
import { EndBand, PageHero } from "@/components/public/Page";
import { MegaphoneArt } from "@/components/public/art";
import { Button } from "@/components/ui";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Plain answers about giving, refunds, GOOD, the Hearth, kindling, bringing a friend, security and causes, including the honest limits.",
};

const GROUPS: { id: string; title: string; items: QA[] }[] = [
  {
    id: "getting-started", title: "Getting started", items: [
      { q: "What is GOODCOIN, in one breath?", a: <p>A memecoin on NEAR with three rules: give together, get GOOD, bring a friend. Every week there is one fire for one public good. If enough distinct givers join, 90% of the gifts goes to the cause and 10% to the Hearth, and the givers receive GOOD. If not, everyone is refunded and that week&apos;s GOOD can never exist.</p> },
      { q: "Is this live with real money?", a: <><p>No. GOODCOIN runs on <b>NEAR testnet</b> only, where NEAR has no monetary value. The contracts have not been audited. Treat it as a working experiment.</p><p>There are two deployments of the same code: a demo one with fires that last <WeekLength /> (the one this site reads), and one with production parameters and 7-day fires.</p></> },
      { q: "What do I need to take part?", a: <p>A NEAR testnet wallet with some testnet NEAR. Open <Link href="/app">the app</Link>, connect, and give to this week&apos;s fire. You don&apos;t need any GOOD to give, and reading every number on this site needs no wallet at all.</p> },
      { q: "Is this an investment?", a: <p>No. A gift is a gift. If the fire catches, 90% goes to the cause and you don&apos;t get it back. The GOOD you receive is a small receipt worth about 8–9% of your gift at the floor on day one. Nothing here promises a return.</p> },
    ],
  },
  {
    id: "giving", title: "Giving and refunds", items: [
      { q: "How much do I have to give?", a: <p>Your total gift in a fire must reach the minimum gift, currently <MinGift />. Your first gift of the week also pays a record fee of <RecordFee />, which pays for storage and is never refunded. Top-ups later in the same week pay no fee and don&apos;t count as an extra giver.</p> },
      { q: "Can I take my gift back before the week ends?", a: <p>No. Nobody, you included, can withdraw a gift before the fire settles. That keeps the giver count honest: no giving and pulling out at the last second.</p> },
      { q: "What happens if the fire is smothered?", a: <p>You can claim a full refund of your gift; the record fee is kept because it already paid for storage. Refunds never expire. The week&apos;s allowance of GOOD is destroyed, so the maximum supply shrinks, the goal eases by one step, and the streak resets.</p> },
      { q: "What happens to my NEAR if the fire catches?", a: <p>90% is paid to the cause&apos;s DAO treasury, and 10% goes into the Hearth, which backs GOOD. You receive a share of the fire&apos;s new GOOD in proportion to your gift.</p> },
      { q: "What if the week ends just as I give?", a: <p>Every gift names its week and its cause. If the week has turned over, the gift is rejected rather than landing in a fire you didn&apos;t choose.</p> },
      { q: "What if a cause's account disappears?", a: <p>Its payout fails, the cause is marked dead forever, and the NEAR is carried to the next fire that catches. If every cause were dead, giving would stop, and each carried amount would become refundable to the givers of the fire it came from. Redemption stays open forever.</p> },
    ],
  },
  {
    id: "good", title: "GOOD token", items: [
      { q: "What is GOOD worth?", a: <><p>At the backing floor, a giver&apos;s GOOD is worth about <b>8–9% of the gift</b> on day one (about 9% in the first fire, tending to 8% as the supply grows). It rises in NEAR with every later fire that catches, plus any market premium if GOOD trades somewhere. It can trade below the floor too.</p><p>Giving is giving: the GOOD is a receipt, not a refund.</p></> },
      { q: "How is GOOD created?", a: <p>Only when a fire catches. The 10% that goes into the Hearth buys new GOOD at no less than 1.25 times the backing floor, up to the week&apos;s allowance. Nothing else creates GOOD.</p> },
      { q: "Was any GOOD premined or given to the team?", a: <p>No premine, no team allocation, no vesting. There is one locked seed: 1 NEAR in the Hearth and a matching 1,000,000 GOOD recorded as an internal counter. It isn&apos;t in anyone&apos;s wallet, nobody owns it, and it can&apos;t be moved or redeemed. It keeps the floor defined from the first fire.</p> },
      { q: "When can I claim my GOOD?", a: <p>Any time after the fire settles, from <Link href="/app/claim">the claim page</Link>. GOOD from a caught fire can be claimed for 52 weeks; after that anyone may close the week, which cancels the unclaimed GOOD and lowers the maximum supply. NEAR refunds never expire.</p> },
      { q: "What is the maximum supply?", a: <p>It started at 1,000,000,000 GOOD and can only decrease: when a fire is smothered or a week is closed. See the live figure on <Link href="/tokenomics">Tokenomics</Link>.</p> },
    ],
  },
  {
    id: "hearth", title: "The Hearth", items: [
      { q: "What is the backing floor?", a: <p>The Hearth&apos;s NEAR divided by all backed GOOD. Anyone can redeem GOOD for exactly that much NEAR per GOOD, at any time, with no fee and no delay.</p> },
      { q: "Can the floor go down?", a: <p>No, not in NEAR. Catches, kindles and closed weeks raise it; redemptions and smothers leave it unchanged. The contract stores the highest floor reached and checks after every state change that it hasn&apos;t fallen.</p> },
      { q: "Is the floor a price guarantee?", a: <p><b>No.</b> The backing floor is denominated in NEAR. It is not a guaranteed market price or USD value. If NEAR falls in dollars, so does the floor in dollars.</p> },
      { q: "Who can take NEAR out of the Hearth?", a: <p>Nobody, except holders redeeming GOOD at the floor. There are no direct deposits and no admin withdrawals.</p> },
    ],
  },
  {
    id: "kindle", title: "Kindle", items: [
      { q: "What is kindling?", a: <p>A rescue. In the last 10% of a week, when a fire is a few givers short, a GOOD holder can burn GOOD to lower this week&apos;s goal by one giver. <Link href="/how-it-works#kindle">Read the full rules.</Link></p> },
      { q: "When is it allowed?", a: <p>Only in the rescue window (the last 10% of the week), only when the fire is short by at most a quarter of its goal (always at least one; this week, <KindleReach />), and never after every cause is dead.</p> },
      { q: "What does it cost?", a: <p>The first kindle of a fire burns one gift&apos;s Hearth share (10% of a minimum gift) worth of GOOD at the floor. Each further kindle in the same fire costs twice the one before. Kindles are never refunded.</p> },
      { q: "Does a rescued fire raise next week's goal?", a: <p>No. A kindled catch keeps the streak and sends the real gifts to the cause, but the goal stays where it was. The cause still receives only real gifts.</p> },
    ],
  },
  {
    id: "referrals", title: "Referrals", items: [
      { q: "How does bringing a friend work?", a: <p>When someone makes their first-ever gift and names you, and you already gave earlier in that same fire, a quarter of their first-gift weight (counted up to 1.5 minimum gifts) moves from them to you. At most <SparkCap /> of weight moves per friend.</p> },
      { q: "Does my friend lose anything?", a: <p>Yes, a little of their share of that fire&apos;s GOOD. That is where your bounty comes from. They keep most of it, and the fire is more likely to catch.</p> },
      { q: "Can I refer myself with extra accounts?", a: <p>You can, but you gain exactly nothing. The bounty moves weight between the two accounts; total weight doesn&apos;t change. Fake friends earn nothing, and other givers are never diluted.</p> },
      { q: "Does sharing a link earn anything?", a: <p>No. Only a real first-ever gift, in a fire you already gave to, moves weight. Clicks don&apos;t count. Newcomer status is used up even if that fire later smothers.</p> },
    ],
  },
  {
    id: "security", title: "Security", items: [
      { q: "Who controls the contract?", a: <p>Nobody. There is no owner, no setter, no pause and no upgrade method, and every access key on the contract account was deleted after launch. You can check the live key count on <Link href="/security">Security</Link>.</p> },
      { q: "Has it been audited?", a: <p>No. It has a full contract test suite including a property test, a golden trace shared with an independent Python model, and a live testnet run, but no professional audit. It runs on testnet only.</p> },
      { q: "Are giver counts real people?", a: <p>No. Accounts are not people. Anyone can make extra accounts, each costing at least a minimum gift plus a record fee. Without collusion, 90% of that money still reaches the cause.</p> },
      { q: "Can a cause cheat?", a: <p>A cause colluding with its insiders can fake a catch: they give, and the cause hands the 90% back off-chain. It costs them a slice of every fake fire and can push the goal up, but it can never buy GOOD below 1.25 times the floor. Curated DAO causes, fixed rotation and public flows make it harder. It is not eliminated.</p> },
      { q: "Should I trust this website?", a: <p>You don&apos;t have to. The site only reads the contract and never decides outcomes. Every number can be checked with the commands on <Link href="/docs">the docs page</Link>.</p> },
    ],
  },
  {
    id: "causes", title: "Causes and public goods", items: [
      { q: "How are causes chosen?", a: <p>An immutable list of named DAO treasuries was fixed at launch. Fires rotate through it in list order. Nobody can choose, add or edit a cause.</p> },
      { q: "Does the chain prove the good was done?", a: <p>No. It proves the NEAR reached a curated account, not what was done with it. After being paid, a cause can publish one report per fire (a link and a hash) on the <Link href="/good-wall">Good Wall</Link>. That report is the cause&apos;s own claim.</p> },
      { q: "Who are the causes on testnet?", a: <p>Testnet causes and early givers are team-controlled placeholders, labelled as demo. They exist to show every path working, including a cause that disappears.</p> },
      { q: "Could a deleted cause account be taken over?", a: <p>If a cause&apos;s account were deleted and then re-registered by someone else before any payout to it failed, the new owner would receive payouts. A contract on NEAR can&apos;t read another account&apos;s code, so this relies on DAO accounts not being deleted.</p> },
    ],
  },
];

export default function Faq() {
  return (
    <>
      <PageHero
        kicker="Questions, asked out loud"
        title={<>Frequently asked <span className="text-red">questions.</span></>}
        intro={<p>Straight answers, including the parts that aren&apos;t flattering. Live values are read from the contract.</p>}
        art={<MegaphoneArt className="w-72 md:w-96" />}
      >
        <nav aria-label="FAQ sections" className="flex flex-wrap gap-2">
          {GROUPS.map((g) => <a key={g.id} href={`#${g.id}`} className="eyebrow border-2 border-ink bg-paper px-3 py-2 hover:bg-charcoal hover:text-paper">{g.title}</a>)}
        </nav>
      </PageHero>

      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-24">
        {GROUPS.map((g, i) => (
          <section key={g.id} id={g.id} aria-labelledby={`${g.id}-h`} className="scroll-mt-20 pb-16 last:pb-0">
            <p className="eyebrow text-burnt">{String(i + 1).padStart(2, "0")}</p>
            <h2 id={`${g.id}-h`} className="display misprint mt-2 text-5xl sm:text-6xl">{g.title}</h2>
            <div className="mt-6"><Accordion items={g.items} /></div>
          </section>
        ))}
      </div>

      <EndBand title="Still curious?" body="The pamphlet explains every rule in order. The docs show how to check it all yourself.">
        <Button href="/how-it-works" size="lg">How it works</Button>
        <Button href="/docs" size="lg" tone="outline">Documentation</Button>
      </EndBand>
    </>
  );
}
