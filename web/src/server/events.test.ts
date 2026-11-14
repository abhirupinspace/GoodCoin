import { describe, expect, it } from "vitest";
import { extractEvents, fastReceipts, nsToIso, type FastTx } from "./events";
import fixture from "./__fixtures__/redeem-tx.json";

// Real testnet tx 7AKCgb…: alice redeems 10,000 GOOD on goodfire-demo4-ab92.testnet (live E2E run).
const tx = fixture as unknown as FastTx;
const C = "goodfire-demo4-ab92.testnet";

describe("extractEvents", () => {
  const rows = extractEvents(
    { hash: tx.transaction.hash, signer: tx.transaction.signer_id },
    fastReceipts(tx),
    (a) => a === C,
  );

  it("finds the burn and the redeem, in log order, from the contract's receipt only", () => {
    expect(rows.map((r) => `${r.standard}:${r.event}`)).toEqual(["nep141:ft_burn", "goodcoin:redeemed"]);
    expect(rows.every((r) => r.contract === C && r.tx_hash === "7AKCgbcYgwZzxTabbUJXUDUKFMbdF21JpvNhmavHsdHJ")).toBe(true);
    expect(rows.map((r) => r.idx)).toEqual([0, 1]);
  });

  it("keeps exact yocto strings in event data", () => {
    expect(rows[1].data).toEqual({
      account: "alice.gcteam-ab92.testnet",
      good: "10000000000000000000000000000",
      near: "10479941829919079594994",
    });
    expect(rows[1].signer).toBe("alice.gcteam-ab92.testnet");
    expect(rows[1].block_height).toBe(277412924);
    expect(rows[1].ts).toBe(new Date(1794515631561).toISOString());
  });

  it("ignores unwatched executors, foreign standards and malformed logs", () => {
    const r = extractEvents({ hash: "h", signer: "s" }, [
      { receipt_id: "r", executor: C, block_height: 1, block_ts_ns: "0", logs: ["hello", "EVENT_JSON:{bad", 'EVENT_JSON:{"standard":"other","event":"x"}'] },
      { receipt_id: "q", executor: "x.testnet", block_height: 1, block_ts_ns: "0", logs: ['EVENT_JSON:{"standard":"goodcoin","event":"fire_gift","data":{}}'] },
    ], (a) => a === C);
    expect(r).toEqual([]);
  });

  it("converts ns timestamps", () => {
    expect(nsToIso("1794515631561472983")).toBe(new Date(1794515631561).toISOString());
  });
});
