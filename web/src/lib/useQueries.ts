"use client";
// React-query hooks over contract views. Live data polls; nothing is ever hardcoded.
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { FireView, Gift } from "@/types/contract";
import * as c from "@/services/contract";

const LIVE = { refetchInterval: 8_000 } as const;

export const useStats = () => useQuery({ queryKey: ["stats"], queryFn: c.getStats, ...LIVE });
export const useCurrentFire = () => useQuery({ queryKey: ["fire", "current"], queryFn: c.currentFire, ...LIVE });
export const useFire = (week: string | undefined) =>
  useQuery({ queryKey: ["fire", week], queryFn: () => c.getFire(week!), enabled: week !== undefined });
export const useFires = (from = "0") => useQuery({ queryKey: ["fires", from], queryFn: () => c.listFires(from, 100), ...LIVE });
export const useHearth = () => useQuery({ queryKey: ["hearth"], queryFn: c.getHearth, ...LIVE });
export const useSupply = () => useQuery({ queryKey: ["supply"], queryFn: c.getSupply, ...LIVE });
export const useConfig = () => useQuery({ queryKey: ["config"], queryFn: c.getConfig, staleTime: Infinity });
export const useCauses = () => useQuery({ queryKey: ["causes"], queryFn: c.getCauses, staleTime: 60_000 });
export const useInvariants = () => useQuery({ queryKey: ["invariants"], queryFn: c.checkInvariants, ...LIVE });
export const useAccount = (a: string | null) =>
  useQuery({ queryKey: ["account", a], queryFn: () => c.getAccount(a!), enabled: !!a, ...LIVE });
export const useKindleQuote = (week: string | undefined) =>
  useQuery({ queryKey: ["kindle", week], queryFn: () => c.kindleQuote(week!), enabled: week !== undefined, ...LIVE });
export const useReport = (week: string | undefined) =>
  useQuery({ queryKey: ["report", week], queryFn: () => c.getReport(week!), enabled: week !== undefined });
export const useGift = (week: string | undefined, a: string | null) =>
  useQuery({ queryKey: ["gift", week, a], queryFn: () => c.getGift(week!, a!), enabled: week !== undefined && !!a });

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
export const useHistory = (a: string | null) =>
  useQuery({
    queryKey: ["history", a],
    enabled: !!a,
    queryFn: async () => {
      const r = await fetch(`/api/history/${encodeURIComponent(a!)}`);
      if (!r.ok) throw new Error((await r.json()).error ?? "history unavailable");
      return (await r.json()) as { entries: HistoryEntry[]; scanned_weeks: number };
    },
    refetchInterval: 30_000,
  });

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
export const useTxns = (a: string | null) =>
  useQuery({
    queryKey: ["txns", a],
    enabled: !!a,
    queryFn: async () => {
      const r = await fetch(`/api/txns/${encodeURIComponent(a!)}`);
      return (await r.json()) as { txns: TxRow[]; error: string | null; stale: boolean };
    },
    refetchInterval: 30_000,
  });
