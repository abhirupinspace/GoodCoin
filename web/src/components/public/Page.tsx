// Page scaffolding for the public chapters: numbered editorial sections, asides, callouts and the closing band.
import type { ReactNode } from "react";
import { FinalCall, Hero, Reveal, type HeroVariant } from "@/components/brand";
import type { ShotName } from "@/components/brand/assets";

/** Compatibility wrapper: a route hero. Prefer <Hero> directly. */
export function PageHero({ kicker, title, intro, children, variant = "editorial", shot }: {
  kicker: ReactNode; title: ReactNode; intro?: ReactNode; art?: ReactNode; children?: ReactNode; tone?: "paper" | "dark"; variant?: HeroVariant; shot?: ShotName;
}) {
  return <Hero variant={variant} marker={kicker} lines={[title]} lede={intro} shot={shot} h1Class="display text-[clamp(3.5rem,9vw,8.5rem)]">{children}</Hero>;
}

/** A numbered editorial chapter: number and label in the left rail, content and aside on the right. */
export function Chapter({ id, no, title, kicker, children, tone = "paper", aside, className = "" }: {
  id?: string; no: string; title: ReactNode; kicker?: string; children: ReactNode; tone?: "paper" | "parchment" | "dark"; aside?: ReactNode; className?: string;
}) {
  const bg = tone === "paper" ? "bg-paper" : "bg-parchment";
  return (
    <section id={id} className={`relative scroll-mt-20 border-t border-line ${bg} ${className}`} aria-labelledby={id ? `${id}-title` : undefined}>
      <div className="shell grid gap-10 py-20 md:grid-cols-[10rem_1fr] md:py-28">
        <Reveal className="md:sticky md:top-24 md:self-start">
          <p className="display text-6xl text-red md:text-7xl">{no}</p>
          {kicker && <p className="meta mt-3 text-mute">{kicker}</p>}
        </Reveal>
        <div className={`grid min-w-0 gap-12 ${aside ? "xl:grid-cols-[1.1fr_0.9fr]" : ""}`}>
          <Reveal>
            <h2 id={id ? `${id}-title` : undefined} className="display text-5xl text-ink sm:text-6xl md:text-7xl">{title}</h2>
            <div className="mt-8 max-w-2xl space-y-5 text-lg leading-relaxed text-ink/80">{children}</div>
          </Reveal>
          {aside && <Reveal delay={0.1} className="min-w-0 self-start">{aside}</Reveal>}
        </div>
      </div>
    </section>
  );
}

/** "For the curious": an optional formula box, closed by default (native details/summary, keyboard accessible). */
export function Curious({ children, title = "For the curious" }: { children: ReactNode; title?: string; light?: boolean }) {
  return (
    <details className="group mt-8 border-t border-line pt-4 font-sans text-base">
      <summary className="meta flex cursor-pointer list-none items-center gap-3 select-none text-mute hover:text-ink">
        <span className="inline-block text-red transition-transform group-open:rotate-45" aria-hidden>+</span>{title}
      </summary>
      <div className="mt-4 space-y-2 text-sm leading-relaxed text-mute">{children}</div>
    </details>
  );
}

/** Red-ruled statement that must not be missed. */
export function Callout({ children, tone = "red" }: { children: ReactNode; tone?: "red" | "ink" }) {
  return (
    <p className={`border-l-2 ${tone === "red" ? "border-red" : "border-ink"} py-1 pl-4 font-mono text-xs uppercase leading-relaxed tracking-[0.12em] text-ink`}>
      {children}
    </p>
  );
}

/** Inline monospace code. */
export function Code({ children }: { children: ReactNode }) {
  return <code className="bg-raised px-1.5 py-0.5 font-mono text-[0.85em] text-ink">{children}</code>;
}

/** A ruled key–value list. */
export function Ledger({ rows }: { rows: [ReactNode, ReactNode][]; light?: boolean }) {
  return (
    <dl className="divide-y divide-line border-y border-line font-sans text-sm">
      {rows.map(([k, v], i) => (
        <div key={i} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3">
          <dt className="meta text-mute">{k}</dt>
          <dd className="num min-w-0 break-words text-right font-medium text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Closing call-to-action band. Every button must link somewhere real. */
export function EndBand({ title, body, children }: { title: ReactNode; body?: ReactNode; children: ReactNode }) {
  return <FinalCall lines={[title]} lede={body} actions={children} />;
}
