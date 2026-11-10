"use client";

import Link from "next/link";
import { Countdown } from "@/components/Countdown";
import { Loadable } from "@/components/Loadable";
import { TxButton } from "@/components/TxButton";
import { Badge, Card, ExternalLink, Good, Notice, PageHeader, Progress, Skeleton, Stat } from "@/components/ui";
import { BUCKET_LABEL } from "@/lib/constants";
import { accountUrl, CONTRACT_ID } from "@/lib/config";
import { formatBps, formatDurationNs, formatInt, nsToMs } from "@/lib/format";
import { useAccessKeys, useConfig, useEpoch, useInvariants, useStats, useSupply, useTreasury } from "@/lib/queries";
import type { Config, Stats } from "@/lib/types";
import { useNow } from "@/lib/useNow";

export function Overview() {
  const stats = useStats();
  const config = useConfig();
  return (
    <>
      <PageHeader title="Community overview">
        Each epoch the community must reach <strong>both</strong> targets: approved good deeds and unique participants.
        Success mints rewards for every participant and unlocks public-goods funding. Failure resets the streak and burns part
        of the locked treasury.
      </PageHeader>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Loadable query={stats} skeleton={<Skeleton className="h-72" />}>
            {(s) => (config.data ? <CurrentEpoch stats={s} config={config.data} /> : <Skeleton className="h-72" />)}
          </Loadable>
        </div>
        <Loadable query={stats} skeleton={<Skeleton className="h-72" />}>
          {(s) => <CommunityStats stats={s} />}
        </Loadable>
        <SupplyCard />
        <TreasurySummary />
        <IntegrityCard />
      </div>
    </>
  );
}

function CurrentEpoch({ stats, config }: { stats: Stats; config: Config }) {
  const epoch = useEpoch(stats.current_epoch);
  const now = useNow();
  const settleAt = nsToMs(stats.next_settle_at_ns) ?? Infinity;
  const canSettle = now !== null && now >= settleAt;
  const pending = Number(stats.current_epoch) - Number(stats.next_to_settle);
  const base = BigInt(config.base_reward);
  const next = BigInt(stats.next_reward_per_participant);
  // multiplier as a decimal with 3 places, computed from the two on-chain values
  const multiplierMilli = base > 0n ? Number((next * 1000n) / base) : 0;

  return (
    <Card
      title={`Epoch ${stats.current_epoch}`}
      action={
        <span className="text-sm text-muted-fg">
          ends in <Countdown toNs={stats.current_epoch_end_ns} doneLabel="now (refreshing)" />
        </span>
      }
    >
      <Loadable query={epoch} skeleton={<Skeleton className="h-16" />}>
        {(e) => {
          const deedsMet = e.record.approved_deeds >= e.deeds_target;
          const peopleMet = e.record.participants >= e.participants_target;
          return (
            <div className="space-y-3">
              <Progress label="Approved good deeds" value={e.record.approved_deeds} target={e.deeds_target} />
              <Progress label="Unique participants" value={e.record.participants} target={e.participants_target} />
              <p className="text-sm">
                {deedsMet && peopleMet ? (
                  <Badge tone="ok">Both targets met: on track to succeed</Badge>
                ) : (
                  <Badge tone="warn">Both targets must be met for the epoch to succeed</Badge>
                )}
              </p>
            </div>
          );
        }}
      </Loadable>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <Stat
          label="Reward per participant if this epoch succeeds"
          value={<Good yocto={stats.next_reward_per_participant} />}
          hint={
            <>
              <Good yocto={config.base_reward} unit={false} /> base × {(multiplierMilli / 1000).toFixed(3)} streak multiplier. Multiplier = 1 +{" "}
              {formatBps(config.streak_bonus_bps)} × min(streak, {config.streak_bonus_cap}). Projected by the contract assuming
              earlier unsettled epochs settle as their current counts imply.
            </>
          }
        />
        <Stat label="Epoch length" value={formatDurationNs(config.epoch_duration_ns)} hint={`Dispute window after each epoch: ${formatDurationNs(config.dispute_window_ns)}`} />
      </dl>

      <div className="mt-5 border-t border-border pt-4">
        <h3 className="text-sm font-semibold">Settlement</h3>
        <p className="mt-1 text-sm text-muted-fg">
          {pending > 0
            ? `${pending} finished epoch${pending === 1 ? "" : "s"} awaiting settlement (next: epoch ${stats.next_to_settle}).`
            : `Next to settle: epoch ${stats.next_to_settle}, once it ends and its dispute window closes.`}{" "}
          Anyone can settle; there is no operator.
        </p>
        <div className="mt-2">
          <TxButton
            method="settle_epochs"
            args={{}}
            disabledReason={canSettle ? null : "Not settleable yet: the epoch and its dispute window must end first."}
          >
            Settle epoch {stats.next_to_settle}
          </TxButton>
          {!canSettle && now !== null && (
            <p className="mt-1 text-xs text-muted-fg">
              Available in <Countdown toNs={stats.next_settle_at_ns} />. The contract rejects earlier calls.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function CommunityStats({ stats }: { stats: Stats }) {
  return (
    <Card title="Community">
      <dl className="grid grid-cols-2 gap-4">
        <Stat label="Current streak" value={formatInt(stats.current_streak)} hint="successful epochs in a row" />
        <Stat label="High score" value={formatInt(stats.longest_streak)} hint="longest streak ever" />
        <Stat label="Successful epochs" value={formatInt(stats.successful_epochs)} />
        <Stat label="Failed epochs" value={formatInt(stats.failed_epochs)} />
        <Stat label="Approved deeds" value={formatInt(stats.total_approved_deeds)} hint="all time" />
        <Stat label="Unique contributors" value={formatInt(stats.unique_contributors)} hint="accounts, not people" />
      </dl>
    </Card>
  );
}

function SupplyCard() {
  const supply = useSupply();
  return (
    <Card title="GOOD supply">
      <Loadable query={supply}>
        {(s) => (
          <dl className="grid grid-cols-2 gap-4">
            <Stat label="Max supply (cap on cumulative mint)" value={<Good yocto={s.max_supply} compact />} />
            <Stat label="Total supply" value={<Good yocto={s.total_supply} compact />} />
            <Stat label="Circulating" value={<Good yocto={s.circulating} compact />} hint="supply minus contract-held treasury" />
            <Stat label="Minted (incl. genesis)" value={<Good yocto={s.total_minted} compact />} />
            <Stat label="Burned" value={<Good yocto={s.total_burned} compact />} />
            <Stat label="Reward reserve left" value={<Good yocto={s.reserve_remaining} compact />} hint="unminted" />
            <Stat label="Earmarked, unclaimed" value={<Good yocto={s.reserve_earmarked_unclaimed} compact />} />
            <Stat label="Unvested allocations" value={<Good yocto={s.unvested} compact />} hint="unminted" />
          </dl>
        )}
      </Loadable>
    </Card>
  );
}

function TreasurySummary() {
  const treasury = useTreasury();
  return (
    <Card title="Public-goods treasury" action={<Link href="/treasury" className="text-sm underline underline-offset-2">Proposals</Link>}>
      <Loadable query={treasury}>
        {(t) => (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-fg">
              <tr>
                <th className="pb-1 font-medium">Bucket</th>
                <th className="pb-1 text-right font-medium">Locked</th>
                <th className="pb-1 text-right font-medium">Spendable</th>
              </tr>
            </thead>
            <tbody>
              {t.map(([bucket, b]) => (
                <tr key={bucket} className="border-t border-border">
                  <td className="py-1.5">{BUCKET_LABEL[bucket]}</td>
                  <td className="py-1.5 text-right">
                    <Good yocto={b.locked} compact unit={false} />
                  </td>
                  <td className="py-1.5 text-right">
                    <Good yocto={b.spendable} compact unit={false} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Loadable>
    </Card>
  );
}

const INVARIANT_LABELS = {
  supply_equation: "Total supply = minted − burned",
  under_cap: "Minted ≤ 1,000,000,000 GOOD cap",
  allocations_accounted: "Minted + reserve + earmarked + unvested = cap",
  treasury_backed: "Treasury buckets fully backed by contract balance",
} as const;

function IntegrityCard() {
  const inv = useInvariants();
  const keys = useAccessKeys();
  return (
    <Card title="On-chain integrity">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
        <div>
          <h3 className="text-sm font-semibold">check_invariants()</h3>
          <Loadable query={inv} skeleton={<Skeleton className="h-20" />}>
            {(i) => (
              <ul className="mt-2 space-y-1 text-sm">
                {(Object.keys(INVARIANT_LABELS) as (keyof typeof INVARIANT_LABELS)[]).map((k) => (
                  <li key={k} className="flex gap-2">
                    <span aria-hidden className={i[k] ? "text-ok" : "text-bad"}>
                      {i[k] ? "✓" : "✗"}
                    </span>
                    <span>
                      {INVARIANT_LABELS[k]} <span className="sr-only">{i[k] ? "holds" : "violated"}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Loadable>
          <p className="mt-2 text-xs text-muted-fg">Computed by the contract itself on every read; anyone can call it.</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Immutable: no admin key</h3>
          <p className="mt-1 text-sm text-muted-fg">
            Every parameter is fixed in <code>new(config)</code>. The contract has no owner, no setters and no upgrade method.
            Once the account&apos;s full-access keys are deleted, nobody can redeploy or change it.
          </p>
          <Loadable query={keys} skeleton={<Skeleton className="mt-2 h-8" />}>
            {(k) => {
              const full = k.filter((x) => x.access_key.permission === "FullAccess").length;
              return full === 0 ? (
                <Notice tone="ok">✓ 0 full-access keys on {CONTRACT_ID} (live check via view_access_key_list).</Notice>
              ) : (
                <Notice tone="warn">
                  {full} full-access key{full === 1 ? "" : "s"} still present on this account (live check), so it is not locked yet.
                  The code has no admin methods, but whoever holds the key could redeploy.
                </Notice>
              );
            }}
          </Loadable>
          <p className="mt-2 text-sm">
            Inspect: <ExternalLink href={accountUrl(CONTRACT_ID)}>{CONTRACT_ID} on NearBlocks</ExternalLink> · reviewer pool and organizers are listed on{" "}
            <Link href="/about" className="underline underline-offset-2">
              About
            </Link>
            .
          </p>
        </div>
      </div>
    </Card>
  );
}

