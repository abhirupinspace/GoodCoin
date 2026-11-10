"use client";

import { useState } from "react";
import { Loadable } from "@/components/Loadable";
import { TxLink } from "@/components/TxButton";
import { Account, Badge, Button, Empty, ExternalLink, Good, Notice, PageHeader, Skeleton, type Tone } from "@/components/ui";
import { accountUrl, CONTRACT_ID } from "@/lib/config";
import { formatInt, formatTimestampNs } from "@/lib/format";
import { ACTIVITY_PAGE, useActivityCount, useActivityPage, useRecentTxns } from "@/lib/queries";
import { matchTx, type TxSummary } from "@/lib/txns";
import type { Activity, ActivityKind } from "@/lib/types";

const KIND: Record<ActivityKind, [Tone, string]> = {
  GenesisMint: ["info", "Genesis mint"],
  RewardMint: ["ok", "Reward mint"],
  VestingMint: ["info", "Vesting mint"],
  FailureBurn: ["bad", "Failure burn"],
  OtherBurn: ["bad", "Burn"],
  TreasuryUnlock: ["accent", "Treasury unlock"],
  TreasuryDisbursement: ["accent", "Disbursement"],
  EpochSucceeded: ["ok", "Epoch succeeded"],
  EpochSucceededNoReserve: ["warn", "Epoch succeeded, reserve empty"],
  EpochFailed: ["bad", "Epoch failed"],
};

export function ActivityLog() {
  const count = useActivityCount();
  const [page, setPage] = useState(0);
  const rows = useActivityPage(count.data, page);
  const txns = useRecentTxns();
  const pages = Math.max(Math.ceil((count.data ?? 0) / ACTIVITY_PAGE), 1);

  return (
    <>
      <PageHeader title="Token activity">
        The contract&apos;s append-only log of every mint, burn, unlock, disbursement and settlement, newest first. Transaction links are
        matched by block height against the contract&apos;s recent transactions from NearBlocks.
      </PageHeader>
      {txns.data?.error && (
        <div className="mb-4">
          <Notice tone="warn">
            NearBlocks: {txns.data.error}. {txns.data.txns.length ? "Showing cached transaction links." : "Entries link to the contract's transaction list instead."}
          </Notice>
        </div>
      )}
      <Loadable query={rows} skeleton={<Skeleton className="h-96" />}>
        {(list) =>
          list.length === 0 ? (
            <Empty>No activity yet.</Empty>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full min-w-[48rem] text-sm">
                <thead className="text-left text-xs text-muted-fg">
                  <tr>
                    <th className="p-2 font-medium">#</th>
                    <th className="p-2 font-medium">Event</th>
                    <th className="p-2 text-right font-medium">Amount</th>
                    <th className="p-2 font-medium">Epoch</th>
                    <th className="p-2 font-medium">Account</th>
                    <th className="p-2 font-medium">Time</th>
                    <th className="p-2 font-medium">Block · tx</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((a) => (
                    <Row key={a.index} a={a} txns={txns.data?.txns ?? []} />
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </Loadable>
      <nav aria-label="Activity pages" className="mt-4 flex items-center justify-between gap-2 text-sm">
        <Button onClick={() => setPage((p) => Math.max(p - 1, 0))} disabled={page === 0}>
          Newer
        </Button>
        <span className="text-muted-fg">
          Page {page + 1} of {pages} · {formatInt(count.data ?? null)} entries
        </span>
        <Button onClick={() => setPage((p) => Math.min(p + 1, pages - 1))} disabled={page >= pages - 1}>
          Older
        </Button>
      </nav>
    </>
  );
}

function Row({ a, txns }: { a: Activity & { index: number }; txns: TxSummary[] }) {
  const tx = matchTx(a, txns);
  const [tone, label] = KIND[a.kind];
  return (
    <tr className="border-t border-border align-top">
      <td className="p-2 font-mono text-xs text-muted-fg">{a.index}</td>
      <td className="p-2">
        <Badge tone={tone}>{label}</Badge>
        {a.memo && <div className="mt-1 text-xs text-muted-fg">{a.memo}</div>}
      </td>
      <td className="p-2 text-right">{BigInt(a.amount) > 0n ? <Good yocto={a.amount} /> : <span className="text-muted-fg">--</span>}</td>
      <td className="p-2 font-mono tabular-nums">{a.epoch ?? "--"}</td>
      <td className="p-2">{a.account ? <Account id={a.account} max={24} /> : <span className="text-muted-fg">--</span>}</td>
      <td className="p-2 text-xs whitespace-nowrap">{formatTimestampNs(a.timestamp)}</td>
      <td className="p-2 text-xs">
        <span className="font-mono tabular-nums">{formatInt(a.block_height)}</span>
        <div>
          {tx ? (
            <TxLink hash={tx.hash} />
          ) : (
            <ExternalLink href={accountUrl(CONTRACT_ID)}>contract txns</ExternalLink>
          )}
        </div>
      </td>
    </tr>
  );
}
