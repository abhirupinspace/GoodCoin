import Image from "next/image";
import Link from "next/link";
import { Embers, HearthArt, MonumentalFlame } from "@/components/art";
import { ArtPanel, ComicPanel, EmberTrail, HandDrawnDivider, MaskReveal, NarrationBox, Reveal, SectionCaption, Spark } from "@/components/comic";
import { HomeGoodWall } from "@/components/home/HomeGoodWall";
import { LiveFire } from "@/components/fire/LiveFire";
import { HearthNumbers } from "@/components/hearth/HearthNumbers";
import { Button, Stamp } from "@/components/ui";

/** Scene 2: one person, then two, then the collective. Same artwork, the camera pulls back. */
const SPREAD = [
  { shot: "oneSpark", line: "One spark becomes many." },
  { shot: "twoJoin", line: "Many become a movement." },
  { shot: "collective", line: "Together, we make good contagious." },
] as const;

/** Scene 4: the three rules, as three panels. */
const RULES = [
  { no: "01", title: "Give together", body: "Throw NEAR into this week's fire. Enough givers and it catches. Too few and you get it back.", shot: "neighbours" },
  { no: "02", title: "Get GOOD", body: "90% to the cause, 10% to the Hearth. Givers get new GOOD, and the floor rises.", shot: "flame" },
  { no: "03", title: "Bring a friend", body: "Bring someone new. A quarter of their first share passes to you.", shot: "faces" },
] as const;

export default function Home() {
  return (
    <div className="relative">
      <EmberTrail />

      {/* SCENE 1 · THE BEGINNING (cover) ---------------------------------- */}
      <section className="relative overflow-hidden border-b-[3px] border-ink">
        <div className="halftone absolute inset-0 opacity-25" aria-hidden />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 pt-12 text-center sm:px-6 lg:pt-16">
          <SectionCaption>Chapter one · The beginning</SectionCaption>
          <h1 className="display misprint mt-4 text-[clamp(4.25rem,11vw,9rem)] text-ink">
            Make good <span className="text-red">contagious.</span>
          </h1>
          <p className="mt-5 max-w-md font-serif text-xl leading-snug text-ink/80">
            A single contribution may seem small. Together, we can create something bigger.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button href="/app" size="lg">Join this week&apos;s fire</Button>
            <Button href="#story" size="lg" tone="paper" className="border-2 border-ink">Discover the story</Button>
          </div>
        </div>
        <MaskReveal className="relative mx-auto mt-6 aspect-[16/9] w-full max-w-5xl lg:mt-2">
          <Embers />
          <Image src="/art1hero.png" alt="" aria-hidden fill priority sizes="(min-width: 1024px) 1024px, 100vw" className="object-contain object-bottom" />
        </MaskReveal>
      </section>

      {/* SCENE 2 · THE SPARK SPREADS -------------------------------------- */}
      <section id="story" className="scroll-mt-16 mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <SectionCaption>Scene two · The spark spreads</SectionCaption>
        <div className="gutter mt-8 grid md:grid-cols-3">
          {SPREAD.map((p, i) => (
            <Reveal key={p.shot} delay={i * 0.15}>
              <ArtPanel shot={p.shot} aspect="3/4">
                <NarrationBox>{p.line}</NarrationBox>
              </ArtPanel>
            </Reveal>
          ))}
        </div>
      </section>

      {/* SCENE 3 · THE WEEKLY FIRE (live) --------------------------------- */}
      <section className="paper-dark relative overflow-hidden">
        <div className="halftone-ember absolute inset-y-0 right-0 w-1/3 opacity-20" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 md:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <SectionCaption light>Scene three · This week</SectionCaption>
            <h2 className="display misprint-paper mt-3 text-6xl sm:text-7xl">The fire is <span className="text-ember">burning.</span></h2>
            <p className="mt-5 max-w-sm font-serif text-lg text-paper/80">Read live from the contract.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/app" size="lg">Join the fire</Button>
              <Button href="/good-wall" size="lg" tone="outline" className="text-paper">Past fires</Button>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <ComicPanel tone="dark" className="ink-panel-paper p-6 sm:p-8"><LiveFire light /></ComicPanel>
          </Reveal>
        </div>
      </section>

      {/* SCENE 4 · HOW IT WORKS ------------------------------------------- */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <SectionCaption>Scene four · How it works</SectionCaption>
        <h2 className="display misprint mt-3 text-6xl sm:text-7xl">Three rules.</h2>
        <div className="gutter mt-10 grid md:grid-cols-3">
          {RULES.map((r, i) => (
            <Reveal key={r.no} delay={i * 0.12}>
              <ComicPanel className="flex h-full flex-col overflow-hidden">
                <ArtPanel shot={r.shot} aspect="4/3" frame={false} />
                <div className="border-t-[3px] border-ink p-5">
                  <p className="display text-5xl text-ember">{r.no}</p>
                  <h3 className="display mt-1 text-4xl">{r.title}</h3>
                  <p className="mt-3 font-serif text-base leading-relaxed text-ink/80">{r.body}</p>
                </div>
              </ComicPanel>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-10 flex flex-wrap items-center justify-center gap-4 text-center">
          <NarrationBox tone="paper">A fire one giver short? Holders can kindle it.</NarrationBox>
          <Link href="/how-it-works#kindle" className="ink-link font-semibold">How kindling works</Link>
        </Reveal>
      </section>

      {/* SCENE 5 · THE HEARTH --------------------------------------------- */}
      <section className="parchment relative overflow-hidden border-y-[3px] border-ink">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 md:grid-cols-[0.9fr_1.1fr]">
          <MaskReveal><HearthArt className="mx-auto w-full max-w-md" /></MaskReveal>
          <Reveal>
            <SectionCaption>Scene five · The Hearth</SectionCaption>
            <h2 className="display misprint mt-3 text-6xl sm:text-7xl">Every successful fire leaves something behind.</h2>
            <p className="mt-5 max-w-lg font-serif text-lg text-ink/80">A tenth of every catch goes to the Hearth. It backs GOOD, and the floor never goes down.</p>
            <div className="mt-8"><HearthNumbers /></div>
            <p className="mt-5 text-sm font-semibold text-ink/70">The floor is in NEAR. It is not a market price.</p>
            <div className="mt-6"><Button href="/tokenomics" tone="dark">Explore tokenomics</Button></div>
          </Reveal>
        </div>
      </section>

      {/* SCENE 6 · THE GOOD WALL ------------------------------------------ */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <SectionCaption>Scene six · The Good Wall</SectionCaption>
            <h2 className="display misprint mt-3 text-6xl sm:text-7xl">The archive.</h2>
            <p className="mt-3 font-serif text-lg text-ink/80">Every fire stays on the record.</p>
          </div>
          <Button href="/good-wall" tone="outline">Open the Good Wall</Button>
        </div>
        <div className="mt-10"><HomeGoodWall /></div>
      </section>

      {/* SCENE 7 · FINALE ------------------------------------------------- */}
      <section className="paper-dark relative overflow-hidden">
        <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 py-24 text-center sm:px-6">
          <HandDrawnDivider className="max-w-sm" color="#d66a32" />
          <Reveal className="mt-10 flex flex-col items-center">
            <MonumentalFlame className="h-48" />
            <h2 className="display misprint-paper mt-6 text-7xl sm:text-9xl">The fire needs you.</h2>
            <div className="mt-6 flex items-center gap-2" aria-hidden><Spark /><Spark size={14} /><Spark size={22} /></div>
            <div className="mt-8"><Button href="/app" size="lg">Join this week&apos;s fire</Button></div>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Stamp tone="ember">No premine</Stamp><Stamp tone="ember">No team allocation</Stamp><Stamp tone="ember">No admin key</Stamp>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
