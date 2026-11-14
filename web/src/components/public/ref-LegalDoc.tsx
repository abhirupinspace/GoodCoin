// Shared layout for the draft legal pages: a numbered, plainly worded document.
import type { ReactNode } from "react";
import { Hero } from "@/components/brand";

export function LegalDoc({ kicker, title, intro, sections }: { kicker: string; title: ReactNode; intro: ReactNode; sections: [string, ReactNode][] }) {
  return (
    <>
      <Hero variant="minimal" marker={<>Legal <span className="text-red">/</span> {kicker}</>} lines={[title]} h1Class="display text-[clamp(3.4rem,8vw,7rem)]" lede={intro}
        meta={[["Status", "Draft"], ["Advice", "Not legal advice"], ["Effective", "13 Nov 2026"], ["Network", "Testnet"]]} />
      <article className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <ol className="space-y-10">
          {sections.map(([h, body], i) => (
            <li key={h} className="grid grid-cols-[auto_1fr] gap-5 border-b border-line pb-8">
              <span className="display text-5xl text-red">{String(i + 1).padStart(2, "0")}</span>
              <section>
                <h2 className="display text-4xl">{h}</h2>
                <div className="mt-3 space-y-3 text-base leading-relaxed text-ink/80">{body}</div>
              </section>
            </li>
          ))}
        </ol>
      </article>
    </>
  );
}
