"use client";

import { useState } from "react";
import { SubmissionBadge } from "@/components/badges";
import { Countdown } from "@/components/Countdown";
import { Loadable } from "@/components/Loadable";
import { TxButton } from "@/components/TxButton";
import { Account, Badge, Button, Card, Empty, ExternalLink, Field, inputClass, Notice, PageHeader, Skeleton } from "@/components/ui";
import { MAX_TEXT } from "@/lib/constants";
import { formatTimestampNs, nsToMs } from "@/lib/format";
import { hashUrl } from "@/lib/hash";
import { useAccount, useChallenges, useConfig, useDisputes, useSubmissions } from "@/lib/queries";
import type { AccountView, ChallengeView, Config, Dispute, SubmissionView } from "@/lib/types";
import { useNow } from "@/lib/useNow";
import { useNear } from "@/near/NearProvider";

export function Verify() {
  const submissions = useSubmissions();
  const challenges = useChallenges();
  const disputes = useDisputes();
  const config = useConfig();
  const { accountId } = useNear();
  const me = useAccount(accountId).data ?? null;
  const now = useNow();

  return (
    <>
      <PageHeader title="Verification">
        A deed is approved after {config.data?.min_attestations ?? "--"} approvals from eligible attestors (reviewer pool or verified
        contributors), and rejected after the same number of rejections. Approved deeds can be disputed during the dispute window.
      </PageHeader>
      {accountId && me && !me.can_attest && (
        <div className="mb-4">
          <Notice tone="info">
            You cannot attest yet: attestors are reviewer-pool members or verified contributors (accounts with a finalized approved deed).
          </Notice>
        </div>
      )}
      <Loadable query={submissions} skeleton={<Skeleton className="h-64" />}>
        {(subs) => {
          const byChallenge = new Map((challenges.data ?? []).map((c) => [c.challenge.id, c]));
          const pending = subs.filter((s) => s.submission.status === "Pending").reverse();
          const disputable = subs
            .filter((s) => s.submission.status === "Approved" && !s.finalized && s.submission.dispute_id === null)
            .filter((s) => now === null || (nsToMs(s.dispute_window_ends_ns) ?? 0) > now)
            .reverse();
          const history = subs.filter((s) => s.finalized || s.submission.status === "Rejected").reverse();
          return (
            <div className="space-y-8">
              <Section title={`Pending (${pending.length})`}>
                {pending.length === 0 ? (
                  <Empty>Nothing waiting for attestation.</Empty>
                ) : (
                  pending.map((s) => (
                    <PendingCard key={s.submission.id} view={s} challenge={byChallenge.get(s.submission.challenge_id)} me={me} accountId={accountId} />
                  ))
                )}
              </Section>
              <Section title={`Approved, dispute window open (${disputable.length})`}>
                {disputable.length === 0 ? (
                  <Empty>No approved deeds are inside their dispute window.</Empty>
                ) : (
                  disputable.map((s) => (
                    <DisputableCard key={s.submission.id} view={s} challenge={byChallenge.get(s.submission.challenge_id)} me={me} accountId={accountId} />
                  ))
                )}
              </Section>
              <Section title="Disputes">
                <Loadable query={disputes}>
                  {(ds) =>
                    ds.length === 0 ? (
                      <Empty>No disputes have been opened.</Empty>
                    ) : (
                      [...ds].reverse().map((d) => (
                        <DisputeCard key={d.id} dispute={d} submission={subs[Number(d.submission_id)]} me={me} accountId={accountId} config={config.data} />
                      ))
                    )
                  }
                </Loadable>
              </Section>
              <Section title={`History (${history.length})`}>
                {history.length === 0 ? <Empty>No finalized outcomes yet.</Empty> : <HistoryTable rows={history} byChallenge={byChallenge} />}
              </Section>
            </div>
          );
        }}
      </Loadable>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function SubmissionSummary({ view, challenge }: { view: SubmissionView; challenge?: ChallengeView }) {
  const s = view.submission;
  return (
    <div className="space-y-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-muted-fg">#{s.id}</span>
        <SubmissionBadge status={s.status} finalized={view.finalized} />
        <span>by</span>
        <Account id={s.account} />
        <span className="text-muted-fg">· {formatTimestampNs(s.submitted_at)}</span>
      </div>
      {challenge && (
        <p>
          <span className="text-muted-fg">Challenge:</span> #{challenge.challenge.id} {challenge.challenge.input.name}{" "}
          <span className="text-muted-fg">· requires: {challenge.challenge.input.evidence_requirements}</span>
        </p>
      )}
      <p className="whitespace-pre-wrap">{s.description}</p>
      <p>
        <span className="text-muted-fg">Evidence:</span>{" "}
        <ExternalLink href={s.evidence_uri} className="break-all">
          {s.evidence_uri}
        </ExternalLink>
      </p>
      <p className="font-mono text-xs break-all text-muted-fg">sha256 {s.evidence_hash}</p>
      <RehashButton uri={s.evidence_uri} expected={s.evidence_hash} />
      <p className="text-xs text-muted-fg">
        Approvals ({s.approvals.length}): {s.approvals.length ? s.approvals.join(", ") : "none"} · Rejections ({s.rejections.length}):{" "}
        {s.rejections.length ? s.rejections.join(", ") : "none"}
      </p>
    </div>
  );
}

function RehashButton({ uri, expected }: { uri: string; expected: string }) {
  const [state, setState] = useState<{ kind: "idle" | "busy" } | { kind: "match" | "mismatch"; got: string } | { kind: "error"; msg: string }>({ kind: "idle" });
  if (!/^https?:\/\//.test(uri)) return <p className="text-xs text-muted-fg">Re-hash unavailable for non-http(s) links; hash the content yourself.</p>;
  const run = async () => {
    setState({ kind: "busy" });
    try {
      const r = await hashUrl(uri);
      setState({ kind: r.sha256 === expected ? "match" : "mismatch", got: r.sha256 });
    } catch (e) {
      setState({ kind: "error", msg: e instanceof Error ? e.message : "failed" });
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button onClick={run} disabled={state.kind === "busy"}>
        {state.kind === "busy" ? "Fetching…" : "Re-hash evidence now"}
      </Button>
      <span aria-live="polite" className="text-xs">
        {state.kind === "match" && <span className="text-ok">✓ Matches the on-chain hash.</span>}
        {state.kind === "mismatch" && (
          <span className="text-warn">
            Differs from the on-chain hash (got <span className="font-mono">{state.got.slice(0, 12)}…</span>). The content may have changed,
            or the submitter hashed a different file than the page served.
          </span>
        )}
        {state.kind === "error" && <span className="text-bad">{state.msg}</span>}
      </span>
    </div>
  );
}

function attestBlock(view: SubmissionView, challenge: ChallengeView | undefined, me: AccountView | null, accountId: string | null, now: number | null): string | null {
  if (!accountId) return null; // TxButton shows "connect"
  const s = view.submission;
  if (s.account === accountId) return "You cannot attest your own submission.";
  if (s.approvals.includes(accountId)) return "You already approved this.";
  if (s.rejections.includes(accountId)) return "You already rejected this.";
  if (!me) return "Loading your eligibility…";
  if (!me.can_attest) return "Not eligible: reviewer pool or verified contributors only.";
  const deadline = challenge ? nsToMs(challenge.challenge.input.verification_deadline_ns) : null;
  if (deadline !== null && now !== null && now >= deadline) return "The verification deadline for this challenge has passed.";
  return null;
}

function PendingCard({ view, challenge, me, accountId }: { view: SubmissionView; challenge?: ChallengeView; me: AccountView | null; accountId: string | null }) {
  const now = useNow();
  const reason = attestBlock(view, challenge, me, accountId, now);
  const id = view.submission.id;
  return (
    <Card>
      <SubmissionSummary view={view} challenge={challenge} />
      <div className="mt-4 flex flex-wrap gap-4">
        <TxButton method="attest" args={{ submission_id: id, approve: true }} disabledReason={reason}>
          Approve
        </TxButton>
        <TxButton method="attest" args={{ submission_id: id, approve: false }} variant="danger" disabledReason={reason} showDeposit={false}>
          Reject
        </TxButton>
      </div>
    </Card>
  );
}

function DisputableCard({ view, challenge, me, accountId }: { view: SubmissionView; challenge?: ChallengeView; me: AccountView | null; accountId: string | null }) {
  const [reason, setReason] = useState("");
  const s = view.submission;
  let block: string | null = null;
  if (accountId) {
    if (s.account === accountId) block = "You cannot dispute your own submission.";
    else if (!me) block = "Loading your eligibility…";
    else if (!me.can_attest) block = "Not eligible: reviewer pool or verified contributors only.";
    else if (!reason.trim()) block = "Give a reason first.";
  }
  return (
    <Card>
      <SubmissionSummary view={view} challenge={challenge} />
      <p className="mt-2 text-sm">
        Dispute window closes in {view.dispute_window_ends_ns ? <Countdown toNs={view.dispute_window_ends_ns} doneLabel="closed" /> : "--"}. Opening
        a dispute immediately removes the deed from its epoch&apos;s count until reviewers resolve it.
      </p>
      <div className="mt-3 space-y-2">
        <Field label="Reason for dispute" htmlFor={`reason-${s.id}`} hint={`${reason.length}/${MAX_TEXT}`}>
          <textarea id={`reason-${s.id}`} rows={2} maxLength={MAX_TEXT} className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <TxButton method="open_dispute" args={{ submission_id: s.id, reason: reason.trim() }} variant="danger" disabledReason={block}>
          Open dispute
        </TxButton>
      </div>
    </Card>
  );
}

function DisputeCard({
  dispute: d,
  submission,
  me,
  accountId,
  config,
}: {
  dispute: Dispute;
  submission?: SubmissionView;
  me: AccountView | null;
  accountId: string | null;
  config?: Config;
}) {
  const open = d.outcome === null;
  let block: string | null = null;
  if (accountId && open) {
    const sub = submission?.submission;
    if (!me) block = "Loading your eligibility…";
    else if (!me.is_reviewer) block = "Only reviewer-pool members resolve disputes.";
    else if (sub?.account === accountId) block = "The submitter cannot vote.";
    else if (d.opener === accountId) block = "The dispute opener cannot vote.";
    else if (sub && (sub.approvals.includes(accountId) || sub.rejections.includes(accountId))) block = "Original attestors cannot vote.";
    else if (d.valid_votes.includes(accountId) || d.invalid_votes.includes(accountId)) block = "You already voted.";
  }
  return (
    <Card>
      <div className="space-y-2 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-muted-fg">Dispute #{d.id}</span>
          {open ? <Badge tone="warn">Open</Badge> : d.outcome ? <Badge tone="ok">Upheld: deed valid</Badge> : <Badge tone="bad">Overturned: deed rejected</Badge>}
          <span>on submission #{d.submission_id}, opened by</span>
          <Account id={d.opener} />
        </div>
        <p className="whitespace-pre-wrap">&ldquo;{d.reason}&rdquo;</p>
        {submission && (
          <p>
            <span className="text-muted-fg">Evidence:</span>{" "}
            <ExternalLink href={submission.submission.evidence_uri} className="break-all">
              {submission.submission.evidence_uri}
            </ExternalLink>
          </p>
        )}
        <p className="text-xs text-muted-fg">
          Valid {d.valid_votes.length} · Invalid {d.invalid_votes.length} · resolves at {config?.dispute_quorum ?? "--"} votes on either side
          {d.resolved_at && ` · resolved ${formatTimestampNs(d.resolved_at)}`}
        </p>
      </div>
      {open && (
        <div className="mt-3 flex flex-wrap gap-4">
          <TxButton method="vote_dispute" args={{ dispute_id: d.id, valid: true }} disabledReason={block}>
            Deed is valid
          </TxButton>
          <TxButton method="vote_dispute" args={{ dispute_id: d.id, valid: false }} variant="danger" disabledReason={block} showDeposit={false}>
            Deed is invalid
          </TxButton>
        </div>
      )}
    </Card>
  );
}

function HistoryTable({ rows, byChallenge }: { rows: SubmissionView[]; byChallenge: Map<number, ChallengeView> }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[40rem] text-sm">
        <thead className="text-left text-xs text-muted-fg">
          <tr>
            <th className="p-2 font-medium">#</th>
            <th className="p-2 font-medium">Account</th>
            <th className="p-2 font-medium">Challenge</th>
            <th className="p-2 font-medium">Outcome</th>
            <th className="p-2 font-medium">Votes</th>
            <th className="p-2 font-medium">Counted in epoch</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((v) => (
            <tr key={v.submission.id} className="border-t border-border">
              <td className="p-2 font-mono text-xs">{v.submission.id}</td>
              <td className="p-2">
                <Account id={v.submission.account} max={24} />
              </td>
              <td className="p-2">{byChallenge.get(v.submission.challenge_id)?.challenge.input.name ?? `#${v.submission.challenge_id}`}</td>
              <td className="p-2">
                <SubmissionBadge status={v.submission.status} finalized={v.finalized} />
              </td>
              <td className="p-2 font-mono tabular-nums">
                {v.submission.approvals.length}✓ {v.submission.rejections.length}✗
              </td>
              <td className="p-2 font-mono tabular-nums">{v.submission.status === "Approved" ? (v.submission.approval_epoch ?? "--") : "--"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
