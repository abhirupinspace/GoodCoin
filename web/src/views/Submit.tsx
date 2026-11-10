"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { SubmissionBadge } from "@/components/badges";
import { Loadable } from "@/components/Loadable";
import { TxButton } from "@/components/TxButton";
import { Button, Card, Empty, ExternalLink, Field, inputClass, Notice, PageHeader, Skeleton } from "@/components/ui";
import { isSha256Hex, MAX_TEXT, uriError } from "@/lib/constants";
import { formatTimestampNs } from "@/lib/format";
import { hashFile, hashUrl } from "@/lib/hash";
import { useAccount, useChallenges, useSubmissionFor } from "@/lib/queries";
import type { ChallengeView } from "@/lib/types";
import { useNear } from "@/near/NearProvider";

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <Card title={`${n}. ${title}`}>
      <div className="space-y-3">{children}</div>
    </Card>
  );
}

export function Submit() {
  const challenges = useChallenges();
  const params = useSearchParams();
  const router = useRouter();
  const selected = params.get("challenge");

  return (
    <>
      <PageHeader title="Submit a good deed">
        Link public evidence and record its SHA-256 on-chain. Three eligible attestors must approve it for it to count toward
        the current epoch.
      </PageHeader>
      <Loadable query={challenges} skeleton={<Skeleton className="h-64" />}>
        {(list) => {
          const active = list.filter((c) => c.phase === "Active");
          const current = active.find((c) => String(c.challenge.id) === selected) ?? null;
          return (
            <div className="space-y-4">
              <Step n={1} title="Choose a challenge">
                {active.length === 0 ? (
                  <Empty>
                    No challenge is accepting deeds right now. <Link href="/challenges" className="underline">See all challenges</Link>
                  </Empty>
                ) : (
                  <Field label="Active challenge" htmlFor="challenge">
                    <select
                      id="challenge"
                      className={inputClass}
                      value={current ? String(current.challenge.id) : ""}
                      onChange={(e) => router.replace(`/submit?challenge=${e.target.value}`)}
                    >
                      <option value="" disabled>
                        Select…
                      </option>
                      {active.map((c) => (
                        <option key={c.challenge.id} value={c.challenge.id}>
                          #{c.challenge.id} {c.challenge.input.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                {selected && !current && active.length > 0 && <Notice tone="warn">Challenge #{selected} is not accepting submissions.</Notice>}
              </Step>
              {current && <SubmitForm key={current.challenge.id} view={current} />}
            </div>
          );
        }}
      </Loadable>
    </>
  );
}

function SubmitForm({ view }: { view: ChallengeView }) {
  const c = view.challenge;
  const { accountId } = useNear();
  const account = useAccount(accountId);
  const existing = useSubmissionFor(c.id, accountId);
  const [description, setDescription] = useState("");
  const [uri, setUri] = useState("");
  const [hash, setHash] = useState("");
  const [hashSource, setHashSource] = useState<string | null>(null);
  const [hashError, setHashError] = useState<string | null>(null);
  const [hashing, setHashing] = useState(false);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setHashing(true);
    setHashError(null);
    try {
      setHash(await hashFile(file));
      setHashSource(`local file "${file.name}" (${file.size.toLocaleString()} bytes, never uploaded)`);
    } catch (e) {
      setHashError(e instanceof Error ? e.message : "Could not hash file");
    } finally {
      setHashing(false);
    }
  };

  const onFetch = async () => {
    setHashing(true);
    setHashError(null);
    try {
      const r = await hashUrl(uri);
      setHash(r.sha256);
      setHashSource(`content fetched from the URL (${r.bytes.toLocaleString()} bytes)`);
    } catch (e) {
      setHashError(e instanceof Error ? e.message : "Could not fetch URL");
    } finally {
      setHashing(false);
    }
  };

  const uriErr = uri ? uriError(uri) : null;
  const descErr = description.length > MAX_TEXT ? `At most ${MAX_TEXT} characters` : null;
  const hashErr = hash && !isSha256Hex(hash) ? "Must be 64 lowercase hex characters" : null;
  const ready = description.trim() && uri && !uriErr && !descErr && isSha256Hex(hash);
  const verifiedOnly = c.input.open_to === "VerifiedContributors";
  const blocked =
    verifiedOnly && account.data && !account.data.verified_contributor ? "This challenge is open to verified contributors only." : null;

  return (
    <>
      <Step n={2} title="Read the instructions">
        <p className="text-sm whitespace-pre-wrap">{c.input.instructions}</p>
        <p className="text-sm">
          <span className="text-muted-fg">Evidence required:</span> {c.input.evidence_requirements}
        </p>
        <p className="text-sm">
          <span className="text-muted-fg">Eligibility:</span> {c.input.eligibility}
        </p>
        <p className="text-xs text-muted-fg">Submissions close {formatTimestampNs(c.input.end_ns)}.</p>
      </Step>

      <Step n={3} title="Describe what you did">
        <Field label="Description" htmlFor="desc" error={descErr} hint={`${description.length}/${MAX_TEXT} characters. Public and permanent; do not include personal data.`}>
          <textarea id="desc" rows={4} className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </Step>

      <Step n={4} title="Link the evidence">
        <Field label="Evidence URL" htmlFor="uri" error={uriErr} hint="Public link, e.g. a GitHub PR, a photo or video. https://, http://, ipfs:// or ar://">
          <input id="uri" type="url" inputMode="url" autoComplete="url" className={inputClass} value={uri} onChange={(e) => setUri(e.target.value.trim())} placeholder="https://" />
        </Field>
      </Step>

      <Step n={5} title="Fingerprint the evidence (SHA-256)">
        <p className="text-sm text-muted-fg">
          Attestors can re-hash the link to check it was not swapped. Hash the exact file you published, or let the server fetch the
          URL and hash what it returns.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex min-h-10 cursor-pointer items-center rounded-lg border border-border px-3.5 text-sm font-medium hover:bg-muted focus-within:ring-2 focus-within:ring-ring">
            Hash a local file
            <input type="file" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          <Button onClick={onFetch} disabled={hashing || !uri || !!uriErr || !/^https?:\/\//.test(uri)}>
            Fetch &amp; hash URL
          </Button>
          {hashing && <span className="text-sm text-muted-fg">Hashing…</span>}
        </div>
        {hashError && <Notice tone="bad">{hashError}</Notice>}
        <Field label="SHA-256 (hex)" htmlFor="hash" error={hashErr} hint={hashSource ? `From ${hashSource}.` : "Or paste a hash you computed yourself."}>
          <input
            id="hash"
            className={`${inputClass} font-mono`}
            value={hash}
            spellCheck={false}
            onChange={(e) => {
              setHash(e.target.value.trim().toLowerCase());
              setHashSource(null);
            }}
          />
        </Field>
      </Step>

      <Step n={6} title="Review and submit">
        {accountId && existing.data ? (
          <SubmissionStatus submission={existing.data} />
        ) : (
          <>
            <dl className="grid gap-1 text-sm">
              <div>
                <dt className="inline text-muted-fg">Challenge: </dt>
                <dd className="inline">#{c.id} {c.input.name}</dd>
              </div>
              <div>
                <dt className="inline text-muted-fg">Evidence: </dt>
                <dd className="inline break-all">{uri || "--"}</dd>
              </div>
              <div>
                <dt className="inline text-muted-fg">SHA-256: </dt>
                <dd className="inline font-mono break-all">{hash || "--"}</dd>
              </div>
            </dl>
            <TxButton
              method="submit_deed"
              args={{ challenge_id: c.id, evidence_hash: hash, evidence_uri: uri, description: description.trim() }}
              disabledReason={blocked ?? (ready ? null : "Complete steps 3–5 first.")}
            >
              Submit deed
            </TxButton>
          </>
        )}
      </Step>
    </>
  );
}

function SubmissionStatus({ submission: s }: { submission: NonNullable<ReturnType<typeof useSubmissionFor>["data"]> }) {
  return (
    <div className="space-y-2 text-sm">
      <p>
        You have submitted to this challenge (one submission per account). Status: <SubmissionBadge status={s.submission.status} finalized={s.finalized} />
      </p>
      <p>
        {s.submission.approvals.length} approval(s), {s.submission.rejections.length} rejection(s). This page refreshes every 15 s.
      </p>
      <p>
        <ExternalLink href={s.submission.evidence_uri} className="break-all">
          {s.submission.evidence_uri}
        </ExternalLink>
      </p>
      <Link href="/verify" className="underline underline-offset-2">
        Go to verification
      </Link>
    </div>
  );
}
