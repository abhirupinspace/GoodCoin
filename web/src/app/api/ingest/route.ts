// POST /api/ingest {txHash, signer}: called by the wallet flow right after a transaction is final. The
// transaction is re-read from chain; only receipts executed by known fires or the factory are recorded.
import { ingestTx } from "@/server/indexer";

export const dynamic = "force-dynamic";
const HASH = /^[1-9A-HJ-NP-Za-km-z]{43,44}$/;
const ACCOUNT = /^[a-z0-9._-]{2,64}$/;

export async function POST(req: Request) {
  const { txHash, signer } = (await req.json().catch(() => ({}))) as { txHash?: string; signer?: string };
  if (!txHash || !HASH.test(txHash) || !signer || !ACCOUNT.test(signer)) {
    return Response.json({ error: "txHash and signer required" }, { status: 400 });
  }
  try {
    return Response.json(await ingestTx(txHash, signer));
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "ingest failed" }, { status: 502 });
  }
}
