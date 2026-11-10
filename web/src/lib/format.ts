/**
 * Display formatting. All token math is BigInt on raw yocto units; strings are produced only at the edge.
 * Invalid input renders as "--" (never NaN / undefined).
 */

export const GOOD_DECIMALS = 24;
export const NEAR_DECIMALS = 24;
const NS_PER_MS = 1_000_000n;

function toBigInt(v: string | bigint | null | undefined): bigint | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "bigint") return v;
  if (!/^-?\d+$/.test(v)) return null;
  return BigInt(v);
}

const group = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/**
 * Exact decimal string of a raw integer amount with `decimals` places, trailing zeros trimmed.
 * `unitsToDecimal("1500000", 6) === "1.5"`. Used for copy/titles (full precision).
 */
export function unitsToDecimal(raw: string | bigint, decimals: number): string {
  const v = toBigInt(raw);
  if (v === null) return "--";
  const neg = v < 0n;
  const abs = neg ? -v : v;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const frac = (abs % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${neg ? "-" : ""}${whole}${frac ? `.${frac}` : ""}`;
}

/** Parse a user-typed decimal ("12.5") into raw units. Returns null for invalid or over-precise input. */
export function decimalToUnits(input: string, decimals: number): bigint | null {
  const s = input.trim();
  const m = s.match(/^(\d+)(?:\.(\d*))?$/);
  if (!m) return null;
  const frac = m[2] ?? "";
  if (frac.length > decimals) return null;
  return BigInt(m[1]) * 10n ** BigInt(decimals) + BigInt(frac.padEnd(decimals, "0") || "0");
}

const ABBREV: [bigint, string][] = [
  [10n ** 12n, "T"],
  [10n ** 9n, "B"],
  [10n ** 6n, "M"],
  [10n ** 3n, "K"],
];

export interface AmountOptions {
  /** Abbreviate ≥ 1,000 as K/M/B/T (cards, tables). Default false = full value with separators. */
  compact?: boolean;
  /** Max fraction digits shown (rounded down; exact value is always available via unitsToDecimal). */
  maxDecimals?: number;
}

/**
 * Format a raw amount with `decimals` places for display.
 * - exact zero → "0"; non-zero that would display as zero → "<0.0001" style marker
 * - compact: 1,234,567 → "1.23M"
 */
export function formatUnits(raw: string | bigint | null | undefined, decimals: number, opts: AmountOptions = {}): string {
  const v = toBigInt(raw);
  if (v === null) return "--";
  if (v === 0n) return "0";
  const neg = v < 0n;
  const abs = neg ? -v : v;
  const sign = neg ? "-" : "";
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;

  if (opts.compact) {
    for (const [threshold, suffix] of ABBREV) {
      if (whole >= threshold) {
        // two decimals of the abbreviated unit, rounded down
        const hundredths = (abs * 100n) / (threshold * base);
        const intPart = hundredths / 100n;
        const fracPart = (hundredths % 100n).toString().padStart(2, "0").replace(/0+$/, "");
        return `${sign}${group(intPart.toString())}${fracPart ? `.${fracPart}` : ""}${suffix}`;
      }
    }
  }

  const maxDecimals = opts.maxDecimals ?? (opts.compact ? 2 : 4);
  const fracDigits = (abs % base).toString().padStart(decimals, "0").slice(0, maxDecimals).replace(/0+$/, "");
  if (whole === 0n && !fracDigits) {
    return `${sign === "-" ? ">-" : "<"}0.${"0".repeat(Math.max(maxDecimals - 1, 0))}1`;
  }
  return `${sign}${group(whole.toString())}${fracDigits ? `.${fracDigits}` : ""}`;
}

export const formatGood = (raw: string | bigint | null | undefined, opts?: AmountOptions) =>
  formatUnits(raw, GOOD_DECIMALS, opts);

export const formatNear = (raw: string | bigint | null | undefined, opts?: AmountOptions) =>
  formatUnits(raw, NEAR_DECIMALS, opts);

/** Integer with thousands separators. */
export function formatInt(n: number | string | bigint | null | undefined): string {
  if (n === null || n === undefined) return "--";
  const v = typeof n === "number" ? (Number.isFinite(n) ? BigInt(Math.trunc(n)) : null) : toBigInt(String(n));
  if (v === null) return "--";
  return (v < 0n ? "-" : "") + group((v < 0n ? -v : v).toString());
}

/** Basis points → "12.5%". */
export function formatBps(bps: number): string {
  if (!Number.isFinite(bps)) return "--";
  return `${(bps / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
}

/** Human duration of a nanosecond span: "7d", "6m", "2m 30s", "1d 4h". Two largest units. */
export function formatDurationNs(ns: string | bigint | null | undefined): string {
  const v = toBigInt(ns);
  if (v === null) return "--";
  if (v <= 0n) return "0s";
  let s = v / 1_000_000_000n;
  if (s === 0n) return "<1s";
  const units: [bigint, string][] = [
    [86_400n, "d"],
    [3_600n, "h"],
    [60n, "m"],
    [1n, "s"],
  ];
  const parts: string[] = [];
  for (const [size, label] of units) {
    if (s >= size) {
      parts.push(`${s / size}${label}`);
      s %= size;
    }
    if (parts.length === 2) break;
  }
  return parts.join(" ");
}

/** Countdown "1h 02m 05s" / "04m 09s" from milliseconds remaining; "0s" when past. */
export function formatCountdown(msRemaining: number): string {
  if (!Number.isFinite(msRemaining)) return "--";
  if (msRemaining <= 0) return "0s";
  const total = Math.floor(msRemaining / 1000);
  const d = Math.floor(total / 86_400);
  const h = Math.floor((total % 86_400) / 3_600);
  const m = Math.floor((total % 3_600) / 60);
  const s = total % 60;
  const pad = (x: number) => String(x).padStart(2, "0");
  if (d > 0) return `${d}d ${pad(h)}h ${pad(m)}m`;
  if (h > 0) return `${h}h ${pad(m)}m ${pad(s)}s`;
  return `${pad(m)}m ${pad(s)}s`;
}

/** Nanosecond timestamp → milliseconds (Number is safe for ms-since-epoch). */
export function nsToMs(ns: string | bigint | null | undefined): number | null {
  const v = toBigInt(ns);
  return v === null ? null : Number(v / NS_PER_MS);
}

export function msToNs(ms: number): bigint {
  return BigInt(Math.trunc(ms)) * NS_PER_MS;
}

/** Nanosecond timestamp → "2026-11-11 14:05 UTC". UTC so on-chain times read the same for everyone. */
export function formatTimestampNs(ns: string | bigint | null | undefined): string {
  const ms = nsToMs(ns);
  if (ms === null) return "--";
  return `${new Date(ms).toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

/**
 * Reward for a successful epoch given the streak before it, mirroring `reward_for_streak` in the contract:
 * base × (1 + bonus_bps/10000 × min(streak, cap)).
 */
export function rewardForStreak(base: bigint, streak: number, bonusBps: number, cap: number): bigint {
  const steps = BigInt(Math.min(streak, cap));
  return (base * (10_000n + BigInt(bonusBps) * steps)) / 10_000n;
}

/** a / b as a 0–1 fraction for progress bars (clamped). */
export function fraction(a: number | bigint, b: number | bigint): number {
  const den = Number(b);
  if (!den) return 0;
  return Math.max(0, Math.min(1, Number(a) / den));
}

/** Shorten long account ids for tight layouts; full id goes in the title attribute. */
export function shortAccount(id: string, max = 28): string {
  if (id.length <= max) return id;
  const keep = Math.floor((max - 1) / 2);
  return `${id.slice(0, keep)}…${id.slice(-keep)}`;
}
