"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { PhaseBadge, SubmissionBadge } from "@/components/badges";
import { Loadable } from "@/components/Loadable";
import { TxButton } from "@/components/TxButton";
import { Account, Badge, Card, Empty, ExternalLink, Notice, PageHeader, Progress, Skeleton } from "@/components/ui";
import { formatTimestampNs } from "@/lib/format";
import { useChallenge, useSubmissionFor, useSubmissions } from "@/lib/queries";
import type { ChallengeView } from "@/lib/types";
import { useNear } from "@/near/NearProvider";

export function ChallengeDetail() {
  const params = useParams<{ id: string }>();
  const id = /^\d+$/.test(params.id) ? Number(params.id) : -1;
  const challenge = useChallenge(id);
  if (id < 0) return <Empty>Invalid challenge id.</Empty>;
  return (
    <Loadable query={challenge} skeleton={<Skeleton className="h-96" />}>
      {(view) =>
        view ? (
          <Detail view={view} />
        ) : (
          <Empty>
            Challenge #{id} does not exist. <Link href="/challenges" className="underline">All challenges</Link>
          </Empty>
        )
      }
    </Loadable>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-t border-border py-2 sm:grid-cols-[12rem_1fr]">
      <dt className="text-sm text-muted-fg">{label}</dt>
      <dd className="text-sm whitespace-pre-wrap">{children}</dd>
    </div>
  );
}

function Detail({ view }: { view: ChallengeView }) {
  const c = view.challenge;
  const i = c.input;
  const { accountId } = useNear();
  const mine = useSubmissionFor(c.id, accountId);
  const submissions = useSubmissions();
  const isOwner = accountId === c.organizer;

  return (
    <>
      <PageHeader title={`#${c.id} ${i.name}`}>
        <span className="flex flex-wrap gap-2">
          <PhaseBadge phase={view.phase} />
          <Badge>{i.kind === "RealWorld" ? "Real world" : "Digital"}</Badge>
          <Badge>{i.category}</Badge>
        </span>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Details" className="lg:col-span-2">
          <dl>
            <Row label="Description">{i.description}</Row>
            <Row label="Instructions">{i.instructions}</Row>
            <Row label="Evidence requirements">{i.evidence_requirements}</Row>
            <Row label="Eligibility">
              {i.eligibility}
              {i.open_to === "VerifiedContributors" && " (enforced: verified contributors only)"}
            </Row>
            <Row label="Organizer">
              <Account id={c.organizer} />
            </Row>
            <Row label="Starts">{formatTimestampNs(i.start_ns)}</Row>
            <Row label="Submissions close">{formatTimestampNs(i.end_ns)}</Row>
            <Row label="Attestations close">{formatTimestampNs(i.verification_deadline_ns)}</Row>
            <Row label="Max approved deeds">{i.max_approved}</Row>
          </dl>
        </Card>

        <div className="space-y-4">
          <Card title="Progress">
            <div className="space-y-3">
              <Progress label="Approved deeds" value={c.approved} target={i.target_approved} />
              <Progress label="Participants (one submission each)" value={c.submissions} target={i.target_participants} />
            </div>
            <p className="mt-2 text-xs text-muted-fg">Challenge targets are informational. Rewards depend only on the epoch-wide targets.</p>
          </Card>

          <Card title="Your submission">
            {!accountId && <p className="text-sm text-muted-fg">Connect a wallet to see your submission.</p>}
            {accountId && (
              <Loadable query={mine} skeleton={<Skeleton className="h-10" />}>
                {(s) =>
                  s ? (
                    <div className="space-y-1 text-sm">
                      <SubmissionBadge status={s.submission.status} finalized={s.finalized} />
                      <p>
                        {s.submission.approvals.length} approvals · {s.submission.rejections.length} rejections
                      </p>
                      <ExternalLink href={s.submission.evidence_uri} className="break-all">
                        Evidence
                      </ExternalLink>
                    </div>
                  ) : view.phase === "Active" ? (
                    <Link href={`/submit?challenge=${c.id}`} className="inline-flex min-h-10 items-center rounded-lg bg-accent px-3.5 text-sm font-medium text-accent-fg">
                      Submit a deed
                    </Link>
                  ) : (
                    <p className="text-sm text-muted-fg">No submission. This challenge is not accepting deeds right now.</p>
                  )
                }
              </Loadable>
            )}
          </Card>

          {c.state === "Draft" && (
            <Card title="Draft">
              {isOwner ? (
                <TxButton method="publish_challenge" args={{ challenge_id: c.id }}>
                  Publish (freezes all fields)
                </TxButton>
              ) : (
                <Notice>Only the organizer who created this draft can publish it.</Notice>
              )}
            </Card>
          )}
        </div>

        <Card title="Submissions" className="lg:col-span-3">
          <Loadable query={submissions}>
            {(all) => {
              const subs = all.filter((s) => s.submission.challenge_id === c.id).reverse();
              if (subs.length === 0) return <Empty>No submissions yet.</Empty>;
              return (
                <ul className="divide-y divide-border">
                  {subs.map((s) => (
                    <li key={s.submission.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                      <span className="font-mono text-xs text-muted-fg">#{s.submission.id}</span>
                      <Account id={s.submission.account} />
                      <SubmissionBadge status={s.submission.status} finalized={s.finalized} />
                      <span className="min-w-0 flex-1 truncate text-muted-fg">{s.submission.description}</span>
                    </li>
                  ))}
                </ul>
              );
            }}
          </Loadable>
        </Card>
      </div>
    </>
  );
}
