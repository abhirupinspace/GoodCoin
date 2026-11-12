"use client";
import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { FlameMark } from "@/components/art";

type Tone = "ember" | "dark" | "paper" | "outline" | "red";
const TONES: Record<Tone, string> = {
  ember: "bg-ember text-charcoal hover:bg-mustard",
  dark: "bg-charcoal text-paper hover:bg-burnt",
  paper: "bg-paper text-ink hover:bg-mustard",
  outline: "border-2 border-current bg-transparent hover:bg-charcoal hover:text-paper",
  red: "bg-red text-paper hover:bg-burnt",
};

export function Button({
  href, onClick, tone = "ember", size = "md", children, disabled, type = "button", className = "", external,
}: {
  href?: string; onClick?: () => void; tone?: Tone; size?: "md" | "lg"; children: ReactNode; disabled?: boolean;
  type?: "button" | "submit"; className?: string; external?: boolean;
}) {
  const cls = `display inline-flex items-center justify-center gap-2 px-6 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
    size === "lg" ? "h-14 text-2xl" : "h-11 text-xl"
  } ${TONES[tone]} ${className}`;
  if (href)
    return external ? (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>{children}</a>
    ) : (
      <Link href={href} className={cls}>{children}</Link>
    );
  return <button type={type} onClick={onClick} disabled={disabled} className={cls}>{children}</button>;
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="GOODCOIN home">
      <FlameMark width={22} height={28} />
      <span className={`display text-3xl leading-none ${light ? "text-paper" : "text-ink"}`}>GOODCOIN</span>
    </Link>
  );
}

/** Rubber-stamp label: CAUGHT / SMOTHERED / OPEN… */
export function Stamp({ children, tone = "red", className = "" }: { children: ReactNode; tone?: "red" | "forest" | "ink" | "ember"; className?: string }) {
  const c = { red: "text-red border-red", forest: "text-forest border-forest", ink: "text-ink border-ink", ember: "text-burnt border-burnt" }[tone];
  return (
    <span className={`display inline-block -rotate-3 border-[3px] px-2.5 pt-1 text-xl leading-none ${c} ${className}`}>
      {children}
    </span>
  );
}

export function OutcomeStamp({ outcome, ended = false }: { outcome: "Open" | "Caught" | "Smothered"; ended?: boolean }) {
  if (outcome === "Caught") return <Stamp tone="forest">Caught</Stamp>;
  if (outcome === "Smothered") return <Stamp tone="red">Smothered</Stamp>;
  if (ended) return <Stamp tone="ink">Ended · unsettled</Stamp>;
  return <Stamp tone="ember">Burning</Stamp>;
}

export function SectionHead({ no, eyebrow, title, intro, light = false, className = "" }: {
  no?: string; eyebrow?: string; title: ReactNode; intro?: ReactNode; light?: boolean; className?: string;
}) {
  return (
    <header className={`max-w-3xl ${className}`}>
      {(no || eyebrow) && (
        <p className={`eyebrow mb-3 ${light ? "text-mustard" : "text-burnt"}`}>
          {no && <span className="mr-3">{no}</span>}
          {eyebrow}
        </p>
      )}
      <h2 className={`display text-5xl sm:text-6xl md:text-7xl ${light ? "misprint-paper" : "misprint"}`}>{title}</h2>
      {intro && <div className={`mt-5 font-serif text-lg leading-relaxed ${light ? "text-paper/85" : "text-ink/80"}`}>{intro}</div>}
    </header>
  );
}

export function Stat({ label, value, hint, light = false, big = false }: { label: ReactNode; value: ReactNode; hint?: ReactNode; light?: boolean; big?: boolean }) {
  return (
    <div>
      <p className={`eyebrow ${light ? "text-paper/70" : "text-ink/60"}`}>{label}</p>
      <p className={`display num mt-1 ${big ? "text-6xl" : "text-4xl"} ${light ? "text-paper" : "text-ink"}`}>{value}</p>
      {hint && <p className={`mt-1 text-sm ${light ? "text-paper/70" : "text-ink/60"}`}>{hint}</p>}
    </div>
  );
}

/** Inline term with an accessible definition popover (hover, focus or tap). */
export function Term({ children, def }: { children: ReactNode; def: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="relative inline-block">
      <button
        type="button"
        className="cursor-help border-b-2 border-dotted border-ember font-semibold"
        onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onClick={() => setOpen((o) => !o)}
        aria-describedby={open ? id : undefined}
      >
        {children}
      </button>
      {open && (
        <span id={id} role="tooltip" className="frame absolute left-0 top-full z-40 mt-2 block w-72 bg-paper p-3 text-left font-sans text-sm font-normal normal-case tracking-normal text-ink">
          {def}
        </span>
      )}
    </span>
  );
}

/** Giver progress drawn as a row of embers that ignite as givers join. */
export function EmberProgress({ givers, goal, light = false }: { givers: number; goal: number; light?: boolean }) {
  const slots = Math.max(goal, givers, 1);
  const show = Math.min(slots, 40);
  const lit = Math.round((Math.min(givers, slots) / slots) * show);
  return (
    <div>
      <div className="flex flex-wrap gap-1.5" role="img" aria-label={`${givers} of ${goal} givers`}>
        {Array.from({ length: show }, (_, i) => (
          <span key={i} className={`h-8 w-3 origin-bottom transition-colors ${i < lit ? "bg-ember animate-flicker" : light ? "bg-paper/20" : "bg-ink/15"}`}
            style={i < lit ? { animationDelay: `${(i % 7) * 0.2}s`, clipPath: "polygon(50% 0, 100% 45%, 85% 100%, 15% 100%, 0 45%)" } : { clipPath: "polygon(50% 0, 100% 45%, 85% 100%, 15% 100%, 0 45%)" }} />
        ))}
      </div>
      {slots > 40 && <p className={`mt-1 text-xs ${light ? "text-paper/60" : "text-ink/60"}`}>Each mark ≈ {Math.ceil(slots / 40)} givers.</p>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <span className={`inline-block animate-pulse bg-ink/10 ${className}`} aria-hidden />;
}

export function Notice({ tone = "info", title, children }: { tone?: "info" | "error" | "empty"; title: string; children?: ReactNode }) {
  const c = { info: "border-ink", error: "border-red text-red", empty: "border-ink/40 border-dashed" }[tone];
  return (
    <div role={tone === "error" ? "alert" : undefined} className={`border-2 ${c} p-5`}>
      <p className="display text-2xl">{title}</p>
      {children && <div className="mt-1 text-sm opacity-80">{children}</div>}
    </div>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setState("done"); } catch { setState("failed"); }
        setTimeout(() => setState("idle"), 2200);
      }}
      className="eyebrow h-10 border-2 border-ink px-4 hover:bg-charcoal hover:text-paper"
    >
      {state === "done" ? "Copied ✓" : state === "failed" ? "Copy failed — select manually" : label}
    </button>
  );
}

export function Panel({ children, className = "", dark = false }: { children: ReactNode; className?: string; dark?: boolean }) {
  return <div className={`${dark ? "paper-dark" : "bg-paper"} frame p-5 sm:p-6 ${className}`}>{children}</div>;
}
