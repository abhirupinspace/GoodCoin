import { EmberField, FinalCall, Hero, ImageReveal, Label, Lines, Reveal, Section, TextLink } from "@/components/brand";
import { HomeGoodWall } from "@/components/home/HomeGoodWall";
import { LiveFire } from "@/components/fire/LiveFire";
import { HearthNumbers } from "@/components/hearth/HearthNumbers";
import { Button } from "@/components/ui";

const CATCH = [
  { n: "90%", k: "To the cause", v: "Paid to the cause's DAO treasury, on chain." },
  { n: "10%", k: "To the Hearth", v: "The shared reserve that backs GOOD." },
  { n: "GOOD", k: "To every giver", v: "Newly minted, at no less than 1.25× the floor." },
];

const TRUST = [
  ["No admin", "No owner, no setters, no upgrade method."],
  ["No keys", "Every access key on the contract was deleted."],
  ["No premine", "Every GOOD was made by people giving together."],
  ["Checked on chain", "The floor invariant is asserted after every state change."],
];

export default function Home() {
  return (
    <>
      {/* 00 HERO --------------------------------------------------------- */}
      <Hero
        variant="cinematic"
        shot="gathering"
        marker={<>GOODCOIN <span className="text-red">/</span> A movement on NEAR</>}
        lines={["Make", "good", <span key="c" className="text-red">contagious.</span>]}
        lede={<><span className="text-ink">One cause. One community. One fire every week.</span> If enough distinct people give, the fire catches.</>}
        actions={<>
          <Button href="/app" size="lg">Join this week&apos;s fire <span className="arrow">→</span></Button>
          <Button href="/how-it-works" size="lg" tone="paper">Discover how it works</Button>
        </>}
      />

      {/* 01 THE SPARK ---------------------------------------------------- */}
      <Section>
        <div className="grid items-end gap-16 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <Label no="01">The spark</Label>
            <Lines inView lines={["One gift is small.", "Alone, it goes out.", <span key="c" className="text-red">Together, it catches.</span>]} className="display mt-10 text-[clamp(3rem,7.5vw,7.5rem)] text-ink" />
            <Reveal delay={0.2}><p className="mt-10 max-w-md text-lg leading-relaxed text-mute">Memecoins get millions of people to buy. GOODCOIN gets them to give together.</p></Reveal>
          </div>
          <ImageReveal shot="spark" className="aspect-[3/4] w-full border border-line" />
        </div>
      </Section>

      {/* 02 THE WEEKLY FIRE (live) ---------------------------------------- */}
      <Section tone="dark">
        <div className="grid gap-16 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <Label no="02">The weekly fire</Label>
            <Lines inView lines={["One fire.", "One week.", <span key="c" className="text-red">One collective.</span>]} className="display mt-10 text-6xl text-ink sm:text-7xl" />
            <Reveal delay={0.2}>
              <p className="mt-8 max-w-sm text-lg text-mute">One curated cause each week. Read live from the contract.</p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Button href="/app" size="lg">Join the fire <span className="arrow">→</span></Button>
                <Button href="/good-wall" size="lg" tone="outline">Past fires</Button>
              </div>
            </Reveal>
          </div>
          <Reveal delay={0.1} className="relative self-start overflow-hidden border border-line border-t-2 border-t-red bg-paper p-6 sm:p-10">
            <EmberField count={8} />
            <div className="relative"><LiveFire light /></div>
          </Reveal>
        </div>
      </Section>

      {/* 03 GIVE TOGETHER ------------------------------------------------ */}
      <Section>
        <Label no="03">Give together</Label>
        <Lines inView lines={["Give together.", <span key="b" className="text-red">Or give it back.</span>]} className="display mt-10 text-[clamp(3rem,8vw,8rem)] text-ink" />
        <div className="mt-20 grid border-t border-line md:grid-cols-2">
          <Reveal className="border-b border-line py-10 md:border-r md:pr-10">
            <p className="meta text-ember">Enough givers</p>
            <p className="display mt-4 text-5xl text-ink">It catches.</p>
            <p className="mt-4 max-w-sm text-mute">The NEAR goes to the cause. Givers get GOOD.</p>
          </Reveal>
          <Reveal delay={0.1} className="border-b border-line py-10 md:pl-10">
            <p className="meta text-mute">Too few</p>
            <p className="display mt-4 text-5xl text-ink/60">It is smothered.</p>
            <p className="mt-4 max-w-sm text-mute">Every gift is refunded, minus a 0.005 NEAR record fee. That week&apos;s GOOD can never exist.</p>
          </Reveal>
        </div>
        <Reveal className="mt-10 grid gap-8 text-mute md:grid-cols-2">
          <p><span className="meta mr-3 text-red">Bring a friend</span>A newcomer who names you passes a quarter of their first share to you.</p>
          <p><span className="meta mr-3 text-red">Kindle</span>A fire one giver short? Holders can burn GOOD to rescue it.</p>
        </Reveal>
      </Section>

      {/* 04 WHEN THE FIRE CATCHES ---------------------------------------- */}
      <section className="relative overflow-hidden border-t border-line bg-paper">
        <ImageReveal shot="fire" className="absolute inset-0 opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-b from-paper via-paper/70 to-paper" aria-hidden />
        <div className="shell relative py-24 md:py-36">
          <Label no="04">When the fire catches</Label>
          <Lines inView lines={["The fire", <span key="b" className="text-red">must catch.</span>]} className="display mt-10 text-[clamp(3rem,8vw,8rem)] text-ink" />
          <div className="mt-20 grid border-t border-line md:grid-cols-3">
            {CATCH.map((c, i) => (
              <Reveal key={c.k} delay={i * 0.1} className={`border-b border-line py-10 ${i ? "md:border-l md:pl-10" : ""} md:pr-10`}>
                <p className="display num text-7xl text-ink md:text-8xl">{c.n}</p>
                <p className="meta mt-4 text-red">{c.k}</p>
                <p className="mt-3 max-w-xs text-mute">{c.v}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 05 THE HEARTH --------------------------------------------------- */}
      <Section tone="dark">
        <div className="grid gap-16 lg:grid-cols-[1fr_1fr]">
          <div>
            <Label no="05">The Hearth</Label>
            <Lines inView lines={["Every fire", "leaves something", <span key="c" className="text-red">behind.</span>]} className="display mt-10 text-6xl text-ink sm:text-7xl" />
            <Reveal delay={0.2}>
              <p className="mt-8 max-w-md text-lg text-mute">A tenth of every catch feeds the Hearth. It backs GOOD, and the floor never goes down.</p>
              <div className="mt-10"><TextLink href="/tokenomics">Explore tokenomics</TextLink></div>
            </Reveal>
          </div>
          <Reveal delay={0.1} className="self-end">
            <HearthNumbers light />
            <p className="meta mt-8 border-l-2 border-red pl-4 text-mute">The floor is in NEAR. It is not a market price.</p>
          </Reveal>
        </div>
      </Section>

      {/* 06 THE GOOD WALL ------------------------------------------------ */}
      <Section>
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div>
            <Label no="06">The Good Wall</Label>
            <Lines inView lines={["Every fire", <span key="b" className="text-red">leaves a mark.</span>]} className="display mt-10 text-6xl text-ink sm:text-7xl" />
          </div>
          <TextLink href="/good-wall">Open the archive</TextLink>
        </div>
        <div className="mt-16"><HomeGoodWall /></div>
      </Section>

      {/* 07 TRUST -------------------------------------------------------- */}
      <Section tone="dark">
        <div className="grid gap-16 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <Label no="07">Trust and transparency</Label>
            <Lines inView lines={["Don’t trust us.", <span key="b" className="text-red">Verify the rules.</span>]} className="display mt-10 text-6xl text-ink sm:text-7xl" />
            <Reveal delay={0.2}><div className="mt-10 flex flex-wrap gap-8"><TextLink href="/security">Live invariants</TextLink><TextLink href="/docs">Read the contract</TextLink></div></Reveal>
          </div>
          <dl className="border-t border-line">
            {TRUST.map(([k, v], i) => (
              <Reveal key={k} delay={i * 0.06} className="grid gap-2 border-b border-line py-7 sm:grid-cols-[12rem_1fr]">
                <dt className="display text-3xl text-ink">{k}</dt>
                <dd className="text-mute sm:pt-1">{v}</dd>
              </Reveal>
            ))}
          </dl>
        </div>
      </Section>

      {/* 08 FINAL CALL --------------------------------------------------- */}
      <FinalCall
        lines={["The fire", "needs you."]}
        lede="One spark is small. Together, we keep the fire alive."
        actions={<Button href="/app" size="lg">Join this week&apos;s fire <span className="arrow">→</span></Button>}
      />
    </>
  );
}
