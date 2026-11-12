"use client";
// Live security evidence: access keys on the contract account and the on-chain invariants.
import { useQuery } from "@tanstack/react-query";
import { Notice, Skeleton, Stamp } from "@/components/ui";
import { CONTRACT, accountUrl } from "@/lib/config";
import { viewAccessKeys } from "@/lib/rpc";
import { useInvariants } from "@/lib/useQueries";
import type { Invariants } from "@/types/contract";

export function AccessKeys() {
  const q = useQuery({ queryKey: ["access-keys", CONTRACT], queryFn: () => viewAccessKeys(CONTRACT), refetchInterval: 30_000 });
  if (q.error) return <Notice tone="error" title="Access keys can't be read right now">{String(q.error)}</Notice>;
  if (q.data === undefined) return <Skeleton className="h-40 w-full" />;
  const locked = q.data === 0;
  return (
    <div className="frame bg-paper p-6">
      <p className="eyebrow text-ink/60">Access keys on {CONTRACT}</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <p className="display num text-8xl leading-none">{q.data}</p>
        {locked ? <Stamp tone="forest">Locked</Stamp> : <Stamp tone="red">Keys present</Stamp>}
      </div>
      <p className="mt-4 text-sm text-ink/80">
        {locked
          ? "Nobody holds a key to this account. The code cannot be redeployed, and no parameter can be changed."
          : "This account still has access keys. Until they are deleted, someone could change the deployed code."}
      </p>
      <p className="mt-3 text-xs text-ink/60">Read live via RPC <code className="font-mono">view_access_key_list</code> · <a className="underline underline-offset-2 hover:text-burnt" href={accountUrl(CONTRACT)} target="_blank" rel="noreferrer">explorer ↗</a></p>
    </div>
  );
}

const LABELS: [keyof Invariants, string, string][] = [
  ["within_cap", "Within the cap", "All GOOD minted plus all GOOD earmarked for givers is at most the maximum supply."],
  ["supply_equation", "Supply adds up", "The token's total supply equals GOOD minted minus GOOD burned."],
  ["floor_never_decreased", "The floor never decreased", "Hearth ÷ backed GOOD is at least the highest floor ever recorded."],
  ["solvent", "Solvent", "The contract holds at least the Hearth plus open escrows, payouts owed, refunds owed, carried NEAR and storage."],
];

export function InvariantsLive() {
  const q = useInvariants();
  if (q.error) return <Notice tone="error" title="Invariants can't be read right now">{String(q.error)}</Notice>;
  if (!q.data) return <div className="grid gap-4 sm:grid-cols-2">{LABELS.map(([k]) => <Skeleton key={k} className="h-36 w-full" />)}</div>;
  const d = q.data;
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {LABELS.map(([k, title, body]) => (
        <li key={k} className="frame bg-paper p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="display text-3xl">{title}</p>
            {d[k] ? <Stamp tone="forest">Holds</Stamp> : <Stamp tone="red">Fails</Stamp>}
          </div>
          <p className="mt-2 text-sm text-ink/75">{body}</p>
          <p className="mt-2 font-mono text-xs text-ink/50">{k}: {String(d[k])}</p>
        </li>
      ))}
    </ul>
  );
}
