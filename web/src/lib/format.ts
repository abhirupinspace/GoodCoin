// Display helpers. NEAR and GOOD both use 24 decimals; always BigInt, never floats for amounts.
const ONE = 10n ** 24n;

function group(n: bigint): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** 24-decimal base units → "1,234.56". Rounds down. */
export function units(raw: string | bigint, digits = 2): string {
  const v = BigInt(raw);
  const neg = v < 0n;
  const a = neg ? -v : v;
  const whole = a / ONE;
  if (digits === 0) return (neg ? "-" : "") + group(whole);
  const frac = ((a % ONE) * 10n ** BigInt(digits)) / ONE;
  return `${neg ? "-" : ""}${group(whole)}.${frac.toString().padStart(digits, "0")}`;
}

export const nearFmt = (raw: string | bigint, digits = 2) => `${units(raw, digits)} NEAR`;
export const goodFmt = (raw: string | bigint, digits = 0) => `${units(raw, digits)} GOOD`;

/** Compact GOOD: 1.2M / 340K. */
export function compact(raw: string | bigint): string {
  const whole = Number(BigInt(raw) / ONE);
  if (whole >= 1e9) return `${(whole / 1e9).toFixed(2)}B`;
  if (whole >= 1e6) return `${(whole / 1e6).toFixed(2)}M`;
  if (whole >= 1e4) return `${(whole / 1e3).toFixed(1)}K`;
  return group(BigInt(whole));
}

/** Parse "1.25" NEAR → yocto string. Returns null if invalid. */
export function parseNear(input: string): string | null {
  const s = input.trim();
  if (!/^\d+(\.\d{0,24})?$/.test(s)) return null;
  const [w, f = ""] = s.split(".");
  return (BigInt(w) * ONE + BigInt((f + "0".repeat(24)).slice(0, 24))).toString();
}

/** Floor in NEAR per GOOD from the contract's yocto-per-GOOD figure. */
export function floorFmt(yoctoPerGood: string): string {
  const v = BigInt(yoctoPerGood);
  // show 8 significant decimals
  const whole = v / ONE;
  const frac = ((v % ONE) * 10n ** 10n) / ONE;
  return `${whole}.${frac.toString().padStart(10, "0")}`;
}

export function shortAccount(a: string, max = 22): string {
  return a.length <= max ? a : `${a.slice(0, max - 10)}…${a.slice(-8)}`;
}

export function duration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${r}s`;
  return `${m}m ${String(r).padStart(2, "0")}s`;
}

export function dateFromNs(ns: string): string {
  return new Date(Number(BigInt(ns) / 1_000_000n)).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
