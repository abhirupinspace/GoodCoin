import type { ChallengePhase, EpochStatus, ProposalStatus, SubmissionStatus } from "@/lib/types";
import { Badge, type Tone } from "./ui";

const PHASE: Record<ChallengePhase, [Tone, string]> = {
  Draft: ["neutral", "Draft"],
  Published: ["info", "Published · not started"],
  Active: ["ok", "Active · accepting deeds"],
  Verification: ["warn", "Verification"],
  Finalized: ["accent", "Finalized"],
  Archived: ["neutral", "Archived"],
};
export const PhaseBadge = ({ phase }: { phase: ChallengePhase }) => <Badge tone={PHASE[phase][0]}>{PHASE[phase][1]}</Badge>;

const SUB: Record<SubmissionStatus, Tone> = { Pending: "warn", Approved: "ok", Rejected: "bad", Disputed: "info" };
export const SubmissionBadge = ({ status, finalized }: { status: SubmissionStatus; finalized?: boolean }) => (
  <Badge tone={SUB[status]}>
    {status}
    {status === "Approved" && finalized === false ? " · dispute window open" : ""}
    {status === "Approved" && finalized ? " · final" : ""}
  </Badge>
);

const EPOCH: Record<EpochStatus, [Tone, string]> = {
  Open: ["neutral", "Open / unsettled"],
  Succeeded: ["ok", "Succeeded"],
  SucceededNoReserve: ["warn", "Succeeded · reserve empty"],
  Failed: ["bad", "Failed"],
};
export const EpochBadge = ({ status }: { status: EpochStatus }) => <Badge tone={EPOCH[status][0]}>{EPOCH[status][1]}</Badge>;

const PROPOSAL: Record<ProposalStatus, Tone> = { Voting: "info", Executed: "ok", Rejected: "bad" };
export const ProposalBadge = ({ status }: { status: ProposalStatus }) => <Badge tone={PROPOSAL[status]}>{status}</Badge>;
