import "server-only";
// Chain readers for the indexer: FastNEAR's tx index (account → tx hashes, tx → receipts with logs) and
// RPC for a just-confirmed transaction (FastNEAR may lag it by a few seconds).
import { rpc } from "@/lib/rpc";
import type { FastTx, ReceiptOutcome } from "./events";

const FASTNEAR_TX = "https://tx.test.fastnear.com/v0";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${FASTNEAR_TX}/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`FastNEAR ${path} ${res.status}`);
  return (await res.json()) as T;
}

export interface AccountTx {
  transaction_hash: string;
  tx_block_height: number;
}

/** Transactions touching `account` with block height > `after`, oldest first. */
export async function accountTxsSince(account: string, after: number, maxPages = after === 0 ? 50 : 5): Promise<AccountTx[]> {
  const out: AccountTx[] = [];
  let max: number | null = null;
  for (let page = 0; page < maxPages; page++) {
    const r: { account_txs?: AccountTx[]; txs_count?: number } = await post("account", { account_id: account, max_block_height: max });
    const txs: AccountTx[] = r.account_txs ?? [];
    const fresh = txs.filter((t) => t.tx_block_height > after);
    out.push(...fresh);
    if (txs.length === 0 || fresh.length < txs.length || (r.txs_count ?? 0) <= out.length) break;
    const lowest = Math.min(...txs.map((t) => t.tx_block_height)) - 1;
    if (max !== null && lowest >= max) break; // no progress: the index ignored the cursor
    max = lowest;
  }
  const seen = new Set<string>();
  return out
    .filter((t) => (seen.has(t.transaction_hash) ? false : (seen.add(t.transaction_hash), true)))
    .sort((a, b) => a.tx_block_height - b.tx_block_height);
}

export async function fastTransactions(hashes: string[]): Promise<FastTx[]> {
  const out: FastTx[] = [];
  for (let i = 0; i < hashes.length; i += 20) {
    const r = await post<{ transactions: (FastTx | null)[] }>("transactions", { tx_hashes: hashes.slice(i, i + 20) });
    out.push(...r.transactions.filter((t): t is FastTx => !!t));
  }
  return out;
}

interface RpcTx {
  transaction: { hash: string; signer_id: string; receiver_id: string };
  receipts_outcome: { id: string; block_hash: string; outcome: { logs: string[]; executor_id: string } }[];
}

/** A final transaction via RPC, normalized to receipt outcomes (one block lookup per distinct block). */
export async function rpcTransaction(hash: string, signer: string) {
  const t = await rpc<RpcTx>("tx", { tx_hash: hash, sender_account_id: signer, wait_until: "FINAL" });
  const blocks = new Map<string, { height: number; ts: string }>();
  for (const r of t.receipts_outcome) {
    if (blocks.has(r.block_hash)) continue;
    const b = await rpc<{ header: { height: number; timestamp_nanosec: string } }>("block", { block_id: r.block_hash });
    blocks.set(r.block_hash, { height: b.header.height, ts: b.header.timestamp_nanosec });
  }
  const receipts: ReceiptOutcome[] = t.receipts_outcome.map((r) => ({
    receipt_id: r.id,
    executor: r.outcome.executor_id,
    block_height: blocks.get(r.block_hash)!.height,
    block_ts_ns: blocks.get(r.block_hash)!.ts,
    logs: r.outcome.logs,
  }));
  return { tx: { hash: t.transaction.hash, signer: t.transaction.signer_id, receiver: t.transaction.receiver_id }, receipts };
}
