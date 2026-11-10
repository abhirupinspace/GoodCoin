"use client";

import type { ReactNode } from "react";
import { Loadable } from "@/components/Loadable";
import { Account, Card, ExternalLink, Good, PageHeader, Skeleton } from "@/components/ui";
import { accountUrl, CONTRACT_ID, REPO_URL } from "@/lib/config";
import { formatBps, formatDurationNs, rewardForStreak } from "@/lib/format";
import { useConfig } from "@/lib/queries";
import type { Config } from "@/lib/types";

const STEPS = [
  ["Organizers publish challenges", "A fixed set of organizer accounts (set at deployment) publish challenges. Published challenges are frozen."],
  ["Anyone submits a deed", "Participants link public evidence and record its SHA-256 on-chain. One submission per account per challenge."],
  ["Peers attest", "Reviewer-pool members and verified contributors approve or reject. The first side to reach the threshold decides."],
  ["Disputes", "During the dispute window any eligible attestor can dispute an approval. Reviewers who were not involved resolve it."],
  ["Anyone settles the epoch", "After an epoch and its dispute window end, anyone calls settle_epochs. Both targets met = success; otherwise failure."],
  ["Outcome", "Success: participants claim a reward (streak multiplier applies) and treasury funds unlock. Failure: streak resets and part of the locked treasury burns."],
] as const;

export function About() {
  const config = useConfig();
  return (
    <>
      <PageHeader title="Protocol transparency">
        Every parameter below is read live from <code>get_config()</code> on{" "}
        <ExternalLink href={accountUrl(CONTRACT_ID)} className="font-mono">
          {CONTRACT_ID}
        </ExternalLink>
        . The contract has no method that changes them.
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="How it works">
          <ol className="space-y-3 text-sm">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft font-mono text-xs text-accent">{i + 1}</span>
                <span>
                  <strong className="font-medium">{title}.</strong> {body}
                </span>
              </li>
            ))}
          </ol>
        </Card>

        <Card title="Limitations (read this)">
          <ul className="list-disc space-y-2 pl-5 text-sm">
            <li>
              <strong>Accounts are not humans.</strong> One person can control many NEAR accounts. &ldquo;Participants&rdquo; and
              &ldquo;contributors&rdquo; count accounts.
            </li>
            <li>
              <strong>Collusion:</strong> any group of verified attestors large enough to meet the approval threshold can approve anything.
              Verification raises the cost of fake deeds; it does not make them impossible.
            </li>
            <li>
              <strong>The reviewer pool is trusted</strong> for this MVP: it bootstraps attestation and resolves disputes.
            </li>
            <li>
              <strong>Evidence is off-chain.</strong> The hash proves which content was submitted, not that the deed happened. A changed byte
              changes the hash, so duplicate detection is easy to bypass; human attestors are the real check.
            </li>
            <li>
              <strong>Treasury:</strong> the contract proves transfers happened; it cannot prove how funds were used.
            </li>
            <li>Testnet only. GOOD on testnet has no monetary value.</li>
          </ul>
        </Card>
      </div>

      <div className="mt-4">
        <Loadable query={config} skeleton={<Skeleton className="h-96" />}>
          {(c) => <ConfigTable c={c} />}
        </Loadable>
      </div>

      <Card title="Design documents" className="mt-4">
        <ul className="space-y-1 text-sm">
          {[
            ["docs/DESIGN.md", "architecture, threat model, risk register"],
            ["docs/DECISIONS.md", "decision log (D1–D25)"],
            ["docs/SIMULATION.md", "60-day economic simulation and parameter choice"],
            ["contract/src/views.rs", "the read API this app uses"],
          ].map(([path, what]) => (
            <li key={path}>
              {REPO_URL ? (
                <ExternalLink href={`${REPO_URL}/blob/main/${path}`} className="font-mono">
                  {path}
                </ExternalLink>
              ) : (
                <code>{path}</code>
              )}{" "}
              <span className="text-muted-fg">· {what}</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

function Row({ k, v, note }: { k: string; v: ReactNode; note?: string }) {
  return (
    <tr className="border-t border-border align-top">
      <th scope="row" className="py-2 pr-4 text-left font-normal text-muted-fg">
        {k}
      </th>
      <td className="py-2">
        {v}
        {note && <div className="text-xs text-muted-fg">{note}</div>}
      </td>
    </tr>
  );
}

function ConfigTable({ c }: { c: Config }) {
  const maxReward = rewardForStreak(BigInt(c.base_reward), c.streak_bonus_cap, c.streak_bonus_bps, c.streak_bonus_cap);
  return (
    <Card title={`Parameters (label: ${c.label})`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            <Row k="Epoch length" v={formatDurationNs(c.epoch_duration_ns)} />
            <Row k="Deeds target per epoch" v={c.deeds_target} />
            <Row k="Participants target per epoch" v={c.participants_target} note="Both targets must be met." />
            <Row k="Base reward per participant" v={<Good yocto={c.base_reward} />} />
            <Row k="Streak bonus" v={`+${formatBps(c.streak_bonus_bps)} of base per prior consecutive success, capped at ${c.streak_bonus_cap}`} />
            <Row k="Maximum reward per participant" v={<Good yocto={maxReward} />} note="Base × (1 + bonus × cap), computed from the two values above." />
            <Row k="Treasury unlocked per success" v={<Good yocto={c.pg_unlock_per_success} />} note="Split 50% community / 30% environment / 20% education & open source." />
            <Row k="Burn on failure" v={`${formatBps(c.failure_burn_bps)} of the locked treasury`} />
            <Row k="Attestations to approve or reject" v={c.min_attestations} />
            <Row k="Dispute window" v={formatDurationNs(c.dispute_window_ns)} />
            <Row k="Dispute votes to resolve" v={c.dispute_quorum} />
            <Row k="Rate limits per account per epoch" v={`${c.limits.submissions_per_epoch} submissions · ${c.limits.attestations_per_epoch} attestations · ${c.limits.disputes_per_epoch} disputes`} />
            <Row
              k="Governance"
              v={
                <>
                  quorum {c.gov.quorum} · threshold {formatBps(c.gov.threshold_bps)} · max <Good yocto={c.gov.max_per_proposal} compact /> per proposal ·
                  max <Good yocto={c.gov.max_per_epoch} compact /> per epoch · voting {formatDurationNs(c.gov.min_voting_ns)}–{formatDurationNs(c.gov.max_voting_ns)}
                </>
              }
            />
            <Row k={`Reviewer pool (${c.reviewer_pool.length})`} v={<AccountList ids={c.reviewer_pool} />} />
            <Row k={`Organizers (${c.organizers.length})`} v={<AccountList ids={c.organizers} />} />
            <Row
              k="Vesting schedules"
              v={
                <ul className="space-y-1">
                  {c.vesting.map((v) => (
                    <li key={v.name}>
                      <span className="capitalize">{v.name}</span>: <Good yocto={v.total} compact /> to <Account id={v.beneficiary} />, cliff{" "}
                      {formatDurationNs(v.cliff_ns)}, linear over {formatDurationNs(v.duration_ns)} from genesis
                    </li>
                  ))}
                </ul>
              }
            />
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function AccountList({ ids }: { ids: string[] }) {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1">
      {ids.map((id) => (
        <li key={id}>
          <Account id={id} />
        </li>
      ))}
    </ul>
  );
}
