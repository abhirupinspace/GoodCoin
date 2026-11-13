// GET /api/txns/:account — INDEXED DATA (not contract state): the account's transactions to the GOODCOIN
// contract, from NearBlocks v3 testnet. Cached 30 s per account; optional server-only NEARBLOCKS_API_KEY.
import { CONTRACT } from "@/lib/config";

interface NBTxn {
  transaction_hash: string;
  signer_account_id: string;
  receiver_account_id: string;
  block_timestamp: string;
  actions?: { action: string; method?: string | null; deposit?: number | string; args?: string | null }[];
  actions_agg?: { deposit?: number | string };
  outcomes?: { status: boolean | null };
}
const cache = new Map<string, { at: number; body: unknown }>();

/** NearBlocks may return deposits as JSON numbers (lossy for yocto); never emit scientific notation. */
function toYoctoString(v: number | string): string {
  if (typeof v === "string") return v;
  return v.toLocaleString("fullwide", { useGrouping: false, maximumFractionDigits: 0 });
}

export async function GET(_req: Request, { params }: { params: Promise<{ account: string }> }) {
  const { account } = await params;
  if (!/^[a-z0-9._-]{2,64}$/.test(account)) return Response.json({ txns: [], error: "invalid account", stale: false }, { status: 400 });
  const hit = cache.get(account);
  if (hit && Date.now() - hit.at < 30_000) return Response.json(hit.body);
  try {
    const key = process.env.NEARBLOCKS_API_KEY;
    const url = `https://api-testnet.nearblocks.io/v3/accounts/${encodeURIComponent(account)}/txns?limit=50`;
    const res = await fetch(url, { headers: key ? { authorization: `Bearer ${key}` } : {}, signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(res.status === 429 ? "NearBlocks rate limit. Try again shortly" : `NearBlocks ${res.status}`);
    const json = (await res.json()) as { data?: NBTxn[] };
    const txns = (json.data ?? [])
      .filter((t) => t.receiver_account_id === CONTRACT)
      .map((t) => {
        const a = t.actions?.[0];
        let args: Record<string, unknown> | null = null;
        try { args = a?.args ? JSON.parse(a.args) : null; } catch { args = null; }
        return {
          hash: t.transaction_hash, signer: t.signer_account_id, receiver: t.receiver_account_id,
          method: a?.method ?? a?.action ?? null, deposit: toYoctoString(a?.deposit ?? t.actions_agg?.deposit ?? "0"),
          timestamp_ns: t.block_timestamp, success: t.outcomes?.status ?? null, args,
        };
      });
    const body = { txns, error: null, stale: false };
    cache.set(account, { at: Date.now(), body });
    return Response.json(body);
  } catch (e) {
    const error = e instanceof Error ? e.message : "indexer unavailable";
    if (hit) return Response.json({ ...(hit.body as object), stale: true, error });
    return Response.json({ txns: [], error, stale: true });
  }
}
