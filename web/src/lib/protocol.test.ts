import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as p from "./protocol";

const trace = JSON.parse(readFileSync(new URL("../../../tests/golden/basic.json", import.meta.url), "utf8"));
const cfg = trace.config;
const big = (v: string | number) => BigInt(v);

describe("protocol math matches the golden trace", () => {
  it("fire 0: fee, mint, shares, bounty", () => {
    const H = big(cfg.H0), B = big(cfg.seed);
    const total = big("1300000000000000000000000");
    const f = p.fee(total, big(cfg.fee_bps));
    const A = p.allowance(big(cfg.max_supply), big(cfg.allowance_bps));
    const M = p.mintable(f, B, H, big(cfg.markup_bps), A);
    const expected = trace.expected.find((e: { i: number }) => e.i === 5);
    expect(M).toBe(big(expected.earmarked));
    expect(H + f).toBe(big(expected.hearth));
    const b = p.bounty(big(cfg.min_gift), big(cfg.min_gift), big(cfg.bounty_bps));
    const alice = big("1000000000000000000000000") + b;
    expect(p.share(M, alice, total)).toBe(big("82000000000000000000000000000"));
  });

  it("kindle cost and redeem match the trace", () => {
    const before = trace.expected.find((e: { i: number }) => e.i === 16);
    const after = trace.expected.find((e: { i: number }) => e.i === 17);
    const cost = p.kindleCost(0, big(cfg.fee_bps), big(cfg.min_gift), big(before.B), big(before.hearth));
    expect(cost).toBe(big(after.total_burned) - big(before.total_burned));
    const r0 = trace.expected.find((e: { i: number }) => e.i === 19);
    const r1 = trace.expected.find((e: { i: number }) => e.i === 20);
    expect(p.redeem(big("10000000000000000000000000000"), big(r0.hearth), big(r0.B))).toBe(big(r0.hearth) - big(r1.hearth));
  });

  it("ratchet", () => {
    expect(p.baseGoal(4, 0)).toBe(4);
    expect(p.baseGoal(4, 1)).toBe(5);
    expect(p.baseGoal(20, 7)).toBe(39);
    expect(p.baseGoal(20, -1)).toBe(19);
  });
});
