import type { Metadata } from "next";
import { Hero, ImageReveal, Label, Lines, Reveal, Section } from "@/components/brand";
import { EndBand } from "@/components/public/Page";
import { Button } from "@/components/ui";

export const metadata: Metadata = {
  title: "About",
  description: "The internet has mastered attention. We want to coordinate action. Why GOODCOIN exists, and the principles it is built on.",
};

const PRINCIPLES = [
  { no: "I", title: "Fair launch", body: "No premine, no team allocation, no vesting. Every GOOD in existence was made by people giving together. The only thing present at launch is a locked seed that nobody owns and nobody can move." },
  { no: "II", title: "No admin", body: "No owner, no setters, no pause, no upgrade method. Every key on the contract account was deleted after launch. The rules you read today are the rules for as long as the contract exists." },
  { no: "III", title: "The chain checks the money", body: "No judges, no oracles, no committee deciding what counts. The contract holds the gifts, counts the givers, pays the cause and backs the token. This website only reads what the contract reports." },
  { no: "IV", title: "Honest limits", body: "Accounts are not people. A colluding cause can fake a catch. The chain proves NEAR reached a curated account, not the good that was done. Your GOOD is worth a small fraction of your gift. We say so, everywhere." },
  { no: "V", title: "Contagion over hype", body: "The only way the movement grows is if each week a few more people show up than last time. The goal ratchets up after every catch. Bringing a friend is the one reward we built in, and fake friends earn nothing." },
];

export default function About() {
  return (
    <>
      <Hero
        variant="cinematic"
        shot="bearer"
        marker={<>Prologue <span className="text-red">/</span> A statement of intent</>}
        lines={["Good is", <span key="b" className="text-red">a collective act.</span>]}
        h1Class="display text-[clamp(3.8rem,10vw,10rem)]"
        lede="The internet has mastered attention. We want to coordinate action."
      />

      {/* 01 WHY */}
      <Section>
        <div className="grid gap-16 lg:grid-cols-[1fr_0.8fr]">
          <Reveal>
            <Label no="01">Why GOODCOIN exists</Label>
            <p className="display mt-8 text-5xl text-ink sm:text-6xl">A joke can move a million people in a week.</p>
            <div className="mt-8 max-w-xl space-y-6 text-lg leading-relaxed text-ink/75">
              <p>What they move to do, almost always, is buy, hold and hope. Spectacular coordination, pointed at nothing.</p>
              <p>Giving is the opposite: useful, quiet, lonely. People hold back because they can&apos;t tell whether anyone else will show up.</p>
              <p>GOODCOIN turns giving into a weekly public ritual with one question: <b className="text-ink">will enough of us show up?</b></p>
            </div>
          </Reveal>
          <ImageReveal shot="faces" className="aspect-[4/5] w-full border border-line" />
        </div>
      </Section>

      {/* STATEMENT */}
      <section className="relative overflow-hidden border-t border-line bg-paper">
        <div className="shell py-28 md:py-40">
          <Lines inView lines={["One spark is small.", <span key="b" className="text-red">Together, we keep</span>, <span key="c" className="text-red">the fire alive.</span>]} className="display text-[clamp(3rem,8vw,8rem)] text-ink" />
        </div>
      </section>

      {/* 02 COLLECTIVE GIVING */}
      <Section tone="dark">
        <div className="grid gap-16 lg:grid-cols-[0.8fr_1fr]">
          <ImageReveal shot="spark" className="order-last aspect-[4/5] w-full border border-line lg:order-first" />
          <Reveal>
            <Label no="02">Collective giving</Label>
            <p className="display mt-8 text-5xl text-ink sm:text-6xl">I&apos;ll put in if enough of you do.</p>
            <div className="mt-8 max-w-xl space-y-6 text-lg leading-relaxed text-ink/75">
              <p>An assurance contract removes the fear of giving alone. GOODCOIN runs one every week, for one public good, with the money held by a contract nobody controls.</p>
              <p>When the fire catches, nine tenths goes to the cause&apos;s DAO treasury and one tenth to the Hearth, which backs the GOOD the givers receive. Early givers gain from the people who give next.</p>
              <p>When it doesn&apos;t, the gifts come home and that week&apos;s GOOD is struck from the record. A movement should feel the weeks it didn&apos;t show up.</p>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* 03 PRINCIPLES */}
      <Section>
        <Label no="03">Principles</Label>
        <Lines inView lines={["Five things", "we won\u2019t bend on."]} className="display mt-8 text-6xl text-ink sm:text-7xl md:text-8xl" />
        <ol className="mt-20 border-t border-line">
          {PRINCIPLES.map((p, i) => (
            <Reveal as="li" key={p.no} delay={i * 0.05} className="grid gap-4 border-b border-line py-10 md:grid-cols-[8rem_1fr_1.4fr] md:gap-10">
              <p className="display text-5xl text-red">{p.no}</p>
              <h3 className="display text-4xl text-ink">{p.title}</h3>
              <p className="max-w-xl text-base leading-relaxed text-mute">{p.body}</p>
            </Reveal>
          ))}
        </ol>
      </Section>

      {/* 04 WHAT IT IS NOT */}
      <Section tone="dark">
        <div className="grid gap-12 md:grid-cols-2">
          <Reveal>
            <Label no="04">What this is not</Label>
            <h2 className="display mt-8 text-5xl text-ink sm:text-6xl">Not an investment. Not a charity token. <span className="text-red">Not finished.</span></h2>
          </Reveal>
          <Reveal delay={0.1} className="space-y-6 text-lg leading-relaxed text-ink/75">
            <p>At the backing floor, your GOOD is worth about 8 to 9% of your gift on day one. It is measured in NEAR, and it is never a promise of a market price.</p>
            <p>GOODCOIN runs on NEAR testnet. It has a full test suite and adversarial design reviews, but no professional audit. Testnet causes are demo DAOs run by the team.</p>
            <p className="text-ink">We would rather you understood it than believed in it.</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button href="/how-it-works" tone="dark">Read the rules <span className="arrow">→</span></Button>
              <Button href="/security" tone="outline">Check the contract</Button>
            </div>
          </Reveal>
        </div>
      </Section>

      <EndBand title="Light one." body="No admin. No premine. Just a fire, and the people around it.">
        <Button href="/app" size="lg">Join this week&apos;s fire <span className="arrow">→</span></Button>
        <Button href="/good-wall" size="lg" tone="outline">See the record</Button>
      </EndBand>
    </>
  );
}
