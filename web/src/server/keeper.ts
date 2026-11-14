import "server-only";
// Keeper: settle() and payout() are permissionless by design, so a small dedicated account calls them when
// they are due and fires resolve live without anyone clicking. It can only spend gas from its own balance.
import { Account } from "near-api-js";
import { RPC_URLS } from "@/lib/config";
import * as c from "@/services/contract";

const SETTLE_GAS = 150_000_000_000_000n;
const PAYOUT_GAS = 100_000_000_000_000n;
const MAX_CALLS_PER_FIRE = 2;

function keeper(): Account | null {
  const id = process.env.KEEPER_ACCOUNT;
  const key = process.env.KEEPER_KEY;
  if (!id || !key) return null;
  return new Account(id, RPC_URLS[0], key as `ed25519:${string}`);
}

export async function keep(fires: string[]) {
  const acct = keeper();
  if (!acct) return { skipped: "KEEPER_ACCOUNT/KEEPER_KEY not set" };
  const done: { fire: string; method: string; week?: string; error?: string }[] = [];
  for (const fire of fires) {
    let calls = 0;
    try {
      const stats = await c.getStats(fire);
      if (BigInt(stats.next_to_settle) < BigInt(stats.current_week) && calls < MAX_CALLS_PER_FIRE) {
        calls++;
        await acct.callFunction({ contractId: fire, methodName: "settle", args: {}, gas: SETTLE_GAS, waitUntil: "FINAL" });
        done.push({ fire, method: "settle" });
      }
      const due = (await c.getStats(fire)).due_weeks;
      for (const week of due) {
        if (calls >= MAX_CALLS_PER_FIRE) break;
        calls++;
        await acct.callFunction({ contractId: fire, methodName: "payout", args: { week }, gas: PAYOUT_GAS, waitUntil: "FINAL" });
        done.push({ fire, method: "payout", week });
      }
    } catch (e) {
      done.push({ fire, method: "error", error: e instanceof Error ? e.message.slice(0, 200) : String(e) });
    }
  }
  return { done };
}
