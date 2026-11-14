// GET /api/sync (Authorization: Bearer CRON_SECRET), every minute from a Neon Function cron trigger:
// discover factory fires, index missed transactions, refresh every fire, then run the keeper.
import { keep } from "@/server/keeper";
import { knownContracts, sync } from "@/server/indexer";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const t = Date.now();
    const indexed = await sync();
    const kept = await keep([...(await knownContracts())]);
    // The keeper's own transactions are picked up by the next run (or immediately, below).
    const after = "done" in kept && kept.done?.length ? await sync() : null;
    return Response.json({ ms: Date.now() - t, indexed, kept, after });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "sync failed" }, { status: 500 });
  }
}
