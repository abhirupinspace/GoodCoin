/** Small presentational primitives. No data fetching here. */
import type { ComponentProps, ReactNode } from "react";
import { accountUrl } from "@/lib/config";
import { formatGood, shortAccount, unitsToDecimal, GOOD_DECIMALS, fraction } from "@/lib/format";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Card({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-xl border border-border bg-card p-4 sm:p-5", className)}>
      {(title || action) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {children && <div className="mt-1 max-w-3xl text-sm text-muted-fg">{children}</div>}
    </header>
  );
}

export function Stat({ label, value, hint }: { label: ReactNode; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted-fg">{label}</dt>
      <dd className="mt-0.5 font-mono text-xl font-semibold tabular-nums">{value}</dd>
      {hint && <dd className="mt-0.5 text-xs text-muted-fg">{hint}</dd>}
    </div>
  );
}

export type Tone = "neutral" | "ok" | "warn" | "bad" | "info" | "accent";
const TONES: Record<Tone, string> = {
  neutral: "bg-muted text-muted-fg",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  info: "bg-info-soft text-info",
  accent: "bg-accent-soft text-accent",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", TONES[tone])}>{children}</span>;
}

type ButtonProps = ComponentProps<"button"> & { variant?: "primary" | "secondary" | "danger" };
export function Button({ variant = "secondary", className, ...props }: ButtonProps) {
  const styles = {
    primary: "bg-accent text-accent-fg hover:opacity-90",
    secondary: "border border-border bg-card hover:bg-muted",
    danger: "border border-bad text-bad hover:bg-bad-soft",
  }[variant];
  return (
    <button
      type="button"
      {...props}
      className={cx(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        "disabled:cursor-not-allowed disabled:opacity-50",
        styles,
        className,
      )}
    />
  );
}

export function ExternalLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cx("underline decoration-border underline-offset-2 hover:decoration-current focus-visible:outline-2 focus-visible:outline-ring", className)}
    >
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

/** Account id linked to the explorer; long ids are shortened with the full id in the title. */
export function Account({ id, max }: { id: string; max?: number }) {
  return (
    <ExternalLink href={accountUrl(id)} className="font-mono text-[0.85em] break-all">
      <span title={id}>{shortAccount(id, max)}</span>
    </ExternalLink>
  );
}

/** GOOD amount. Title attribute carries the exact on-chain value for copy/inspection. */
export function Good({ yocto, compact, unit = true }: { yocto: string | bigint | null | undefined; compact?: boolean; unit?: boolean }) {
  const exact = yocto === null || yocto === undefined ? "--" : unitsToDecimal(yocto, GOOD_DECIMALS);
  return (
    <span className="font-mono tabular-nums" title={`${exact} GOOD`}>
      {formatGood(yocto, { compact })}
      {unit && <span className="ml-1 text-[0.8em] font-normal text-muted-fg">GOOD</span>}
    </span>
  );
}

export function Progress({
  label,
  value,
  target,
  met,
  format = String,
}: {
  label: string;
  value: number;
  target: number;
  met?: boolean;
  /** How to print value and target (default: plain integers). */
  format?: (n: number) => string;
}) {
  const done = met ?? value >= target;
  const pct = Math.round(fraction(value, target) * 100);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span>{label}</span>
        <span className="font-mono tabular-nums">
          {format(value)} / {format(target)} {done && <span className="text-ok">✓</span>}
        </span>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={value}
      >
        <div className={cx("transition-bar h-full rounded-full", done ? "bg-ok" : "bg-accent")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-md bg-muted motion-reduce:animate-none", className)} aria-hidden />;
}

export function Notice({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <div className={cx("rounded-lg px-3 py-2 text-sm", TONES[tone])}>{children}</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-fg">{children}</p>;
}

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: ReactNode; error?: string | null; children: ReactNode; htmlFor: string }) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted-fg">{hint}</p>}
      {error && (
        <p className="text-xs text-bad" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export { cx };
