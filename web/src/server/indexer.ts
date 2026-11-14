import "server-only";
// Chain → Neon mirror. Three entry points:
//   ingestTx(hash, signer)  a wallet just confirmed a tx: write its events and refresh the fire (≈1 s to every viewer)
//   sync()                  every minute: discover factory fires, pull missed txs from FastNEAR, refresh snapshots
//   refreshContract(id)     re-read a fire's views into snapshots + fires
// Writes are idempotent (upserts keyed by receipt/week), so re-running anything is safe.
import { CONTRACT, PRODUCTION_CONTRACT } from "@/lib/config";
import { ContractNotDeployedError, view } from "@/lib/rpc";
import * as c from "@/services/contract";
import type { FireView } from "@/types/contract";
import { accountTxsSince, fastTransactions, rpcTransaction } from "./chain";
import { db } from "./db";
import { extractEvents, fastReceipts, nsToIso, type EventRow, type ReceiptOutcome } from "./events";

export const FACTORY = process.env.NEXT_PUBLIC_FACTORY || "";
const GENESIS_FLOOR = 10n ** 18n; // yocto per GOOD at genesis: 1 NEAR backs 1,000,000 GOOD

interface FactoryRecord {
  id: number;
  account: string;
  creator: string;
  label: string;
  causes: { account: string; name: string; uri: string }[];
  created_ns: string;
}

export async function knownContracts(): Promise<Set<string>> {
  const rows = (await db()`SELECT id FROM contracts`) as { id: string }[];
  return new Set(rows.map((r) => r.id));
}

async function addContract(id: string, kind: string, creator: string | null, createdNs: string | null, createdTx: string | null) {
  const [config, causes] = await Promise.all([c.getConfig(id), c.getCauses(id)]);
  const created = createdNs ? nsToIso(createdNs) : nsToIso((await c.getStats(id)).genesis_ns);
  await db()`
    INSERT INTO contracts (id, kind, label, creator, config, causes, created_at, created_tx)
    VALUES (${id}, ${kind}, ${config.label}, ${creator}, ${JSON.stringify(config)}, ${JSON.stringify(causes)}, ${created}, ${createdTx})
    ON CONFLICT (id) DO UPDATE SET causes = EXCLUDED.causes`;
}

/** The two flagship deployments, always mirrored. */
async function ensureSeeds(known: Set<string>) {
  for (const [id, kind] of [[CONTRACT, "demo"], [PRODUCTION_CONTRACT, "flagship"]] as const) {
    if (!known.has(id)) {
      await addContract(id, kind, null, null, null);
      known.add(id);
    }
  }
}

/** New fires launched through the factory since the last run. */
export async function discoverFactory(known: Set<string>): Promise<string[]> {
  if (!FACTORY) return [];
  let count: number;
  try {
    count = Number(await view<number>("count", {}, FACTORY));
  } catch (e) {
    if (e instanceof ContractNotDeployedError) return [];
    throw e;
  }
  const rows = (await db()`SELECT count(*)::int AS n FROM contracts WHERE kind = 'community'`) as { n: number }[];
  const added: string[] = [];
  for (let from = rows[0].n; from < count; from += 50) {
    const recs = await view<FactoryRecord[]>("list_created", { from: String(from), limit: 50 }, FACTORY);
    for (const r of recs) {
      if (known.has(r.account)) continue;
      await addContract(r.account, "community", r.creator, r.created_ns, null);
      known.add(r.account);
      added.push(r.account);
    }
  }
  return added;
}

async function factoryDeployed() {
  try {
    await view<number>("count", {}, FACTORY);
    return true;
  } catch {
    return false;
  }
}

function status(f: FireView): string {
  if (f.outcome === "Caught") return "caught";
  if (f.outcome === "Smothered") return "smothered";
  return f.settle_pending ? "ended" : "burning";
}

/** Re-read a fire's state. Fires: full history the first time, then the unsettled window. */
export async function refreshContract(id: string) {
  const [stats, supply, hearth, current] = await Promise.all([c.getStats(id), c.getSupply(id), c.getHearth(id), c.currentFire(id)]);
  const have = (await db()`SELECT coalesce(max(week), -1)::int AS w FROM fires WHERE contract = ${id}`) as { w: number }[];
  const cw = Number(stats.current_week);
  const start = have[0].w < 0 ? 0 : Math.max(0, Math.min(Number(stats.next_to_settle), have[0].w) - 2);
  const fires: FireView[] = [];
  for (let from = start; from <= cw; from += 100) fires.push(...(await c.listFires(String(from), 100, id)));
  const now = new Date().toISOString();
  const floorRatio = Number((BigInt(hearth.floor_yocto_per_good) * 1_000_000n) / GENESIS_FLOOR) / 1_000_000;
  const week = (await c.getConfig(id)).week_ns;
  const sql = db();
  await sql.transaction([
    sql`
      INSERT INTO snapshots (contract, streak, longest_streak, current_week, next_to_settle, genesis_ns, week_ns, extinguished,
        current_fire, supply, hearth, floor_ratio, updated_at)
      VALUES (${id}, ${stats.streak}, ${stats.longest_streak}, ${cw}, ${Number(stats.next_to_settle)}, ${stats.genesis_ns}, ${week},
        ${stats.extinguished}, ${JSON.stringify(current)}, ${JSON.stringify(supply)}, ${JSON.stringify(hearth)}, ${floorRatio}, ${now})
      ON CONFLICT (contract) DO UPDATE SET streak = EXCLUDED.streak, longest_streak = EXCLUDED.longest_streak,
        current_week = EXCLUDED.current_week, next_to_settle = EXCLUDED.next_to_settle, extinguished = EXCLUDED.extinguished,
        current_fire = EXCLUDED.current_fire, supply = EXCLUDED.supply, hearth = EXCLUDED.hearth,
        floor_ratio = EXCLUDED.floor_ratio, updated_at = EXCLUDED.updated_at
      WHERE snapshots.current_fire IS DISTINCT FROM EXCLUDED.current_fire OR snapshots.streak <> EXCLUDED.streak
        OR snapshots.current_week <> EXCLUDED.current_week OR snapshots.next_to_settle <> EXCLUDED.next_to_settle
        OR snapshots.supply IS DISTINCT FROM EXCLUDED.supply OR snapshots.hearth IS DISTINCT FROM EXCLUDED.hearth`,
    ...chunk(fires, 200).map((part) => {
      const rows = part.map((f) => ({
        contract: id, week: Number(f.week), status: status(f), cause: f.cause, givers: f.givers, goal: f.goal, total: f.total, data: f,
      }));
      return sql`
        INSERT INTO fires (contract, week, status, cause, givers, goal, total, data, updated_at)
        SELECT r.contract, r.week, r.status, r.cause, r.givers, r.goal, r.total::numeric, r.data, ${now}::timestamptz
        FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb)
          AS r(contract text, week bigint, status text, cause int, givers int, goal int, total text, data jsonb)
        ON CONFLICT (contract, week) DO UPDATE SET status = EXCLUDED.status, givers = EXCLUDED.givers, goal = EXCLUDED.goal,
          total = EXCLUDED.total, data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
        WHERE fires.data IS DISTINCT FROM EXCLUDED.data`;
    }),
  ]);
  return { id, current_week: cw, fires: fires.length };
}

function chunk<T>(xs: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
}

async function writeEvents(rows: EventRow[]) {
  if (rows.length === 0) return;
  await db()`
    INSERT INTO events (receipt_id, idx, contract, block_height, ts, tx_hash, signer, standard, event, data)
    SELECT r.receipt_id, r.idx, r.contract, r.block_height, r.ts, r.tx_hash, r.signer, r.standard, r.event, r.data
    FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb)
      AS r(receipt_id text, idx int, contract text, block_height bigint, ts timestamptz, tx_hash text, signer text,
           standard text, event text, data jsonb)
    ON CONFLICT (receipt_id, idx) DO NOTHING`;
}

const watchedBy = (known: Set<string>) => (a: string) => known.has(a) || (!!FACTORY && a === FACTORY);

/** A confirmed transaction from the site's wallet flow. The body is never trusted: the tx is re-read from chain. */
export async function ingestTx(hash: string, signer: string) {
  const known = await knownContracts();
  const { tx, receipts } = await rpcTransaction(hash, signer);
  const watched = watchedBy(known);
  const touchesFactory = !!FACTORY && receipts.some((r) => r.executor === FACTORY);
  if (!receipts.some((r) => watched(r.executor))) return { ignored: true as const };
  if (touchesFactory) await discoverFactory(known);
  const rows = extractEvents(tx, receipts, watchedBy(known));
  await writeEvents(rows);
  const touched = touchedContracts(receipts, known);
  await Promise.all(touched.map(refreshContract));
  return { events: rows.length, refreshed: touched };
}

function touchedContracts(receipts: ReceiptOutcome[], known: Set<string>): string[] {
  return [...new Set(receipts.map((r) => r.executor).filter((a) => known.has(a)))];
}

/** Cron: discover, catch up on every fire's transactions, refresh everything. */
export async function sync() {
  const known = await knownContracts();
  await ensureSeeds(known);
  const discovered = await discoverFactory(known);
  const watched = watchedBy(known);
  const cursors = new Map(
    ((await db()`SELECT name, value FROM cursors`) as { name: string; value: string }[]).map((r) => [r.name, Number(r.value)]),
  );
  let events = 0;
  for (const id of [...known, ...(FACTORY ? [FACTORY] : [])]) {
    if (id === FACTORY && !(await factoryDeployed())) continue;
    const name = `tx:${id}`;
    const after = cursors.get(name) ?? 0;
    const txs = await accountTxsSince(id, after);
    if (txs.length === 0) continue;
    const full = await fastTransactions(txs.map((t) => t.transaction_hash));
    const rows = full.flatMap((t) =>
      extractEvents({ hash: t.transaction.hash, signer: t.transaction.signer_id }, fastReceipts(t), watched),
    );
    await writeEvents(rows);
    events += rows.length;
    const top = Math.max(...txs.map((t) => t.tx_block_height));
    await db()`
      INSERT INTO cursors (name, value, updated_at) VALUES (${name}, ${top}, now())
      ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`;
  }
  const refreshed = [];
  for (const id of known) {
    try {
      refreshed.push(await refreshContract(id));
    } catch (e) {
      refreshed.push({ id, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { discovered, events, refreshed };
}
