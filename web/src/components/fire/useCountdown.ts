"use client";
import { useChainNow } from "@/lib/useQueries";

/** Seconds left until `endNs`, on chain time. null while loading. */
export function useCountdown(endNs: string | undefined): number | null {
  const now = useChainNow();
  if (!endNs || now === null) return null;
  const left = (BigInt(endNs) - now) / 1_000_000_000n;
  return left > 0n ? Number(left) : 0;
}
