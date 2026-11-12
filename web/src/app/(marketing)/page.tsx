import Image from "next/image";
import Link from "next/link";
import { Crowd, Embers, FieldLines, HandsEmber, HearthArt, KindleArt, MonumentalFlame, Ornament, Sunburst } from "@/components/art";
import { HomeGoodWall } from "@/components/home/HomeGoodWall";
import { LiveFire } from "@/components/fire/LiveFire";
import { HearthNumbers } from "@/components/hearth/HearthNumbers";
import { Button, SectionHead, Stamp } from "@/components/ui";


const PRINCIPLES = [
  {
    no: "01",
    title: "Give together",
    body: "One fire a week for one public good. Throw NEAR in. If enough people join, it catches. If not, everyone gets their gift back.",
    art: <Crowd count={7} className="h-40 w-full" />,
  },
  {
    no: "02",
    title: "Get GOOD",
    body: "When a fire catches, 90% goes to the cause and 10% to the Hearth. Givers receive new GOOD, and every catch raises the floor for everyone holding it.",
    art: <MonumentalFlame className="mx-auto h-48" />,
  },
  {
    no: "03",
    title: "Bring a friend",
    body: "Bring someone new into a fire you joined. A quarter of their first share passes to you.",
    art: <HandsEmber className="h-44 w-full" />,
  },
];

export default function Home() {
  return (
    <>
      {/* HERO ------------------------------------------------------------ */}
      <section className="relative overflow-hidden border-b-[3px] border-ink">
        <div className="halftone absolute inset-0 opacity-25" aria-hidden />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 pt-14 text-center sm:px-6 lg:pt-20">
          <p className="eyebrow text-burnt">A movement on NEAR</p>
          <h1 className="display misprint mt-4 text-[clamp(4.25rem,11vw,9rem)] text-ink">
            Make good <span className="text-red">contagious.</span>
          </h1>
          <p className="display mt-6 text-3xl leading-tight text-burnt sm:text-4xl">One cause. One community. One fire every week.</p>
          <p className="mt-4 max-w-md font-serif text-xl leading-snug text-ink/80">Memecoins get people to buy. GOODCOIN gets them to give together.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button href="/app" size="lg">Join this week&apos;s fire</Button>
            <Button href="/how-it-works" size="lg" tone="paper" className="border-2 border-ink">How it works</Button>
          </div>
        </div>
        {/* Hero artwork: a torch-bearing crowd, centred beneath the copy. Decorative. */}
        <div className="relative mx-auto mt-6 aspect-[16/9] w-full max-w-5xl lg:mt-2">
          <Embers />
          <Image
            src="/art1hero.png"
            alt=""
            aria-hidden
            fill
            priority
            sizes="(min-width: 1024px) 1024px, 100vw"
            className="object-contain object-bottom"
          />
        </div>
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
              <p>A tenth of every fire that catches goes into the Hearth. The Hearth backs GOOD, and the floor never goes down.</p>
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
