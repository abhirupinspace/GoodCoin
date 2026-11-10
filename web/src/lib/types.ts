/**
 * TypeScript mirror of contract/src/types.rs and the view structs in contract/src/views.rs.
 *
 * JSON encoding rules (near-sdk):
 * - `U64` / `U128` are decimal strings. Convert with `BigInt(x)`; never `Number(x)` for balances.
 * - Balances are yocto-GOOD (24 decimals). Timestamps and durations are nanoseconds.
 * - Plain `u32` fields are JSON numbers.
 * - Unit-only Rust enums serialize as their variant name string.
 * - `Option<T>` is `T | null`.
 */

export type U64 = string;
export type U128 = string;
export type AccountId = string;

// ---------------------------------------------------------------- types.rs

export type Bucket = "Community" | "Environment" | "Education";

export interface VestingSchedule {
  name: string;
  beneficiary: AccountId;
  total: U128;
  cliff_ns: U64;
  duration_ns: U64;
}

export interface GovConfig {
  quorum: number;
  threshold_bps: number;
  max_per_proposal: U128;
  max_per_epoch: U128;
  min_voting_ns: U64;
  max_voting_ns: U64;
}

export interface RateLimits {
  submissions_per_epoch: number;
  attestations_per_epoch: number;
  disputes_per_epoch: number;
}

export interface Config {
  label: string;
  epoch_duration_ns: U64;
  deeds_target: number;
  participants_target: number;
  base_reward: U128;
  streak_bonus_bps: number;
  streak_bonus_cap: number;
  pg_unlock_per_success: U128;
  failure_burn_bps: number;
  min_attestations: number;
  dispute_window_ns: U64;
  dispute_quorum: number;
  reviewer_pool: AccountId[];
  organizers: AccountId[];
  vesting: VestingSchedule[];
  gov: GovConfig;
  limits: RateLimits;
}

export type ChallengeKind = "Digital" | "RealWorld";
export type OpenTo = "Anyone" | "VerifiedContributors";

export interface ChallengeInput {
  name: string;
  description: string;
  kind: ChallengeKind;
  category: string;
  instructions: string;
  evidence_requirements: string;
  eligibility: string;
  open_to: OpenTo;
  start_ns: U64;
  end_ns: U64;
  verification_deadline_ns: U64;
  max_approved: number;
  target_participants: number;
  target_approved: number;
}

export type ChallengeState = "Draft" | "Published";

export interface Challenge {
  id: number;
  organizer: AccountId;
  input: ChallengeInput;
  state: ChallengeState;
  created_at: U64;
  published_at: U64 | null;
  submissions: number;
  approved: number;
}

export type ChallengePhase = "Draft" | "Published" | "Active" | "Verification" | "Finalized" | "Archived";

export type SubmissionStatus = "Pending" | "Approved" | "Rejected" | "Disputed";

export interface Submission {
  id: U64;
  challenge_id: number;
  account: AccountId;
  /** Lowercase hex SHA-256 (64 chars). */
  evidence_hash: string;
  evidence_uri: string;
  description: string;
  submitted_at: U64;
  status: SubmissionStatus;
  approvals: AccountId[];
  rejections: AccountId[];
  approved_at: U64 | null;
  approval_epoch: U64 | null;
  dispute_id: U64 | null;
  finalized_at: U64 | null;
}

export interface Dispute {
  id: U64;
  submission_id: U64;
  opener: AccountId;
  reason: string;
  opened_at: U64;
  valid_votes: AccountId[];
  invalid_votes: AccountId[];
  /** null while open; true = upheld (deed valid), false = overturned. */
  outcome: boolean | null;
  resolved_at: U64 | null;
}

export type EpochStatus = "Open" | "Succeeded" | "SucceededNoReserve" | "Failed";

export interface EpochRecord {
  approved_deeds: number;
  participants: number;
  status: EpochStatus;
  reward_per_participant: U128;
  reward_total: U128;
  rewards_claimed: number;
  burned: U128;
  unlocked: U128;
  streak_after: number;
  settled_at: U64 | null;
}

export interface BucketState {
  locked: U128;
  spendable: U128;
  disbursed: U128;
  burned: U128;
}

export type ProposalStatus = "Voting" | "Executed" | "Rejected";

export interface ProposalInput {
  title: string;
  description: string;
  bucket: Bucket;
  amount: U128;
  beneficiary: AccountId;
  beneficiary_name: string;
  evidence_uri: string;
  voting_duration_ns: U64;
}

export interface Proposal {
  id: U64;
  proposer: AccountId;
  input: ProposalInput;
  voting_start: U64;
  voting_end: U64;
  yes: number;
  no: number;
  status: ProposalStatus;
  executed_at: U64 | null;
}

export interface AccountStats {
  submissions: number;
  approved: number;
  rejected: number;
  attestations: number;
  disputes_opened: number;
  dispute_votes: number;
  proposals_voted: number;
  rewards_claimed: U128;
  verified_since: U64 | null;
  verified_by_submission: U64 | null;
  epochs: U64[];
}

export type ActivityKind =
  | "GenesisMint"
  | "RewardMint"
  | "VestingMint"
  | "FailureBurn"
  | "OtherBurn"
  | "TreasuryUnlock"
  | "TreasuryDisbursement"
  | "EpochSucceeded"
  | "EpochSucceededNoReserve"
  | "EpochFailed";

export interface Activity {
  kind: ActivityKind;
  epoch: U64 | null;
  account: AccountId | null;
  amount: U128;
  timestamp: U64;
  block_height: U64;
  memo: string;
}

// ---------------------------------------------------------------- views.rs

export interface Stats {
  label: string;
  genesis_ns: U64;
  now_ns: U64;
  current_epoch: U64;
  current_epoch_start_ns: U64;
  current_epoch_end_ns: U64;
  next_to_settle: U64;
  next_settle_at_ns: U64;
  current_streak: number;
  longest_streak: number;
  successful_epochs: number;
  failed_epochs: number;
  total_approved_deeds: U64;
  unique_contributors: U64;
  challenges: number;
  submissions: U64;
  disputes: U64;
  proposals: U64;
  accounts: number;
  next_reward_per_participant: U128;
}

export interface Supply {
  max_supply: U128;
  total_supply: U128;
  total_minted: U128;
  total_burned: U128;
  circulating: U128;
  treasury_held: U128;
  reserve_remaining: U128;
  reserve_earmarked_unclaimed: U128;
  unvested: U128;
  vested_unclaimed: U128;
  mint_headroom: U128;
}

export interface Invariants {
  supply_equation: boolean;
  under_cap: boolean;
  allocations_accounted: boolean;
  treasury_backed: boolean;
}

export interface EpochView {
  epoch: U64;
  start_ns: U64;
  end_ns: U64;
  settleable_at_ns: U64;
  deeds_target: number;
  participants_target: number;
  record: EpochRecord;
}

export interface ChallengeView {
  challenge: Challenge;
  phase: ChallengePhase;
}

export interface SubmissionView {
  submission: Submission;
  finalized: boolean;
  dispute_window_ends_ns: U64 | null;
}

export interface AccountView {
  account: AccountId;
  stats: AccountStats;
  is_reviewer: boolean;
  is_organizer: boolean;
  verified_contributor: boolean;
  can_attest: boolean;
  good_balance: U128;
  registered: boolean;
  claimable_epochs: U64[];
}

export interface VestingView {
  index: number;
  schedule: VestingSchedule;
  vested: U128;
  claimed: U128;
}

/** `get_treasury` returns Rust tuples, which serialize as 2-element arrays. */
export type TreasuryView = [Bucket, BucketState][];
/** `list_accounts` likewise. */
export type AccountRow = [AccountId, AccountStats];

/** Return types of every view method the app calls, keyed by method name. */
export interface ViewMethods {
  get_config: Config;
  get_stats: Stats;
  get_supply: Supply;
  check_invariants: Invariants;
  get_treasury: TreasuryView;
  get_epoch: EpochView;
  list_epochs: EpochView[];
  get_challenge: ChallengeView | null;
  list_challenges: ChallengeView[];
  get_submission: SubmissionView | null;
  list_submissions: SubmissionView[];
  get_submission_for: SubmissionView | null;
  list_disputes: Dispute[];
  list_proposals: Proposal[];
  has_voted: boolean;
  get_account: AccountView;
  list_accounts: AccountRow[];
  activity_count: number;
  list_activity: Activity[];
  get_vesting: VestingView[];
}
