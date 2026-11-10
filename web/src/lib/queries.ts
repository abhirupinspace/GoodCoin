"use client";

/** React Query hooks over contract views. Every number in the UI comes from one of these. */
import { useQuery } from "@tanstack/react-query";
import { view, viewAccessKeys, viewNearBalance } from "./rpc";
import type { ViewMethods } from "./types";
import { MAX_PAGE } from "./constants";
import type { TxnsResponse } from "./txns";

const LIVE = 15_000; // re-poll interval for state that changes with every transaction

/** Read every page of a `from_index`/`limit` list view. Fine at hackathon scale; an indexer would replace this. */
async function listAll<M extends "list_challenges" | "list_submissions" | "list_disputes" | "list_proposals" | "list_accounts">(
  method: M,
): Promise<ViewMethods[M]> {
  const out: unknown[] = [];
  for (let from = 0; ; from += MAX_PAGE) {
    const page = (await view(method, { from_index: from, limit: MAX_PAGE })) as unknown[];
    out.push(...page);
    if (page.length < MAX_PAGE) return out as ViewMethods[M];
  }
}

export const useConfig = () => useQuery({ queryKey: ["config"], queryFn: () => view("get_config"), staleTime: Infinity });
export const useStats = () => useQuery({ queryKey: ["stats"], queryFn: () => view("get_stats"), refetchInterval: LIVE });
export const useSupply = () => useQuery({ queryKey: ["supply"], queryFn: () => view("get_supply"), refetchInterval: LIVE });
export const useInvariants = () =>
  useQuery({ queryKey: ["invariants"], queryFn: () => view("check_invariants"), refetchInterval: LIVE });
export const useTreasury = () => useQuery({ queryKey: ["treasury"], queryFn: () => view("get_treasury"), refetchInterval: LIVE });
export const useVesting = () => useQuery({ queryKey: ["vesting"], queryFn: () => view("get_vesting"), refetchInterval: 60_000 });
export const useAccessKeys = () => useQuery({ queryKey: ["access-keys"], queryFn: () => viewAccessKeys(), staleTime: 60_000 });

export const useEpoch = (epoch: string | undefined) =>
  useQuery({
    queryKey: ["epoch", epoch],
    queryFn: () => view("get_epoch", { epoch }),
    enabled: epoch !== undefined,
    refetchInterval: LIVE,
  });
export const useEpochs = () => useQuery({ queryKey: ["epochs"], queryFn: () => view("list_epochs", {}), refetchInterval: LIVE });

export const useChallenges = () => useQuery({ queryKey: ["challenges"], queryFn: () => listAll("list_challenges"), refetchInterval: LIVE });
export const useChallenge = (id: number) =>
  useQuery({
    queryKey: ["challenge", id],
    queryFn: () => view("get_challenge", { challenge_id: id }),
    enabled: Number.isInteger(id) && id >= 0,
    refetchInterval: LIVE,
  });
export const useSubmissions = () => useQuery({ queryKey: ["submissions"], queryFn: () => listAll("list_submissions"), refetchInterval: LIVE });
export const useDisputes = () => useQuery({ queryKey: ["disputes"], queryFn: () => listAll("list_disputes"), refetchInterval: LIVE });
export const useProposals = () => useQuery({ queryKey: ["proposals"], queryFn: () => listAll("list_proposals"), refetchInterval: LIVE });
export const useAccounts = () => useQuery({ queryKey: ["accounts"], queryFn: () => listAll("list_accounts"), refetchInterval: LIVE });

export const useAccount = (accountId: string | null) =>
  useQuery({
    queryKey: ["account", accountId],
    queryFn: () => view("get_account", { account_id: accountId }),
    enabled: !!accountId,
    refetchInterval: LIVE,
  });
export const useNearBalance = (accountId: string | null) =>
  useQuery({
    queryKey: ["near-balance", accountId],
    queryFn: () => viewNearBalance(accountId as string),
    enabled: !!accountId,
  });
export const useSubmissionFor = (challengeId: number | null, accountId: string | null) =>
  useQuery({
    queryKey: ["submission-for", challengeId, accountId],
    queryFn: () => view("get_submission_for", { challenge_id: challengeId, account_id: accountId }),
    enabled: challengeId !== null && !!accountId,
    refetchInterval: LIVE,
  });
export const useHasVoted = (proposalId: string, accountId: string | null) =>
  useQuery({
    queryKey: ["has-voted", proposalId, accountId],
    queryFn: () => view("has_voted", { proposal_id: proposalId, account_id: accountId }),
    enabled: !!accountId,
  });

export const ACTIVITY_PAGE = 25;
export const useActivityCount = () =>
  useQuery({ queryKey: ["activity-count"], queryFn: () => view("activity_count"), refetchInterval: LIVE });
/** Page 0 = newest entries. The contract log is oldest-first, so pages are computed from the end. */
export const useActivityPage = (count: number | undefined, page: number) =>
  useQuery({
    queryKey: ["activity", count, page],
    enabled: count !== undefined,
    queryFn: async () => {
      const end = Math.max((count ?? 0) - page * ACTIVITY_PAGE, 0);
      const from = Math.max(end - ACTIVITY_PAGE, 0);
      if (end === 0) return [];
      const rows = await view("list_activity", { from_index: from, limit: end - from });
      return rows.map((a, i) => ({ ...a, index: from + i })).reverse();
    },
  });

export const useRecentTxns = () =>
  useQuery({
    queryKey: ["nearblocks-txns"],
    queryFn: async (): Promise<TxnsResponse> => {
      const res = await fetch("/api/txns");
      if (!res.ok) throw new Error(`/api/txns responded ${res.status}`);
      return res.json();
    },
    refetchInterval: 30_000,
  });
