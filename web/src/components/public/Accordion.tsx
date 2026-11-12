"use client";
// Accessible accordion: each question is a <button aria-expanded aria-controls> inside a heading.
import { useId, useState, type ReactNode } from "react";

export interface QA { q: string; a: ReactNode }

export function Accordion({ items, headingLevel = 3 }: { items: QA[]; headingLevel?: 2 | 3 | 4 }) {
  const [open, setOpen] = useState<Set<number>>(() => new Set());
  const base = useId();
  const H = `h${headingLevel}` as "h3";
  const toggle = (i: number) => setOpen((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; });
  return (
    <div className="border-t-2 border-ink">
      {items.map((it, i) => {
        const isOpen = open.has(i);
        const btn = `${base}-q${i}`, panel = `${base}-a${i}`;
        return (
          <div key={i} className="border-b-2 border-ink">
            <H className="m-0">
              <button id={btn} type="button" aria-expanded={isOpen} aria-controls={panel} onClick={() => toggle(i)}
                className="flex w-full items-start justify-between gap-6 py-4 text-left font-sans text-lg font-semibold hover:text-burnt">
                <span>{it.q}</span>
                <span aria-hidden className={`display mt-0.5 shrink-0 text-3xl leading-none text-ember transition-transform ${isOpen ? "rotate-45" : ""}`}>+</span>
              </button>
            </H>
            <div id={panel} role="region" aria-labelledby={btn} hidden={!isOpen} className="pb-5 pr-8 font-serif text-lg leading-relaxed text-ink/85 [&_a]:underline [&_a]:underline-offset-4 [&_p+p]:mt-3">
              {it.a}
            </div>
          </div>
        );
      })}
    </div>
  );
}
