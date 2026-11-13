// Shared layout for the draft legal pages: a numbered, plainly worded document.
import type { ReactNode } from "react";
import { ScalesArt } from "@/components/public/art";
import { PageHero } from "@/components/public/Page";
import { Stamp } from "@/components/ui";

export function LegalDoc({ kicker, title, intro, sections }: { kicker: string; title: ReactNode; intro: ReactNode; sections: [string, ReactNode][] }) {
  return (
    <>
      <PageHero kicker={kicker} title={title} intro={intro} art={<ScalesArt className="w-full max-w-xs" />}>
        <div className="flex flex-wrap items-center gap-4">
          <Stamp tone="red">Draft, not legal advice</Stamp>
          <p className="eyebrow text-ink/60">Effective 13 November 2026</p>
        </div>
      </PageHero>
      <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <ol className="space-y-10">
          {sections.map(([h, body], i) => (
            <li key={h} className="grid grid-cols-[auto_1fr] gap-5 border-b border-ink/20 pb-8">
              <span className="display text-5xl text-ember">{String(i + 1).padStart(2, "0")}</span>
              <section>
                <h2 className="display text-4xl">{h}</h2>
                <div className="mt-3 space-y-3 font-serif text-lg leading-relaxed text-ink/85">{body}</div>
              </section>
            </li>
          ))}
        </ol>
      </article>
    </>
  );
}
