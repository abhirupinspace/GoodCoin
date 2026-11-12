"use client";
// App-only data helpers: paged fire history, GOOD storage registration, claim planning, number helpers.
import { useQuery } from "@tanstack/react-query";
import * as c from "@/services/contract";
import type { Config, FireView, StatsView } from "@/types/contract";
import { share } from "@/lib/protocol";
import { useStats, type HistoryEntry } from "@/lib/useQueries";

const ONE = 10n ** 24n;

/** Every fire from week 0 to the current one (list_fires pages of 100, contract state). */
export function useAllFires() {
  const stats = useStats();
  const cw = stats.data?.current_week;
  return useQuery({
    queryKey: ["fires", "all", cw],
    enabled: cw !== undefined,
    queryFn: async () => {
      const last = Number(cw);
      const froms = Array.from({ length: Math.floor(last / 100) + 1 }, (_, i) => String(i * 100));
      const pages: FireView[][] = [];
      for (let i = 0; i < froms.length; i += 4) pages.push(...(await Promise.all(froms.slice(i, i + 4).map((f) => c.listFires(f, 100)))));
      return pages.flat();
    },
    refetchInterval: 30_000,
  });
}

export const useStorageMin = () => useQuery({ queryKey: ["storage", "min"], queryFn: c.storageMin, staleTime: Infinity });
export const useStorageOf = (a: string | null) =>
  useQuery({ queryKey: ["storage", "of", a], queryFn: () => c.storageOf(a!), enabled: !!a, refetchInterval: 15_000 });

/** A settled week is one the contract has already settled; later weeks have no final outcome yet. */
export const isSettled = (week: string, stats: StatsView) => BigInt(week) < BigInt(stats.next_to_settle);

/**
 * Exact GOOD share of a caught fire: ⌊M·w/Σw⌋ (claims.rs). Σw is not in FireView, but the contract keeps
 * weight_sum == total (fire.rs adds every gift to both; spark bounties only move weight between givers).
 */
export const exactShare = (fire: FireView, weight: string) =>
  BigInt(fire.total) === 0n ? 0n : share(BigInt(fire.minted), BigInt(weight), BigInt(fire.total));

export interface ClaimItem {
  week: string;
  entry: HistoryEntry;
  /** Exact GOOD the claim will mint for this week (caught, unclaimed). */
  good: bigint | null;
  /** Exact NEAR refund (smothered, unclaimed). */
  refund: bigint | null;
  /** Extinguished-carry refund may exist; amount is known only to the contract. */
  maybeCarry: boolean;
  /** ≥ 52 weeks after the fire's end: anyone may have called close(), ending GOOD claims for it. */
  maybeClosed: boolean;
}

export function planClaims(entries: HistoryEntry[], stats: StatsView, config: Config): { items: ClaimItem[]; awaiting: HistoryEntry[] } {
  const now = BigInt(stats.now_ns);
  const closeAfter = 52n * BigInt(config.week_ns);
  const items: ClaimItem[] = [];
  const awaiting: HistoryEntry[] = [];
  for (const e of entries) {
    if (!isSettled(e.week, stats)) {
      if (BigInt(e.fire.end_ns) <= now) awaiting.push(e);
      continue;
    }
    const { fire, gift } = e;
    const good = fire.outcome === "Caught" && !gift.claimed_share ? exactShare(fire, gift.weight) : null;
    const refund = fire.outcome === "Smothered" && !gift.claimed_refund ? BigInt(gift.amount) : null;
    const maybeCarry = stats.extinguished && fire.outcome === "Caught" && fire.payout === "Carried" && !gift.claimed_carry;
    if (good === null && refund === null && !maybeCarry) continue;
    items.push({ week: e.week, entry: e, good, refund, maybeCarry, maybeClosed: good !== null && now >= BigInt(fire.end_ns) + closeAfter });
  }
  return { items, awaiting };
}

/** Full-precision decimal of a 24-decimal amount, trailing zeros trimmed ("12.5"). */
export function toDecimal(raw: bigint | string): string {
  const v = BigInt(raw);
  const frac = (v % ONE).toString().padStart(24, "0").replace(/0+$/, "");
  return frac ? `${v / ONE}.${frac}` : `${v / ONE}`;
}

/** bps ratio (10000 = unchanged) → signed percentage string with 2 decimals. */
export function bpsChange(bps: string): string {
  const d = BigInt(bps) - 10_000n;
  const sign = d < 0n ? "−" : "+";
  const a = d < 0n ? -d : d;
  return `${sign}${a / 100n}.${(a % 100n).toString().padStart(2, "0")}%`;
}

/**
 * NearBlocks may return deposits as JSON numbers (e.g. 1.005e+24), which lose precision.
 * Returns the yocto value and whether it is approximate.
 */
export function indexedYocto(raw: string): { value: bigint; approx: boolean } {
  if (/^\d+$/.test(raw)) return { value: BigInt(raw), approx: false };
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return { value: 0n, approx: true };
  return { value: BigInt(n.toLocaleString("fullwide", { useGrouping: false, maximumFractionDigits: 0 })), approx: true };
}
