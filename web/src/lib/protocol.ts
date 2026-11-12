// Exact BigInt port of the protocol math (SPEC §3–5). Same rounding as contract/src/{fire,claims,hearth,kindle,math}.rs
// and sim/src/goodsim/protocol.py. Verified by replaying tests/golden/basic.json (protocol.test.ts).
export const BPS = 10_000n;

/** φ: Hearth fee of a caught fire's total. */
export const fee = (total: bigint, feeBps: bigint) => (total * feeBps) / BPS;

/** M = min(A, ⌊fee·B·10⁴ / (H·(10⁴+β))⌋). */
export const mintable = (feeAmt: bigint, B: bigint, H: bigint, markupBps: bigint, allowance: bigint) => {
  const cap = (feeAmt * B * BPS) / (H * (BPS + markupBps));
  return cap < allowance ? cap : allowance;
};

/** A giver's GOOD from a caught fire. */
export const share = (M: bigint, weight: bigint, weightSum: bigint) => (weight * M) / weightSum;

/** Spark bounty: weight moved from a newcomer's first gift to the spark (never added). */
export const bounty = (firstGift: bigint, minGift: bigint, bountyBps: bigint) => {
  const cap = (minGift * 3n) / 2n;
  return (bountyBps * (firstGift < cap ? firstGift : cap)) / BPS;
};

/** NEAR returned for redeeming `amount` GOOD. */
export const redeem = (amount: bigint, H: bigint, B: bigint) => (amount * H) / B;

/** GOOD burned by the j-th kindle of a fire. */
export const kindleCost = (j: number, feeBps: bigint, minGift: bigint, B: bigint, H: bigint) => {
  const num = (1n << BigInt(j)) * feeBps * minGift * B;
  const den = BPS * H;
  return (num + den - 1n) / den;
};

/** Base goal Ĝ(e). */
export const baseGoal = (g0: number, e: number) => {
  const k = BigInt(Math.abs(e));
  const [num, den] = e >= 0 ? [BigInt(g0) * 11n ** k, 10n ** k] : [BigInt(g0) * 10n ** k, 11n ** k];
  return Number((num + den - 1n) / den);
};

/** Allowance A = ⌊α · headroom⌋. */
export const allowance = (headroom: bigint, allowanceBps: bigint) => (allowanceBps * headroom) / BPS;
