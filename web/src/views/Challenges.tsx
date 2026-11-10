"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PhaseBadge } from "@/components/badges";
import { CreateChallengeForm } from "@/components/CreateChallengeForm";
import { Loadable } from "@/components/Loadable";
import { Badge, Card, Empty, inputClass, PageHeader, Progress, Skeleton } from "@/components/ui";
import { formatTimestampNs } from "@/lib/format";
import { useAccount, useChallenges } from "@/lib/queries";
import type { ChallengeKind, ChallengeView } from "@/lib/types";
import { useNear } from "@/near/NearProvider";

export function Challenges() {
  const challenges = useChallenges();
  const { accountId } = useNear();
  const account = useAccount(accountId);
  const [kind, setKind] = useState<ChallengeKind | "all">("all");
  const [category, setCategory] = useState("all");

  const categories = useMemo(
    () => [...new Set((challenges.data ?? []).map((c) => c.challenge.input.category))].sort(),
    [challenges.data],
  );

  return (
    <>
      <PageHeader title="Challenges">
        Organizers (fixed when the contract was deployed) publish challenges. Once published, a challenge cannot be edited.
        One submission per account per challenge.
      </PageHeader>

      {account.data?.is_organizer && (
        <div className="mb-6">
          <CreateChallengeForm />
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <label className="text-sm">
          <span className="mr-2 text-muted-fg">Kind</span>
          <select className={`${inputClass} w-auto`} value={kind} onChange={(e) => setKind(e.target.value as ChallengeKind | "all")}>
            <option value="all">All</option>
            <option value="Digital">Digital</option>
            <option value="RealWorld">Real world</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mr-2 text-muted-fg">Category</span>
          <select className={`${inputClass} w-auto`} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Loadable query={challenges} skeleton={<Skeleton className="h-40" />}>
        {(list) => {
          const shown = list
            .filter((c) => kind === "all" || c.challenge.input.kind === kind)
            .filter((c) => category === "all" || c.challenge.input.category === category)
            .reverse();
          if (shown.length === 0) return <Empty>No challenges match these filters.</Empty>;
          return (
            <ul className="grid gap-4 md:grid-cols-2">
              {shown.map((c) => (
                <li key={c.challenge.id}>
                  <ChallengeCard view={c} />
                </li>
              ))}
            </ul>
          );
        }}
      </Loadable>
    </>
  );
}

function ChallengeCard({ view }: { view: ChallengeView }) {
  const c = view.challenge;
  return (
    <Card className="h-full">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <PhaseBadge phase={view.phase} />
        <Badge>{c.input.kind === "RealWorld" ? "Real world" : "Digital"}</Badge>
        <Badge>{c.input.category}</Badge>
        {c.input.open_to === "VerifiedContributors" && <Badge tone="info">Verified contributors only</Badge>}
      </div>
      <h2 className="text-base font-semibold">
        <Link href={`/challenges/${c.id}`} className="hover:underline focus-visible:outline-2 focus-visible:outline-ring">
          #{c.id} {c.input.name}
        </Link>
      </h2>
      <p className="mt-1 line-clamp-3 text-sm text-muted-fg">{c.input.description}</p>
      <div className="mt-3 space-y-2">
        <Progress label="Approved deeds (target, informational)" value={c.approved} target={c.input.target_approved} />
        <Progress label="Participants (target, informational)" value={c.submissions} target={c.input.target_participants} />
      </div>
      <p className="mt-3 text-xs text-muted-fg">Submissions close {formatTimestampNs(c.input.end_ns)}</p>
    </Card>
  );
}
