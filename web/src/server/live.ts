import "server-only";
// Whitelisted live queries. The browser asks /api/live for one by name; the server seals it (SQL and
// parameters encrypted, 60 s capability) so the client can subscribe but never read or change the query.
import { createRealtime, rawSql } from "@neon/realtime/server";
import { isValidFireId } from "@/lib/config";
import type { LiveName } from "@/lib/live-types";

let rt: ReturnType<typeof createRealtime> | null = null;
function realtime() {
  const secret = process.env.NEON_REALTIME_SECRET;
  if (!secret) throw new Error("NEON_REALTIME_SECRET is not set");
  rt ??= createRealtime({ secret, db: "neondb" });
  return rt;
}

const FEED_COLS = "receipt_id, idx, contract, block_height, ts, tx_hash, signer, event, data";

function query(name: LiveName, fire: string | null) {
  switch (name) {
    case "directory":
      return rawSql(
        `SELECT c.id, c.kind, c.label, c.creator, c.causes, c.created_at, s.streak, s.longest_streak, s.current_week,
           s.next_to_settle, s.week_ns, s.genesis_ns, s.current_fire, s.floor_ratio, s.supply, s.updated_at
         FROM contracts c JOIN snapshots s ON s.contract = c.id
         ORDER BY c.kind, c.created_at DESC, c.id`,
      );
    case "snapshot":
      return rawSql(`SELECT * FROM snapshots WHERE contract = $1`, [fire!]);
    case "fires":
      return rawSql(
        `SELECT contract, week, status, cause, givers, goal, total, data, updated_at FROM fires
         WHERE contract = $1 ORDER BY week DESC LIMIT 60`,
        [fire!],
      );
    case "feed":
      return fire
        ? rawSql(`SELECT ${FEED_COLS} FROM events WHERE standard <> 'nep141' AND contract = $1
                  ORDER BY block_height DESC, receipt_id, idx LIMIT 40`, [fire])
        : rawSql(`SELECT ${FEED_COLS} FROM events WHERE standard <> 'nep141'
                  ORDER BY block_height DESC, receipt_id, idx LIMIT 40`);
  }
}

export async function seal(name: string, fire: string | null) {
  if (!["directory", "snapshot", "fires", "feed"].includes(name)) throw new Error("unknown live query");
  if (fire !== null && !isValidFireId(fire)) throw new Error("invalid fire");
  if ((name === "snapshot" || name === "fires") && !fire) throw new Error("fire required");
  return realtime().seal({ query: query(name as LiveName, fire) });
}
