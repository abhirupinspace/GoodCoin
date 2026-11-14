// Server-safe page scaffolding for the public pamphlets: hero, numbered chapters, asides and callouts.
import type { ReactNode } from "react";
import { Sunburst } from "@/components/art";
import { HandDrawnDivider, Reveal } from "@/components/comic";

/** Poster-style page hero. `art` sits on the right on desktop, below the text on mobile. */
export function PageHero({ kicker, title, intro, art, children, tone = "paper" }: {
  kicker: string; title: ReactNode; intro?: ReactNode; art?: ReactNode; children?: ReactNode; tone?: "paper" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <section className={`relative overflow-hidden border-b-[3px] border-ink ${dark ? "paper-dark" : ""}`}>
      <Sunburst className="absolute inset-0 h-full w-full" color={dark ? "#d66a32" : "#a93428"} opacity={dark ? 0.18 : 0.32} />
      <div className={`${dark ? "halftone-ember opacity-15" : "halftone opacity-30"} absolute inset-0`} aria-hidden />
      <div className={`relative mx-auto grid max-w-7xl items-end gap-10 px-4 py-14 sm:px-6 md:py-20 ${art ? "md:grid-cols-[1.35fr_0.65fr]" : ""}`}>
        <div className="relative z-10">
          <p className={`lettering text-lg ${dark ? "text-mustard" : "text-burnt"}`}>{kicker}</p>
          <h1 className={`display mt-4 text-[clamp(3.4rem,10vw,8.5rem)] ${dark ? "misprint-paper text-paper" : "misprint text-ink"}`}>{title}</h1>
          {intro && <div className={`mt-6 max-w-2xl font-serif text-lg leading-relaxed sm:text-xl ${dark ? "text-paper/85" : "text-ink/80"}`}>{intro}</div>}
          {children && <div className="mt-8">{children}</div>}
        </div>
        {art && <div className="relative flex justify-center md:justify-end"><div className={`ink-panel ink-panel-thin ${dark ? "ink-panel-paper" : ""} p-4`}>{art}</div></div>}
      </div>
      <HandDrawnDivider className="relative -mb-2 opacity-70" color={dark ? "#d66a32" : "#24221e"} />
    </section>
  );
}

/** A numbered chapter ("01 — Title"). Alternates paper / parchment / dark grounds for rhythm. */
export function Chapter({ id, no, title, kicker, children, tone = "paper", aside, className = "" }: {
  id?: string; no: string; title: ReactNode; kicker?: string; children: ReactNode; tone?: "paper" | "parchment" | "dark"; aside?: ReactNode; className?: string;
}) {
  const dark = tone === "dark";
  const bg = dark ? "paper-dark" : tone === "parchment" ? "parchment border-y-[3px] border-ink" : "";
  return (
    <section id={id} className={`relative scroll-mt-20 ${bg} ${className}`} aria-labelledby={id ? `${id}-title` : undefined}>
      <div className={`mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:py-24 ${aside ? "lg:grid-cols-[1.1fr_0.9fr]" : ""}`}>
        <div>
          <p className={`lettering text-lg ${dark ? "text-mustard" : "text-burnt"}`}><span className="display mr-3 text-2xl">{no}</span>{kicker}</p>
          <h2 id={id ? `${id}-title` : undefined} className={`display mt-3 text-5xl sm:text-6xl md:text-7xl ${dark ? "misprint-paper" : "misprint"}`}>{title}</h2>
          <div className={`mt-6 space-y-4 font-serif text-lg leading-relaxed ${dark ? "text-paper/85" : "text-ink/85"}`}>{children}</div>
        </div>
        {aside && <Reveal className="min-w-0 self-start">{aside}</Reveal>}
      </div>
    </section>
  );
}

/** "For the curious": an optional formula box, closed by default (native details/summary, keyboard accessible). */
export function Curious({ children, title = "For the curious", light = false }: { children: ReactNode; title?: string; light?: boolean }) {
  return (
    <details className={`group mt-6 border-2 border-dashed ${light ? "border-paper/40" : "border-ink/40"} p-4 font-sans text-base`}>
      <summary className="lettering cursor-pointer list-none select-none text-base">
        <span className="mr-2 inline-block transition-transform group-open:rotate-90" aria-hidden>▸</span>{title}
      </summary>
      <div className={`mt-3 space-y-2 text-sm leading-relaxed ${light ? "text-paper/80" : "text-ink/80"}`}>{children}</div>
    </details>
  );
}

/** Red-ruled callout for statements that must not be missed. */
export function Callout({ children, tone = "red" }: { children: ReactNode; tone?: "red" | "ink" }) {
  return (
    <p className={`border-l-4 ${tone === "red" ? "border-red" : "border-ink"} bg-paper/60 py-2 pl-4 font-sans text-sm font-bold uppercase tracking-wide text-ink`}>
      {children}
    </p>
  );
}

/** Inline monospace code. */
export function Code({ children }: { children: ReactNode }) {
  return <code className="bg-ink/10 px-1.5 py-0.5 font-mono text-[0.85em]">{children}</code>;
}

/** A printed key–value list. */
export function Ledger({ rows, light = false }: { rows: [ReactNode, ReactNode][]; light?: boolean }) {
  return (
    <dl className={`divide-y ${light ? "divide-paper/20 border-paper/40" : "divide-ink/20 border-ink"} border-y-2 font-sans text-sm`}>
      {rows.map(([k, v], i) => (
        <div key={i} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-2.5">
          <dt className={`eyebrow ${light ? "text-paper/70" : "text-ink/60"}`}>{k}</dt>
          <dd className="num min-w-0 break-words text-right font-semibold">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Closing call-to-action band. Every button must link somewhere real. */
export function EndBand({ title, body, children }: { title: ReactNode; body?: ReactNode; children: ReactNode }) {
  return (
    <section className="relative overflow-hidden border-y-[3px] border-ink">
      <Sunburst className="absolute inset-0 h-full w-full" color="#d66a32" opacity={0.3} />
      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 py-20 text-center sm:px-6">
        <h2 className="display misprint text-6xl sm:text-8xl">{title}</h2>
        {body && <p className="mt-4 max-w-2xl font-serif text-xl text-ink/80">{body}</p>}
        <div className="mt-8 flex flex-wrap justify-center gap-3">{children}</div>
      </div>
    </section>
  );
}
