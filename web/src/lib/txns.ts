/** Matching on-chain activity log entries to transactions listed by NearBlocks (see /api/txns). */
import type { Activity, ActivityKind } from "./types";

export interface TxSummary {
  hash: string;
  signer: string;
  block_height: number;
  timestamp_ns: string;
  methods: string[];
  success: boolean | null;
}

export interface TxnsResponse {
  txns: TxSummary[];
  fetched_at_ms: number;
  stale: boolean;
  error: string | null;
}

/** Which contract method writes each activity kind (contract/src/epoch.rs, treasury.rs, vesting.rs, token.rs, lib.rs). */
export const METHODS_FOR_KIND: Record<ActivityKind, string[]> = {
  GenesisMint: ["new"],
  RewardMint: ["claim_reward"],
  VestingMint: ["claim_vested"],
  FailureBurn: ["settle_epochs"],
  OtherBurn: ["ft_transfer_call", "storage_unregister"],
  TreasuryUnlock: ["settle_epochs"],
  TreasuryDisbursement: ["finalize_proposal"],
  EpochSucceeded: ["settle_epochs"],
  EpochSucceededNoReserve: ["settle_epochs"],
  EpochFailed: ["settle_epochs"],
};

/**
 * The activity log stores the block where the receipt executed; the transaction is included in the same block
 * or up to a few blocks earlier. Pick the latest transaction calling an expected method within that window.
 */
export const MATCH_WINDOW_BLOCKS = 4;

export function matchTx(entry: Activity, txns: TxSummary[]): TxSummary | null {
  const h = Number(entry.block_height);
  const methods = METHODS_FOR_KIND[entry.kind];
  let best: TxSummary | null = null;
  for (const t of txns) {
    if (!t.methods.some((m) => methods.includes(m))) continue;
    if (t.block_height > h || t.block_height < h - MATCH_WINDOW_BLOCKS) continue;
    if (!best || t.block_height > best.block_height) best = t;
  }
  return best;
}
