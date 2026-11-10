"use client";

import { useState } from "react";
import { ProposalBadge } from "@/components/badges";
import { Countdown } from "@/components/Countdown";
import { Loadable } from "@/components/Loadable";
import { TxButton } from "@/components/TxButton";
import { Account, Card, Empty, ExternalLink, Field, Good, inputClass, Notice, PageHeader, Progress, Skeleton } from "@/components/ui";
import { BUCKET_LABEL, MAX_LONG_TEXT, MAX_NAME, uriError } from "@/lib/constants";
import { decimalToUnits, formatBps, formatDurationNs, formatTimestampNs, GOOD_DECIMALS, nsToMs } from "@/lib/format";
import { useAccount, useConfig, useHasVoted, useProposals, useTreasury } from "@/lib/queries";
import type { AccountView, Bucket, Config, Proposal } from "@/lib/types";
import { useNow } from "@/lib/useNow";
import { useNear } from "@/near/NearProvider";

export function Treasury() {
  const treasury = useTreasury();
  const proposals = useProposals();
  const config = useConfig();
  const { accountId } = useNear();
  const me = useAccount(accountId).data ?? null;

  return (
    <>
      <PageHeader title="Public-goods treasury">
        250M GOOD minted at genesis to the contract itself. Each successful epoch unlocks a fixed amount (50/30/20 across buckets);
        each failed epoch burns a share of what is still locked. Funds leave only through proposals voted on by verified contributors.
      </PageHeader>
      <Notice tone="info">The contract proves the transfer happened; it cannot prove how funds were used.</Notice>

      <div className="mt-4">
        <Loadable query={treasury} skeleton={<Skeleton className="h-40" />}>
          {(t) => (
            <ul className="grid gap-4 md:grid-cols-3">
              {t.map(([bucket, b]) => (
                <li key={bucket}>
                  <Card title={BUCKET_LABEL[bucket]}>
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      {(["locked", "spendable", "disbursed", "burned"] as const).map((k) => (
                        <div key={k}>
                          <dt className="text-xs text-muted-fg capitalize">{k}</dt>
                          <dd>
                            <Good yocto={b[k]} compact />
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </Loadable>
      </div>

      {config.data && <GovRules config={config.data} />}

      {me?.verified_contributor && config.data && (
        <div className="mt-6">
          <CreateProposal config={config.data} />
        </div>
      )}

      <h2 className="mt-8 mb-3 text-lg font-semibold">Proposals</h2>
      <Loadable query={proposals} skeleton={<Skeleton className="h-40" />}>
        {(ps) =>
          ps.length === 0 ? (
            <Empty>No proposals yet. Verified contributors can create one.</Empty>
          ) : (
            <ul className="space-y-4">
              {[...ps].reverse().map((p) => (
                <li key={p.id}>{config.data && <ProposalCard p={p} config={config.data} me={me} accountId={accountId} />}</li>
              ))}
            </ul>
          )
        }
      </Loadable>
    </>
  );
}

function GovRules({ config }: { config: Config }) {
  const g = config.gov;
  return (
    <p className="mt-4 text-sm text-muted-fg">
      Rules (immutable): quorum {g.quorum} votes · passes with ≥ {formatBps(g.threshold_bps)} yes · max{" "}
      <Good yocto={g.max_per_proposal} compact /> per proposal and <Good yocto={g.max_per_epoch} compact /> per epoch · voting{" "}
      {formatDurationNs(g.min_voting_ns)} to {formatDurationNs(g.max_voting_ns)} · one account, one vote; only accounts verified before
      voting started can vote.
    </p>
  );
}

function ProposalCard({ p, config, me, accountId }: { p: Proposal; config: Config; me: AccountView | null; accountId: string | null }) {
  const now = useNow();
  const voted = useHasVoted(p.id, accountId);
  const g = config.gov;
  const total = p.yes + p.no;
  const end = nsToMs(p.voting_end) ?? 0;
  const votingOpen = p.status === "Voting" && now !== null && now < end;
  const yesBps = total ? Math.floor((p.yes * 10_000) / total) : 0;

  let voteBlock: string | null = null;
  if (accountId) {
    const since = me?.stats.verified_since;
    if (!votingOpen) voteBlock = "Voting is closed.";
    else if (!me) voteBlock = "Loading your eligibility…";
    else if (!since || BigInt(since) > BigInt(p.voting_start)) voteBlock = "Only accounts verified before voting started can vote.";
    else if (voted.data) voteBlock = "You already voted.";
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-mono text-xs text-muted-fg">#{p.id}</span>
        <ProposalBadge status={p.status} />
        <span className="text-muted-fg">{BUCKET_LABEL[p.input.bucket]}</span>
      </div>
      <h3 className="mt-1 text-base font-semibold">{p.input.title}</h3>
      <p className="mt-1 text-sm whitespace-pre-wrap">{p.input.description}</p>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-fg">Amount</dt>
          <dd>
            <Good yocto={p.input.amount} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-fg">Beneficiary</dt>
          <dd>
            {p.input.beneficiary_name} · <Account id={p.input.beneficiary} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-fg">Proposer</dt>
          <dd>
            <Account id={p.proposer} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-fg">Evidence / plan</dt>
          <dd>
            <ExternalLink href={p.input.evidence_uri} className="break-all">
              {p.input.evidence_uri}
            </ExternalLink>
          </dd>
        </div>
      </dl>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Progress label="Quorum (yes + no votes)" value={total} target={g.quorum} />
        <Progress label="Yes share vs threshold" value={yesBps} target={g.threshold_bps} met={total > 0 && yesBps >= g.threshold_bps} format={formatBps} />
      </div>
      <p className="mt-2 text-xs text-muted-fg">
        Yes {p.yes} · No {p.no} ·{" "}
        {p.status === "Voting" ? (
          <>
            voting ends in <Countdown toNs={p.voting_end} doneLabel="ended" /> ({formatTimestampNs(p.voting_end)})
          </>
        ) : p.executed_at ? (
          `executed ${formatTimestampNs(p.executed_at)}`
        ) : (
          `voting ended ${formatTimestampNs(p.voting_end)}`
        )}
      </p>
      {p.status === "Voting" && (
        <div className="mt-3 flex flex-wrap gap-4">
          {votingOpen ? (
            <>
              <TxButton method="vote_proposal" args={{ proposal_id: p.id, support: true }} disabledReason={voteBlock}>
                Vote yes
              </TxButton>
              <TxButton method="vote_proposal" args={{ proposal_id: p.id, support: false }} variant="danger" disabledReason={voteBlock} showDeposit={false}>
                Vote no
              </TxButton>
            </>
          ) : (
            <TxButton method="finalize_proposal" args={{ proposal_id: p.id }} disabledReason={now === null ? "Checking time…" : null}>
              Finalize (execute or reject)
            </TxButton>
          )}
        </div>
      )}
    </Card>
  );
}

const MINUTE_NS = 60_000_000_000n;

function CreateProposal({ config }: { config: Config }) {
  const g = config.gov;
  const minMin = Number(BigInt(g.min_voting_ns) / MINUTE_NS) || 1;
  const maxMin = Number(BigInt(g.max_voting_ns) / MINUTE_NS);
  const [f, setF] = useState({
    title: "",
    description: "",
    bucket: "Community" as Bucket,
    amount: "",
    beneficiary: "",
    beneficiary_name: "",
    evidence_uri: "",
    minutes: String(minMin),
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const amount = decimalToUnits(f.amount, GOOD_DECIMALS);
  const minutes = Number(f.minutes);
  const errors: Partial<Record<keyof typeof f, string>> = {};
  if (f.title.trim().length < 2) errors.title = "2–80 characters";
  if (!f.description.trim()) errors.description = "Required";
  if (!amount || amount <= 0n) errors.amount = "Enter a GOOD amount";
  else if (amount > BigInt(g.max_per_proposal)) errors.amount = "Above the per-proposal maximum";
  if (!/^[a-z0-9._-]{2,64}$/.test(f.beneficiary)) errors.beneficiary = "A NEAR account id, e.g. project.testnet";
  if (!f.beneficiary_name.trim()) errors.beneficiary_name = "Required";
  const uriErr = uriError(f.evidence_uri);
  if (uriErr) errors.evidence_uri = uriErr;
  if (!Number.isInteger(minutes) || minutes < minMin || minutes > maxMin) errors.minutes = `Between ${minMin} and ${maxMin} minutes`;

  const args = {
    input: {
      title: f.title.trim(),
      description: f.description.trim(),
      bucket: f.bucket,
      amount: (amount ?? 0n).toString(),
      beneficiary: f.beneficiary,
      beneficiary_name: f.beneficiary_name.trim(),
      evidence_uri: f.evidence_uri,
      voting_duration_ns: (BigInt(Number.isInteger(minutes) ? minutes : 0) * MINUTE_NS).toString(),
    },
  };

  return (
    <Card title="Create a proposal (verified contributors)">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Title" htmlFor="p-title" error={f.title ? errors.title : null}>
          <input id="p-title" className={inputClass} maxLength={MAX_NAME} value={f.title} onChange={set("title")} />
        </Field>
        <Field label="Bucket" htmlFor="p-bucket">
          <select id="p-bucket" className={inputClass} value={f.bucket} onChange={set("bucket")}>
            {(Object.keys(BUCKET_LABEL) as Bucket[]).map((b) => (
              <option key={b} value={b}>
                {BUCKET_LABEL[b]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Description" htmlFor="p-desc" error={f.description ? errors.description : null}>
          <textarea id="p-desc" rows={3} className={inputClass} maxLength={MAX_LONG_TEXT} value={f.description} onChange={set("description")} />
        </Field>
        <Field label="Amount (GOOD)" htmlFor="p-amount" error={f.amount ? errors.amount : null} hint={<>Max <Good yocto={g.max_per_proposal} compact /> per proposal</>}>
          <input id="p-amount" inputMode="decimal" className={`${inputClass} font-mono`} value={f.amount} onChange={set("amount")} />
        </Field>
        <Field label="Beneficiary account" htmlFor="p-ben" error={f.beneficiary ? errors.beneficiary : null}>
          <input id="p-ben" autoComplete="off" spellCheck={false} className={`${inputClass} font-mono`} value={f.beneficiary} onChange={(e) => setF({ ...f, beneficiary: e.target.value.trim().toLowerCase() })} />
        </Field>
        <Field label="Beneficiary name" htmlFor="p-bname" error={f.beneficiary_name ? errors.beneficiary_name : null}>
          <input id="p-bname" className={inputClass} maxLength={MAX_NAME} value={f.beneficiary_name} onChange={set("beneficiary_name")} />
        </Field>
        <Field label="Evidence / plan URL" htmlFor="p-uri" error={f.evidence_uri ? errors.evidence_uri : null}>
          <input id="p-uri" type="url" inputMode="url" className={inputClass} value={f.evidence_uri} onChange={(e) => setF({ ...f, evidence_uri: e.target.value.trim() })} />
        </Field>
        <Field label="Voting duration (minutes)" htmlFor="p-min" error={errors.minutes}>
          <input id="p-min" type="number" inputMode="numeric" min={minMin} max={maxMin} className={inputClass} value={f.minutes} onChange={set("minutes")} />
        </Field>
      </div>
      <div className="mt-4">
        <TxButton method="create_proposal" args={args} disabledReason={Object.keys(errors).length ? "Complete all fields first." : null}>
          Create proposal
        </TxButton>
      </div>
    </Card>
  );
}
