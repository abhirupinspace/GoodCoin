import type { Metadata } from "next";
import Link from "next/link";
import { Crowd, HandsEmber, HearthArt, KindleArt, MonumentalFlame } from "@/components/art";
import { LiveFire } from "@/components/fire/LiveFire";
import { HearthNumbers } from "@/components/hearth/HearthNumbers";
import { GoalNow, KindleCostNow, KindleReach, MaxSupplyNow, MinGift, RecordFee, SparkCap, WeekLength } from "@/components/public/LiveFacts";
import { MoneyFlow } from "@/components/public/MoneyFlow";
import { Callout, Chapter, Curious, EndBand, PageHero } from "@/components/public/Page";
import { PamphletArt } from "@/components/public/art";
import { Button, Stamp, Term } from "@/components/ui";

export const metadata: Metadata = {
  title: "How it works",
  description: "An illustrated pamphlet: the weekly fire, giving and refunds, GOOD, the Hearth and its backing floor, kindling and bringing a friend.",
};

const CONTENTS = [
  ["what", "What is GOODCOIN"],
  ["fire", "The weekly fire"],
  ["giving", "How giving works"],
  ["caught", "When the fire catches"],
  ["smothered", "When it is smothered"],
  ["issuance", "How GOOD is issued"],
  ["hearth", "How the Hearth works"],
  ["example", "Work it out"],
  ["kindle", "What kindling does"],
  ["referrals", "Bring a friend"],
] as const;

function Box({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return <div className={`${dark ? "frame-ember border-paper bg-charcoal text-paper" : "frame parchment"} relative overflow-hidden p-6 font-sans sm:p-8`}>{children}</div>;
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="mt-2 space-y-3 font-sans text-base">
      {items.map((t, i) => (
        <li key={i} className="grid grid-cols-[2.5rem_1fr] items-baseline gap-2">
          <span className="display text-3xl text-ember">{String(i + 1).padStart(2, "0")}</span><span>{t}</span>
        </li>
      ))}
    </ol>
  );
}

export default function HowItWorks() {
  return (
    <>
      <PageHero
        kicker="Chapter two · How it works"
        title={<>How the fire <span className="text-red">works.</span></>}
        intro={<p>Everything GOODCOIN does, explained plainly and in order, with numbers read live from the contract. No formulas required, but they are here for the curious.</p>}
        art={<PamphletArt className="w-64 -rotate-3 drop-shadow-[8px_8px_0_rgba(36,34,30,0.9)] md:w-80" />}
      >
        <nav aria-label="Contents" className="frame max-w-2xl bg-paper p-5">
          <p className="eyebrow text-burnt">Contents</p>
          <ol className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {CONTENTS.map(([id, label], i) => (
              <li key={id}>
                <a href={`#${id}`} className="group flex gap-3 text-sm font-semibold hover:text-burnt">
                  <span className="num text-ember">{String(i + 1).padStart(2, "0")}</span><span className="group-hover:underline">{label}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </PageHero>

      <Chapter id="what" no="01" kicker="The idea" title="What is GOODCOIN?"
        aside={<Box><Crowd count={6} className="h-36 w-full" /><p className="display mt-4 text-3xl">Three rules</p><ol className="mt-2 space-y-1 text-base"><li><b>1.</b> Give together.</li><li><b>2.</b> Get GOOD.</li><li><b>3.</b> Bring a friend.</li></ol></Box>}>
        <p>Memecoins coordinate millions of people to buy. GOODCOIN is a memecoin on NEAR that coordinates people to <b>give together</b> instead.</p>
        <p>Every week there is one fire for one public good. People throw NEAR in. If enough distinct givers join before the week ends, the fire catches: the cause receives the gifts, and the givers receive a new token, <b>GOOD</b>. If not enough people show up, everyone gets their gift back, and the GOOD that fire could have created never exists.</p>
        <p>There is no owner, no admin key, no premine and no team allocation. A single contract holds the money and checks every rule. The site you are reading only displays what the contract reports.</p>
      </Chapter>

      <Chapter id="fire" no="02" kicker="One cause, one week" title="What is a weekly fire?" tone="dark"
        aside={<div className="frame-ember border-paper bg-charcoal p-6 sm:p-8"><LiveFire light compact /></div>}>
        <p>A <b>fire</b> is a weekly campaign for one cause. It runs on a fixed schedule (here, each fire lasts <WeekLength />) and has one goal: a number of <b>distinct givers</b>. This week&apos;s goal is <GoalNow />.</p>
        <p>The causes are a fixed list of DAO treasuries chosen at launch. They take turns in list order; nobody can choose, add or edit a cause, and no cause gets two weeks in a row unless it is the only one left.</p>
        <p>The goal moves with the community. After a fire catches on its own, next week&apos;s goal grows by about 10%. After a fire is smothered, it eases back by the same step. So the streak only survives if the circle keeps widening.</p>
        <Curious light>
          <p>The base goal is Ĝ = Ĝ₀ · 1.1<sup>e</sup>, computed exactly as a fraction and rounded up. <i>e</i> rises by one after an unkindled catch and falls by one after a smother, within fixed bounds. A catch followed by a smother returns exactly to the start.</p>
          <p>The cause, goal and allowance of a fire are pinned when the previous fire settles, so nothing changes while you are giving.</p>
        </Curious>
      </Chapter>

      <Chapter id="giving" no="03" kicker="Throwing NEAR in" title="How giving works"
        aside={<Box><p className="eyebrow text-burnt">At a glance</p><dl className="mt-3 divide-y divide-ink/20 border-y-2 border-ink text-sm">
          <div className="flex justify-between gap-4 py-2.5"><dt>Minimum gift (your total this week)</dt><dd className="font-bold"><MinGift /></dd></div>
          <div className="flex justify-between gap-4 py-2.5"><dt>Record fee (first gift of the week)</dt><dd className="font-bold"><RecordFee /></dd></div>
          <div className="flex justify-between gap-4 py-2.5"><dt>Withdraw before the week ends?</dt><dd className="font-bold">No</dd></div>
          <div className="flex justify-between gap-4 py-2.5"><dt>Counts toward the goal</dt><dd className="font-bold">Once per account</dd></div>
        </dl></Box>}>
        <Steps items={[
          <>You choose to give to <b>this week&apos;s fire and its cause</b>. Your gift names both, so it can never land in a fire you didn&apos;t choose. If the week has just turned over, the gift is rejected.</>,
          <>Your first gift of the week includes a small <Term def="A fixed fee paid once per account per fire. It pays for the on-chain storage your gift needs, and it is never refunded.">record fee</Term> of <RecordFee />. It pays for storage and is never refunded. Top-ups later in the week pay no fee.</>,
          <>Your total gift for the week must reach the minimum gift of <MinGift />. Every account that reaches it counts as one giver.</>,
          <>Your NEAR waits in the contract until the week ends. Nobody can withdraw it, you included, so the giver count can&apos;t be faked by giving and pulling out at the last second.</>,
          <>When the week ends, anyone can settle the fire. It either catches or is smothered. There is no third outcome and no judge.</>,
        ]} />
        <p className="text-base text-ink/70">Causes and the contract itself cannot give. Your weight in the fire is simply your total gift, adjusted only by the bring-a-friend rule below.</p>
      </Chapter>

      <Chapter id="caught" no="04" kicker="Enough of us showed up" title={<>When the fire <span className="text-forest">catches</span></>} tone="parchment"
        aside={<div className="frame bg-paper p-6"><MonumentalFlame className="mx-auto h-56" /><div className="mt-4 text-center"><Stamp tone="forest">Caught</Stamp></div></div>}>
        <p>If the fire has at least as many givers as its goal when the week ends, it <b>catches</b>.</p>
        <ul className="list-none space-y-3 font-sans text-base">
          <li className="border-l-4 border-forest pl-4"><b>90% goes to the cause.</b> Anyone can trigger the payout to the cause&apos;s DAO treasury. If the cause&apos;s account has disappeared, the NEAR is carried to the next fire that catches instead of being lost.</li>
          <li className="border-l-4 border-ember pl-4"><b>10% goes to the Hearth</b>, the reserve that backs every GOOD.</li>
          <li className="border-l-4 border-ink pl-4"><b>Givers receive new GOOD</b>, shared by weight: give twice as much, receive twice as much. Each giver claims their own share.</li>
        </ul>
        <p>The streak grows by one, and unless the fire was rescued by a kindle, next week&apos;s goal grows too.</p>
      </Chapter>

      <Chapter id="smothered" no="05" kicker="Not enough of us" title={<>When it is <span className="text-red">smothered</span></>}
        aside={<Box><div className="flex items-center justify-between"><p className="display text-3xl">Max supply</p><Stamp tone="red">Only falls</Stamp></div><p className="display num mt-3 text-4xl"><MaxSupplyNow /></p><p className="mt-2 text-sm text-ink/70">Live. It started at 1,000,000,000 GOOD and has never increased.</p></Box>}>
        <p>If the week ends with fewer givers than the goal, the fire is <b>smothered</b>.</p>
        <Steps items={[
          <>Every giver can claim a <b>full refund of their gift</b>. The record fee paid for storage and is not refunded. Refunds never expire.</>,
          <>That week&apos;s <Term def="The most GOOD a fire may create: a quarter of one percent of the GOOD that could still ever exist. Pinned before the fire starts.">allowance</Term> of GOOD is destroyed. It was never minted, and now it never can be: the <b>maximum supply shrinks</b>, permanently.</>,
          <>The <Term def="The weekly goal moves one step up after an unkindled catch and one step down after a smother.">ratchet</Term> turns down: next week&apos;s goal eases by one step.</>,
          <>The streak resets to zero.</>,
        ]} />
        <p className="text-base text-ink/70">A week in which nobody gives at all is also smothered, so a quiet protocol slowly lowers its own cap and its own goal.</p>
      </Chapter>

      <Chapter id="issuance" no="06" kicker="Where GOOD comes from" title="How GOOD is issued" tone="dark"
        aside={<div className="frame-ember border-paper bg-charcoal p-6 font-sans text-paper sm:p-8">
          <p className="eyebrow text-mustard">The only way GOOD is made</p>
          <ol className="mt-4 space-y-4">
            <li><p className="display text-2xl text-ember">A fire catches</p><p className="text-sm text-paper/75">and puts 10% of its gifts in the Hearth.</p></li>
            <li><p className="display text-2xl text-ember">That 10% buys new GOOD</p><p className="text-sm text-paper/75">at no less than 1.25× the backing floor.</p></li>
            <li><p className="display text-2xl text-ember">Up to the allowance</p><p className="text-sm text-paper/75">0.25% of the GOOD that could still exist.</p></li>
          </ol>
        </div>}>
        <p>Nobody mints GOOD. It is created only when a fire catches, and it is <b>paid for</b>: the givers&apos; 10% that goes into the Hearth buys it, at a price of at least <b>1.25 times the backing floor</b>.</p>
        <p>Because each new GOOD brings in more NEAR than the floor it joins, every catch raises the floor for everyone already holding GOOD.</p>
        <p>Each fire can create at most its <b>allowance</b>: a quarter of one percent of the remaining headroom under the maximum supply. Emission therefore slows gently and never runs out.</p>
        <p>GOOD from a caught fire is set aside for its givers at once. Givers claim it whenever they like within 52 weeks; after that, anyone may close the week, which cancels the unclaimed GOOD and lowers the maximum supply by the same amount.</p>
        <Curious light>
          <p>GOOD minted M = min(A, fee · B ÷ (H · 1.25)), where fee = 10% of the gifts, H is the Hearth and B the backed GOOD before the catch, and A the allowance. A giver receives M · their weight ÷ total weight, rounded down.</p>
        </Curious>
      </Chapter>

      <Chapter id="hearth" no="07" kicker="What every fire leaves behind" title="How the Hearth works" tone="parchment"
        aside={<div className="frame bg-paper p-6"><HearthArt className="mx-auto w-full max-w-xs" /></div>}>
        <p>The <b>Hearth</b> is the NEAR reserve inside the contract. It grows only from the 10% of fires that catch. There are no direct deposits.</p>
        <p>The <Term def="NEAR per GOOD that anyone can redeem at any time: the Hearth divided by all backed GOOD. It never decreases.">backing floor</Term> is the Hearth&apos;s NEAR divided by all backed GOOD (GOOD in wallets, GOOD set aside for givers who haven&apos;t claimed, and a locked seed nobody owns). Anyone can redeem GOOD for exactly that share at any time: no fee, no delay, no admin, even while old fires await settlement.</p>
        <div className="not-prose my-6 font-sans text-base"><HearthNumbers /></div>
        <table className="w-full border-collapse font-sans text-sm">
          <caption className="eyebrow mb-2 text-left text-ink/60">What happens to the floor</caption>
          <thead><tr className="border-b-2 border-ink text-left"><th scope="col" className="py-2">Action</th><th scope="col" className="py-2">Floor</th></tr></thead>
          <tbody className="divide-y divide-ink/20">
            <tr><td className="py-2">A fire catches</td><td className="py-2 font-bold text-forest">Rises</td></tr>
            <tr><td className="py-2">Someone redeems GOOD</td><td className="py-2 font-bold">Unchanged (rounds in the Hearth&apos;s favour)</td></tr>
            <tr><td className="py-2">A holder kindles, or a week is closed</td><td className="py-2 font-bold text-forest">Rises</td></tr>
            <tr><td className="py-2">A fire is smothered</td><td className="py-2 font-bold">Unchanged</td></tr>
          </tbody>
        </table>
        <p className="text-base">The contract stores the highest floor ever reached and checks after every state change that the floor has not gone below it.</p>
        <Callout>The backing floor is denominated in NEAR. It is not a guaranteed market price or USD value.</Callout>
      </Chapter>

      <section id="example" className="paper-dark relative scroll-mt-20 overflow-hidden">
        <div className="halftone-ember absolute inset-y-0 left-0 w-1/3 opacity-15" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="eyebrow text-mustard"><span className="mr-3">08</span>Follow the money</p>
            <h2 className="display misprint-paper mt-3 text-5xl sm:text-6xl md:text-7xl">Work it out yourself.</h2>
            <p className="mt-6 font-serif text-lg leading-relaxed text-paper/85">Pick a number of givers and a gift. The example runs the protocol&apos;s exact arithmetic, with the contract&apos;s rounding, against the live Hearth and shows where every NEAR goes.</p>
            <p className="mt-4 font-serif text-lg leading-relaxed text-paper/85">Notice how small a giver&apos;s GOOD is next to the gift: about 8–9% of it at the floor. <b>Giving is giving.</b> The GOOD is a receipt that rises with every later fire that catches.</p>
          </div>
          <MoneyFlow />
        </div>
      </section>

      <Chapter id="kindle" no="09" kicker="When a fire is close" title="What kindling does"
        aside={<Box>
          <KindleArt className="mx-auto h-36" />
          <p className="eyebrow mt-4 text-burnt">Cost at today&apos;s floor</p>
          <dl className="mt-2 divide-y divide-ink/20 border-y-2 border-ink text-sm">
            <div className="flex justify-between gap-4 py-2.5"><dt>1st kindle of a fire</dt><dd className="font-bold"><KindleCostNow j={0} /></dd></div>
            <div className="flex justify-between gap-4 py-2.5"><dt>2nd kindle</dt><dd className="font-bold"><KindleCostNow j={1} /></dd></div>
            <div className="flex justify-between gap-4 py-2.5"><dt>3rd kindle</dt><dd className="font-bold"><KindleCostNow j={2} /></dd></div>
          </dl>
          <p className="mt-3 text-xs text-ink/60">Computed live from the Hearth; it changes as the floor rises. This week a fire can be rescued if it is at most <KindleReach /> short.</p>
        </Box>}>
        <p>Holders have one more move. When a fire is close in its final stretch, a GOOD holder can <b>kindle</b> it: burn GOOD to lower this week&apos;s goal by one giver.</p>
        <Steps items={[
          <>Only in the <b>rescue window</b>: the last 10% of the week.</>,
          <>Only when the fire is a few givers short: at most a quarter of the goal (and always at least one).</>,
          <>The first kindle costs <b>one gift&apos;s Hearth share</b> (10% of a minimum gift) worth of GOOD at the floor. Each further kindle in the same fire costs twice the one before.</>,
          <>Burned GOOD is gone, and its share of the Hearth stays with everyone else, so the floor rises. Kindles are never refunded.</>,
          <>A rescued fire keeps the streak and lets its real gifts reach the cause, but it <b>never raises next week&apos;s goal</b>.</>,
        ]} />
        <p className="text-base text-ink/70">The cause still receives only real gifts. Kindling is how holders help a fire over the line, paid for in GOOD that goes to every other holder.</p>
        <Curious>
          <p>The j-th kindle (counting from 0) burns ⌈2<sup>j</sup> · 10% · min_gift · B ÷ H⌉ GOOD. At most 16 kindles follow the first, and the goal never drops below one.</p>
        </Curious>
        <div className="pt-2"><Button href="/app#kindle" tone="dark">See this week&apos;s fire</Button></div>
      </Chapter>

      <Chapter id="referrals" no="10" kicker="Good spreads person to person" title="Bring a friend" tone="parchment"
        aside={<div className="frame bg-paper p-6"><HandsEmber className="h-48 w-full" /><p className="mt-4 text-center font-sans text-sm">The most a real friend can pass you: <b><SparkCap /></b> of weight.</p></div>}>
        <p>When someone gives for the <b>first time ever</b>, they can name the person who brought them: their <b>spark</b>.</p>
        <Steps items={[
          <>It only counts on the newcomer&apos;s first-ever gift. Later top-ups don&apos;t count.</>,
          <>The spark must already have given <b>earlier in the same fire</b>.</>,
          <>A quarter of the newcomer&apos;s first-gift weight (counted up to 1.5 minimum gifts) <b>moves</b> from the newcomer to the spark. The newcomer keeps the rest.</>,
          <>Newcomer status is used up even if that fire is later smothered.</>,
        ]} />
        <p><b>Fake friends earn nothing.</b> The bounty comes out of the newcomer&apos;s own share, never anyone else&apos;s, so splitting yourself into accounts that spark each other gains nothing. Other givers are never diluted.</p>
        <div className="pt-2"><Button href="/app/referrals" tone="dark">Your spark link</Button></div>
      </Chapter>

      <EndBand title="The fire needs you." body={<>Read the live fire, check the record, then decide. <Link className="underline underline-offset-4" href="/faq">Questions? Read the FAQ.</Link></>}>
        <Button href="/app" size="lg">Join this week&apos;s fire</Button>
        <Button href="/good-wall" size="lg" tone="outline">Open the Good Wall</Button>
      </EndBand>
    </>
  );
}
