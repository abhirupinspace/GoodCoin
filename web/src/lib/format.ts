// Display helpers. All amounts are 24-decimal base units (NEAR and GOOD alike); use BigInt only.
const DECIMALS = 24n;
const ONE = 10n ** DECIMALS;

export function toUnits(raw: string, digits = 2): string {
  const v = BigInt(raw);
  const whole = v / ONE;
  const frac = ((v % ONE) * 10n ** BigInt(digits)) / ONE;
  return digits === 0 ? whole.toLocaleString("en-US") : `${whole.toLocaleString("en-US")}.${frac.toString().padStart(digits, "0")}`;
}

export const near = (raw: string, digits = 2) => `${toUnits(raw, digits)} NEAR`;
export const good = (raw: string, digits = 0) => `${toUnits(raw, digits)} GOOD`;

export function secondsLeft(endNs: string, nowNs: string): number {
  return Math.max(0, Number((BigInt(endNs) - BigInt(nowNs)) / 1_000_000_000n));
}
