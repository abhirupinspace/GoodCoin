// NEP-297 event extraction. Pure: turns receipt outcomes (from FastNEAR or RPC) into event rows.
export interface ReceiptOutcome {
  receipt_id: string;
  executor: string;
  block_height: number;
  block_ts_ns: string;
  logs: string[];
}

export interface EventRow {
  receipt_id: string;
  idx: number;
  contract: string;
  block_height: number;
  ts: string; // ISO
  tx_hash: string;
  signer: string;
  standard: string;
  event: string;
  data: unknown;
}

const STANDARDS = new Set(["goodcoin", "goodcoin_factory", "nep141"]);

export function nsToIso(ns: string): string {
  return new Date(Number(BigInt(ns) / 1_000_000n)).toISOString();
}

/** Every goodcoin / goodcoin_factory / nep141 event logged by a receipt whose executor passes `watched`. */
export function extractEvents(
  tx: { hash: string; signer: string },
  receipts: ReceiptOutcome[],
  watched: (account: string) => boolean,
): EventRow[] {
  const rows: EventRow[] = [];
  for (const r of receipts) {
    if (!watched(r.executor)) continue;
    r.logs.forEach((log, idx) => {
      if (!log.startsWith("EVENT_JSON:")) return;
      let ev: { standard?: string; event?: string; data?: unknown };
      try {
        ev = JSON.parse(log.slice("EVENT_JSON:".length));
      } catch {
        return;
      }
      if (!ev.standard || !ev.event || !STANDARDS.has(ev.standard)) return;
      rows.push({
        receipt_id: r.receipt_id,
        idx,
        contract: r.executor,
        block_height: r.block_height,
        ts: nsToIso(r.block_ts_ns),
        tx_hash: tx.hash,
        signer: tx.signer,
        standard: ev.standard,
        event: ev.event,
        data: ev.data ?? null,
      });
    });
  }
  return rows;
}

/** FastNEAR tx API shape → receipt outcomes. */
export interface FastTx {
  transaction: { hash: string; signer_id: string; receiver_id: string };
  receipts: {
    execution_outcome: { id: string; block_height: number; block_timestamp: number | string; outcome: { logs: string[]; executor_id: string } };
  }[];
}

export function fastReceipts(t: FastTx): ReceiptOutcome[] {
  return t.receipts.map(({ execution_outcome: e }) => ({
    receipt_id: e.id,
    executor: e.outcome.executor_id,
    block_height: e.block_height,
    // FastNEAR returns block_timestamp as a JSON number; above 2^53 it is approximate to ~100 ns, fine for display.
    block_ts_ns: typeof e.block_timestamp === "string" ? e.block_timestamp : BigInt(Math.round(e.block_timestamp)).toString(),
    logs: e.outcome.logs,
  }));
}
