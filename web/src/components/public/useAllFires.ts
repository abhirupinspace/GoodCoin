"use client";
// Every fire 0..current_week, fetched in pages of 100 (list_fires caps a page at 100).
// Shares the [fire, "fires", from] cache with useFires(). Only the newest page polls; older pages are settled history.
import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { listFires } from "@/services/contract";
import { useStats } from "@/lib/useQueries";
import { useFireId } from "@/lib/fire-context";
import type { FireView } from "@/types/contract";

export function useAllFires(): { data: FireView[] | undefined; error: unknown; current: bigint | undefined } {
  const f = useFireId();
  const stats = useStats();
  const current = stats.data ? BigInt(stats.data.current_week) : undefined;
  const pages = current === undefined ? 0 : Number(current / 100n) + 1;
  const results = useQueries({
    queries: Array.from({ length: pages }, (_, i) => {
      const from = String(i * 100);
      const last = i === pages - 1;
      return {
        queryKey: [f, "fires", from],
        queryFn: () => listFires(from, 100, f),
        refetchInterval: last ? 30_000 : false,
        staleTime: last ? 0 : 60_000,
      } as const;
    }),
  });
  const error = stats.error ?? results.find((r) => r.error)?.error;
  const ready = pages > 0 && results.every((r) => r.data);
  const data = useMemo(() => (ready ? results.flatMap((r) => r.data as FireView[]) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, ...results.map((r) => r.dataUpdatedAt)]);
  return { data, error, current };
}

/** NEAR transferred to the cause of a caught fire: total − ⌊total·φ⌋ (exact contract rounding). */
export function toCause(total: string, feeBps: number): bigint {
  const t = BigInt(total);
  return t - (t * BigInt(feeBps)) / 10_000n;
}
/** The Hearth fee of a caught fire: ⌊total·φ⌋. */
export function hearthFee(total: string, feeBps: number): bigint {
  return (BigInt(total) * BigInt(feeBps)) / 10_000n;
}
