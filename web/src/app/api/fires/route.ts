// GET /api/fires: the fire directory from the Neon mirror (fallback for browsers without a live connection).
import { db, hasDb } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasDb()) return Response.json({ fires: [], error: "no database" }, { status: 503 });
  try {
    const fires = await db()`
      SELECT c.id, c.kind, c.label, c.creator, c.causes, c.created_at, s.streak, s.longest_streak, s.current_week::text,
        s.next_to_settle::text, s.week_ns::text, s.genesis_ns::text, s.current_fire, s.floor_ratio, s.supply, s.updated_at
      FROM contracts c JOIN snapshots s ON s.contract = c.id ORDER BY c.kind, c.created_at DESC, c.id`;
    return Response.json({ fires }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ fires: [], error: e instanceof Error ? e.message : "unavailable" }, { status: 502 });
  }
}
