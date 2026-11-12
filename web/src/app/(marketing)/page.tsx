import Link from "next/link";
import { Crowd, Embers, FieldLines, HandsEmber, HearthArt, KindleArt, MonumentalFlame, Ornament, Seal, Sunburst } from "@/components/art";
import { HomeGoodWall } from "@/components/home/HomeGoodWall";
import { LiveFire } from "@/components/fire/LiveFire";
import { HearthNumbers } from "@/components/hearth/HearthNumbers";
import { Button, SectionHead, Stamp } from "@/components/ui";


const PRINCIPLES = [
  {
    no: "01",
    title: "Give together",
    body: "Every week there is one fire for one public good. Throw NEAR in. It waits in escrow. If enough distinct givers join before the week ends, the fire catches. If not, every gift comes back — and that week's GOOD can never exist.",
    art: <Crowd count={7} className="h-40 w-full" />,
  },
  {
    no: "02",
    title: "Get GOOD",
    body: "When a fire catches, 90% goes to the cause's DAO and 10% to the Hearth. The givers receive new GOOD — paid for at more than the backing floor, so every catch raises the floor for everyone already holding.",
    art: <MonumentalFlame className="mx-auto h-48" />,
  },
  {
    no: "03",
    title: "Bring a friend",
    body: "Good spreads person to person. When someone gives for the first time in a fire you already gave to, and names you, a quarter of their first share passes to you. Fake friends earn nothing — the bounty comes out of the newcomer's own share.",
    art: <HandsEmber className="h-44 w-full" />,
  },
];

export default function Home() {
  return (
    <>
      {/* HERO ------------------------------------------------------------ */}
      <section className="relative overflow-hidden border-b-[3px] border-ink">
        <Sunburst className="absolute inset-0 h-full w-full" opacity={0.55} />
        <div className="halftone absolute inset-0 opacity-40" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 pb-0 pt-12 sm:px-6 md:grid-cols-[1.15fr_0.85fr] md:pt-20">
          <div className="relative z-10 pb-10 md:pb-24">
            <p className="eyebrow text-burnt">A movement on NEAR · since fire №0</p>
            <h1 className="display misprint mt-4 text-[clamp(4.5rem,13vw,11rem)] text-ink">
              Make good <span className="text-red">contagious.</span>
            </h1>
            <p className="display mt-6 text-3xl text-burnt sm:text-4xl">One cause. One community. One fire every week.</p>
            <p className="mt-5 max-w-xl font-serif text-lg leading-relaxed text-ink/80">
              Memecoins coordinate millions of people to buy. GOODCOIN coordinates them to give together — a community-powered experiment that turns individual contributions into collective public-good funding.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/app" size="lg">Join this week&apos;s fire</Button>
              <Button href="/how-it-works" size="lg" tone="outline">How it works</Button>
            </div>
          </div>
          <div className="relative flex items-end justify-center">
            <Embers />
            <MonumentalFlame className="relative z-10 h-[420px] w-auto drop-shadow-[8px_8px_0_rgba(36,34,30,0.9)] md:h-[560px]" />
            <Seal className="absolute right-0 top-4 hidden w-36 rotate-12 md:block" />
          </div>
        </div>
        <Crowd className="relative -mt-2 h-28 w-full sm:h-40" />
      </section>

      {/* THE WEEKLY FIRE ---------------------------------------------------- */}
      <section className="paper-dark relative overflow-hidden">
        <div className="halftone-ember absolute inset-y-0 right-0 w-1/3 opacity-20" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <SectionHead light no="This week" title={<>The fire is <span className="text-ember">burning.</span></>} intro={<p>Read live from the contract. No numbers on this page are typed in by hand.</p>} />
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/app" size="lg">Join the fire</Button>
              <Button href="/good-wall" size="lg" tone="outline" className="text-paper">Past fires</Button>
            </div>
          </div>
          <div className="frame-ember border-paper bg-charcoal p-6 sm:p-8">
            <LiveFire light />
          </div>
        </div>
      </section>

      {/* THREE PRINCIPLES --------------------------------------------------- */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <SectionHead eyebrow="Three rules" title="The whole movement fits on a poster." />
        <div className="mt-16 space-y-20">
          {PRINCIPLES.map((p, i) => (
            <article key={p.no} className={`grid items-center gap-10 md:grid-cols-2 ${i % 2 ? "md:[&>*:first-child]:order-2" : ""}`}>
              <div className="frame parchment relative overflow-hidden p-8">
                <div className="rays absolute inset-0 opacity-60" aria-hidden />
                <div className="relative">{p.art}</div>
              </div>
              <div>
                <p className="display text-8xl text-ember">{p.no}</p>
                <h3 className="display misprint mt-2 text-6xl">{p.title}</h3>
                <p className="mt-5 max-w-lg font-serif text-lg leading-relaxed text-ink/80">{p.body}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-20 grid items-center gap-8 border-y-[3px] border-double border-ink py-10 md:grid-cols-[auto_1fr_auto]">
          <KindleArt className="h-32 w-auto" />
          <div>
            <p className="eyebrow text-burnt">And when a fire is close</p>
            <p className="display mt-2 text-4xl">Holders can kindle it.</p>
            <p className="mt-2 max-w-2xl text-ink/80">In a fire&apos;s final moments, a GOOD holder can burn GOOD to lower the goal by one giver and rescue it. Burned GOOD is gone; its share of the Hearth stays with everyone else.</p>
          </div>
          <Button href="/how-it-works#kindle" tone="dark">How kindling works</Button>
        </div>
      </section>

      {/* THE HEARTH ------------------------------------------------------- */}
      <section className="parchment relative overflow-hidden border-y-[3px] border-ink">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-24 sm:px-6 md:grid-cols-[0.9fr_1.1fr]">
          <HearthArt className="mx-auto w-full max-w-md" />
          <div>
            <SectionHead no="The Hearth" title="Every fire leaves something behind." intro={
              <p>A tenth of every fire that catches goes into the Hearth, and the Hearth backs GOOD. Anyone can swap GOOD back for its share of the Hearth at any time — the backing floor. New GOOD is always paid for above that floor, so the floor never goes down.</p>
            } />
            <div className="mt-10"><HearthNumbers /></div>
            <p className="mt-6 border-l-4 border-red pl-4 text-sm font-semibold text-ink/80">
              The backing floor is denominated in NEAR. It is not a guaranteed market price or USD value.
            </p>
            <div className="mt-8"><Button href="/tokenomics" tone="dark">Explore tokenomics</Button></div>
          </div>
        </div>
      </section>

      {/* GOOD WALL -------------------------------------------------------- */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHead no="Good Wall" title="An archive of collective action." intro={<p>Every fire, caught or smothered, stays on the record.</p>} />
          <Button href="/good-wall" tone="outline">Open the Good Wall</Button>
        </div>
        <div className="mt-12"><HomeGoodWall /></div>
      </section>

      {/* PHILOSOPHY ------------------------------------------------------- */}
      <section className="paper-dark relative overflow-hidden">
        <FieldLines className="absolute bottom-0 h-24 w-full" color="#46543d" />
        <div className="relative mx-auto max-w-5xl px-4 py-28 text-center sm:px-6">
          <Ornament className="mx-auto w-72" color="#e8d9b9" />
          <h2 className="display misprint-paper mt-8 text-6xl sm:text-8xl">A better internet is built together.</h2>
          <p className="mx-auto mt-8 max-w-2xl font-serif text-xl leading-relaxed text-paper/85">
            The internet has mastered attention. GOODCOIN is an experiment in coordinating action instead: a joke-sized ritual, once a week, that only works if enough of us show up. No premine. No team allocation. No admin key. Just a fire, and the people around it.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Stamp tone="ember">No premine</Stamp><Stamp tone="ember">No team allocation</Stamp><Stamp tone="ember">No admin key</Stamp>
          </div>
          <p className="mt-8"><Link href="/about" className="underline underline-offset-4 hover:text-ember">Read the philosophy →</Link></p>
        </div>
      </section>

      {/* FINAL CTA -------------------------------------------------------- */}
      <section className="relative overflow-hidden border-b-[3px] border-ink">
        <Sunburst className="absolute inset-0 h-full w-full" color="#d66a32" opacity={0.35} />
        <div className="relative mx-auto flex max-w-7xl flex-col items-center px-4 py-24 text-center sm:px-6">
          <MonumentalFlame className="h-56" />
          <h2 className="display misprint mt-6 text-7xl sm:text-9xl">The fire needs you.</h2>
          <p className="mt-4 font-serif text-xl text-ink/80">One spark is small. Together, we keep the fire alive.</p>
          <div className="mt-8"><Button href="/app" size="lg">Join this week&apos;s fire</Button></div>
        </div>
      </section>
    </>
  );
}
