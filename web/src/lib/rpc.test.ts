import { describe, expect, it } from "vitest";
import { panicMessage, txFailure } from "./rpc";
import { matchTx, type TxSummary } from "./txns";
import type { Activity } from "./types";

describe("contract error extraction", () => {
  it("extracts the panic message from a view error", () => {
    expect(panicMessage('wasm execution failed with error: FunctionCallError(ExecutionError("Smart contract panicked: already attested"))')).toBe("already attested");
  });

  it("extracts the panic message from a failed transaction outcome", () => {
    const outcome = {
      transaction: { hash: "h" },
      status: { Failure: { ActionError: { index: 0, kind: { FunctionCallError: { ExecutionError: "Smart contract panicked: epoch 1 can be settled from 123 (ns)" } } } } },
    };
    expect(txFailure(outcome)).toBe("epoch 1 can be settled from 123 (ns)");
    expect(txFailure({ transaction: { hash: "h" }, status: { SuccessValue: "" } })).toBeNull();
  });
});

describe("matching activity entries to transactions", () => {
  const entry: Activity = { kind: "EpochFailed", epoch: "3", account: null, amount: "0", timestamp: "0", block_height: "1002", memo: "" };
  const tx = (hash: string, block_height: number, method: string): TxSummary => ({ hash, block_height, methods: [method], signer: "a", timestamp_ns: "0", success: true });

  it("picks the latest matching-method tx at or shortly before the block", () => {
    const txns = [tx("a", 990, "settle_epochs"), tx("b", 1001, "settle_epochs"), tx("c", 1002, "attest"), tx("d", 1003, "settle_epochs")];
    expect(matchTx(entry, txns)?.hash).toBe("b");
  });

  it("returns null when nothing is close enough", () => {
    expect(matchTx(entry, [tx("a", 990, "settle_epochs")])).toBeNull();
  });
});
