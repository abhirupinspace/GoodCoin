"use client";
import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { FlameMark } from "@/components/art";

type Tone = "ember" | "dark" | "paper" | "outline" | "red";
const TONES: Record<Tone, string> = {
  ember: "bg-red text-ink hover:bg-ember",
  red: "bg-red text-ink hover:bg-ember",
  dark: "bg-ink text-paper hover:bg-ember hover:text-ink",
  paper: "border border-ink/40 text-ink hover:border-ink hover:bg-ink hover:text-paper",
  outline: "border border-line text-ink hover:border-ink",
};

export function Button({
  href, onClick, tone = "ember", size = "md", children, disabled, type = "button", className = "", external,
}: {
  href?: string; onClick?: () => void; tone?: Tone; size?: "md" | "lg"; children: ReactNode; disabled?: boolean;
  type?: "button" | "submit"; className?: string; external?: boolean;
}) {
  const cls = `press inline-flex items-center justify-center gap-3 font-mono text-[0.72rem] font-medium uppercase tracking-[0.18em] disabled:cursor-not-allowed disabled:opacity-40 ${
    size === "lg" ? "h-14 px-7" : "h-11 px-5"
  } ${TONES[tone]} ${className}`;
  if (href)
    return external ? (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>{children}</a>
    ) : (
      <Link href={href} className={cls}>{children}</Link>
    );
  return <button type={type} onClick={onClick} disabled={disabled} className={cls}>{children}</button>;
}

export function Logo(_: { light?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5" aria-label="GOODCOIN home">
      <FlameMark width={16} height={20} className="origin-bottom transition-transform group-hover:scale-110" />
      <span className="display text-[1.7rem] leading-none tracking-[0.02em] text-ink">GOODCOIN</span>
    </Link>
  );
}

/** Status label: a hairline box in mono caps. */
export function Stamp({ children, tone = "red", className = "" }: { children: ReactNode; tone?: "red" | "forest" | "ink" | "ember"; className?: string }) {
  const c = { red: "text-red border-red/60", forest: "text-ember border-ember/60", ink: "text-mute border-line", ember: "text-ink border-line" }[tone];
  return (
    <span className={`inline-flex items-center gap-2 border px-2.5 py-1 font-mono text-[0.68rem] font-medium uppercase leading-none tracking-[0.16em] ${c} ${className}`}>
      {children}
    </span>
  );
}

/** Fire status. Final outcomes animate in, and are only ever rendered from settled on-chain state. */
export function OutcomeStamp({ outcome, ended = false }: { outcome: "Open" | "Caught" | "Smothered"; ended?: boolean }) {
  if (outcome === "Caught") return <Stamp tone="forest" className="stamp-in"><span className="size-1.5 bg-ember" aria-hidden />Caught</Stamp>;
  if (outcome === "Smothered") return <Stamp tone="ink" className="stamp-in"><span className="size-1.5 bg-mute" aria-hidden />Smothered</Stamp>;
  if (ended) return <Stamp tone="ink">Ended · unsettled</Stamp>;
  return <Stamp tone="red"><span className="size-1.5 animate-pulse rounded-full bg-red" aria-hidden />Burning</Stamp>;
}

export function SectionHead({ no, eyebrow, title, intro, light = false, className = "" }: {
  no?: string; eyebrow?: string; title: ReactNode; intro?: ReactNode; light?: boolean; className?: string;
}) {
  return (
    <header className={`max-w-3xl ${className}`}>
      {(no || eyebrow) && (
        <p className="eyebrow mb-5 text-mute">
          {no && <span className="mr-3 text-red">{no}</span>}
          {eyebrow}
        </p>
      )}
      <h2 className="display text-5xl sm:text-6xl md:text-7xl">{title}</h2>
      {intro && <div className="mt-5 max-w-xl text-lg leading-relaxed text-mute">{intro}</div>}
    </header>
  );
}

export function Stat({ label, value, hint, light = false, big = false }: { label: ReactNode; value: ReactNode; hint?: ReactNode; light?: boolean; big?: boolean }) {
  return (
    <div>
      <p className="eyebrow text-mute">{label}</p>
      <p className={`display num mt-2 ${big ? "text-6xl" : "text-4xl"} text-ink`}>{value}</p>
      {hint && <p className={`mt-1 text-sm ${light ? "text-ink/70" : "text-ink/60"}`}>{hint}</p>}
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
        className="cursor-help border-b border-dotted border-ember font-semibold"
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
          <span key={i} className={`h-8 w-3 origin-bottom transition-colors ${i < lit ? "bg-ember animate-flicker" : "bg-ink/12"}`}
            style={i < lit ? { animationDelay: `${(i % 7) * 0.2}s`, clipPath: "polygon(50% 0, 100% 45%, 85% 100%, 15% 100%, 0 45%)" } : { clipPath: "polygon(50% 0, 100% 45%, 85% 100%, 15% 100%, 0 45%)" }} />
        ))}
      </div>
      {slots > 40 && <p className={`mt-1 text-xs ${light ? "text-ink/60" : "text-ink/60"}`}>Each mark ≈ {Math.ceil(slots / 40)} givers.</p>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <span className={`inline-block animate-pulse bg-ink/10 ${className}`} aria-hidden />;
}

export function Notice({ tone = "info", title, children }: { tone?: "info" | "error" | "empty"; title: string; children?: ReactNode }) {
  const c = { info: "border-line", error: "border-red text-red", empty: "border-line border-dashed" }[tone];
  return (
    <div role={tone === "error" ? "alert" : undefined} className={`border ${c} bg-parchment p-5`}>
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
      className="eyebrow h-10 border border-line px-4 transition-colors hover:border-ink"
    >
      {state === "done" ? "Copied ✓" : state === "failed" ? "Copy failed. Select manually" : label}
    </button>
  );
}

export function Panel({ children, className = "", dark = false }: { children: ReactNode; className?: string; dark?: boolean }) {
  return <div className={`${dark ? "bg-paper" : "bg-parchment"} border border-line p-5 sm:p-6 ${className}`}>{children}</div>;
}
