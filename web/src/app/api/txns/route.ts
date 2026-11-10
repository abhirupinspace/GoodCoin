/**
 * GET /api/txns — the contract's most recent transactions from NearBlocks v3 (testnet), trimmed to what the
 * Activity page needs to link an on-chain activity entry to its transaction hash.
 * Cached in memory for 30 s (free tier allows ~6 requests/min without a key). Optional NEARBLOCKS_API_KEY
 * (server-only env var) is sent as a bearer token. On upstream failure the last good copy is served, marked stale.
 */
import { CONTRACT_ID } from "@/lib/config";
import type { TxSummary, TxnsResponse } from "@/lib/txns";

const TTL_MS = 30_000;
let cache: { at: number; body: TxnsResponse } | null = null;

interface NearBlocksTxn {
  transaction_hash: string;
  signer_account_id: string;
  block: { block_height: string | number };
  block_timestamp: string;
  actions?: { action: string; method?: string | null }[];
  outcomes?: { status: boolean | null };
}

async function fetchTxns(): Promise<TxSummary[]> {
  const url = `https://api-testnet.nearblocks.io/v3/accounts/${encodeURIComponent(CONTRACT_ID)}/txns?limit=25`;
  const key = process.env.NEARBLOCKS_API_KEY;
  const res = await fetch(url, {
    headers: key ? { authorization: `Bearer ${key}` } : {},
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(res.status === 429 ? "NearBlocks rate limit reached" : `NearBlocks responded ${res.status}`);
  const json = (await res.json()) as { data?: NearBlocksTxn[] };
  return (json.data ?? []).map((t) => ({
    hash: t.transaction_hash,
    signer: t.signer_account_id,
    block_height: Number(t.block.block_height),
    timestamp_ns: t.block_timestamp,
    methods: (t.actions ?? []).map((a) => a.method ?? a.action),
    success: t.outcomes?.status ?? null,
  }));
}

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return Response.json(cache.body);
  try {
    const body: TxnsResponse = { txns: await fetchTxns(), fetched_at_ms: now, stale: false, error: null };
    cache = { at: now, body };
    return Response.json(body);
  } catch (e) {
    const error = e instanceof Error ? e.message : "NearBlocks unavailable";
    if (cache) return Response.json({ ...cache.body, stale: true, error });
    return Response.json({ txns: [], fetched_at_ms: now, stale: true, error } satisfies TxnsResponse);
  }
}
