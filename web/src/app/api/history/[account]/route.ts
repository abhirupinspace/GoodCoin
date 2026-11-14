// GET /api/history/:account — the account's participation, read from contract views only.
// The contract has no "weeks this account gave in" view, so this scans get_gift over every week
// from 0 to the current one (bounded; fine for testnet scale) and joins each hit with get_fire.
import { fireFromRequest } from "@/lib/config";
import { getFire, getGift, getStats } from "@/services/contract";

const MAX_WEEKS = 520;

export async function GET(req: Request, { params }: { params: Promise<{ account: string }> }) {
  const { account } = await params;
  if (!/^[a-z0-9._-]{2,64}$/.test(account)) return Response.json({ error: "invalid account" }, { status: 400 });
  const fire = fireFromRequest(req);
  try {
    const stats = await getStats(fire);
    const last = Number(stats.current_week);
    const weeks = Array.from({ length: Math.min(last + 1, MAX_WEEKS) }, (_, i) => String(last - i));
    const entries = [];
    for (let i = 0; i < weeks.length; i += 12) {
      const batch = weeks.slice(i, i + 12);
      const gifts = await Promise.all(batch.map((w) => getGift(w, account, fire)));
      for (let j = 0; j < batch.length; j++) {
        if (gifts[j]) entries.push({ week: batch[j], gift: gifts[j], fire: await getFire(batch[j], fire) });
      }
    }
    return Response.json({ entries, scanned_weeks: weeks.length }, { headers: { "Cache-Control": "s-maxage=10" } });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "history unavailable" }, { status: 502 });
  }
}
