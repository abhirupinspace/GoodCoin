"use client";
// React-query hooks over contract views. Live data polls; nothing is ever hardcoded.
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { FireView, Gift } from "@/types/contract";
import * as c from "@/services/contract";
import { useFireId } from "@/lib/fire-context";

/** Fallback poll only: live updates arrive through Neon Realtime (LiveBridge invalidates on every change). */
const LIVE = { refetchInterval: 30_000 } as const;

export const useStats = () => {
  const f = useFireId();
  return useQuery({ queryKey: [f, "stats"], queryFn: () => c.getStats(f), ...LIVE });
};
export const useCurrentFire = () => {
  const f = useFireId();
  return useQuery({ queryKey: [f, "fire", "current"], queryFn: () => c.currentFire(f), ...LIVE });
};
export const useFire = (week: string | undefined) => {
  const f = useFireId();
  return useQuery({ queryKey: [f, "fire", week], queryFn: () => c.getFire(week!, f), enabled: week !== undefined });
};
export const useFires = (from = "0") => {
  const f = useFireId();
  return useQuery({ queryKey: [f, "fires", from], queryFn: () => c.listFires(from, 100, f), ...LIVE });
};
export const useHearth = () => {
  const f = useFireId();
  return useQuery({ queryKey: [f, "hearth"], queryFn: () => c.getHearth(f), ...LIVE });
};
export const useSupply = () => {
  const f = useFireId();
  return useQuery({ queryKey: [f, "supply"], queryFn: () => c.getSupply(f), ...LIVE });
};
export const useConfig = () => {
  const f = useFireId();
  return useQuery({ queryKey: [f, "config"], queryFn: () => c.getConfig(f), staleTime: Infinity });
};
export const useCauses = () => {
  const f = useFireId();
  return useQuery({ queryKey: [f, "causes"], queryFn: () => c.getCauses(f), staleTime: 60_000 });
};
export const useInvariants = () => {
  const f = useFireId();
  return useQuery({ queryKey: [f, "invariants"], queryFn: () => c.checkInvariants(f), ...LIVE });
};
export const useAccount = (a: string | null) => {
  const f = useFireId();
  return useQuery({ queryKey: [f, "account", a], queryFn: () => c.getAccount(a!, f), enabled: !!a, ...LIVE });
};
export const useKindleQuote = (week: string | undefined) => {
  const f = useFireId();
  return useQuery({ queryKey: [f, "kindle", week], queryFn: () => c.kindleQuote(week!, f), enabled: week !== undefined, ...LIVE });
};
export const useReport = (week: string | undefined) => {
  const f = useFireId();
  return useQuery({ queryKey: [f, "report", week], queryFn: () => c.getReport(week!, f), enabled: week !== undefined });
};
export const useGift = (week: string | undefined, a: string | null) => {
  const f = useFireId();
  return useQuery({ queryKey: [f, "gift", week, a], queryFn: () => c.getGift(week!, a!, f), enabled: week !== undefined && !!a });
};

/** Seconds-precision clock synced to chain time (now_ns from get_stats) to avoid client clock drift. */
export function useChainNow(): bigint | null {
  const { data } = useStats();
  const [offset, setOffset] = useState<bigint | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (data) setOffset(BigInt(data.now_ns) - BigInt(Date.now()) * 1_000_000n);
  }, [data]);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  void tick;
  return offset === null ? null : BigInt(Date.now()) * 1_000_000n + offset;
}

export interface HistoryEntry {
  week: string;
  fire: FireView;
  gift: Gift;
}
/** Per-account participation: /api/history/[account] scans get_gift over every settled and current week. */
export const useHistory = (a: string | null) => {
  const f = useFireId();
  return useQuery({
    queryKey: [f, "history", a],
    enabled: !!a,
    queryFn: async () => {
      const r = await fetch(`/api/history/${encodeURIComponent(a!)}?fire=${encodeURIComponent(f)}`);
      if (!r.ok) throw new Error((await r.json()).error ?? "history unavailable");
      return (await r.json()) as { entries: HistoryEntry[]; scanned_weeks: number };
    },
    refetchInterval: 30_000,
  });
};

export interface TxRow {
  hash: string;
  signer: string;
  receiver: string;
  method: string | null;
  deposit: string;
  timestamp_ns: string;
  success: boolean | null;
  args: Record<string, unknown> | null;
}
/** Indexed data: the account's transactions to the contract, from NearBlocks (labelled as indexed in the UI). */
export const useTxns = (a: string | null) => {
  const f = useFireId();
  return useQuery({
    queryKey: [f, "txns", a],
    enabled: !!a,
    queryFn: async () => {
      const r = await fetch(`/api/txns/${encodeURIComponent(a!)}?fire=${encodeURIComponent(f)}`);
      return (await r.json()) as { txns: TxRow[]; error: string | null; stale: boolean };
    },
    refetchInterval: 30_000,
  });
};
