//! Shared types, constants and immutable configuration.
use near_sdk::json_types::{U64, U128};
use near_sdk::{AccountId, near};

/// 1 GOOD in base units (24 decimals, NEP-141 convention on NEAR).
pub const ONE_GOOD: u128 = 1_000_000_000_000_000_000_000_000;
/// Hard cap on cumulative mint. Burned tokens are never re-mintable.
pub const MAX_SUPPLY: u128 = 1_000_000_000 * ONE_GOOD;
/// Community reward reserve (40%): unminted at genesis, minted only by `claim_reward`.
pub const REWARD_RESERVE: u128 = 400_000_000 * ONE_GOOD;
/// Public-goods treasury (25%): minted at genesis to the contract's own account.
pub const TREASURY_ALLOCATION: u128 = 250_000_000 * ONE_GOOD;
/// Liquidity + ecosystem + contributors + security (35%): unminted, released by vesting schedules.
pub const VESTED_ALLOCATION: u128 = 350_000_000 * ONE_GOOD;

pub const BPS: u128 = 10_000;
/// Treasury bucket split: community 50%, environment 30%, education & open source 20%.
pub const BUCKET_BPS: [u128; 3] = [5_000, 3_000, 2_000];
/// Max epochs settled per `settle_epochs` call (bounded gas).
pub const MAX_SETTLE_PER_CALL: u32 = 16;
/// Max page size for list views.
pub const MAX_PAGE: u32 = 100;

pub const MAX_NAME: usize = 80;
pub const MAX_CATEGORY: usize = 32;
pub const MAX_TEXT: usize = 1_000;
pub const MAX_LONG_TEXT: usize = 2_000;
pub const MAX_URI: usize = 512;
pub const MAX_LABEL: usize = 32;

#[near(serializers = [json, borsh])]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Bucket {
    Community,
    Environment,
    Education,
}

impl Bucket {
    pub const ALL: [Bucket; 3] = [Bucket::Community, Bucket::Environment, Bucket::Education];
    pub fn idx(self) -> usize {
        match self {
            Bucket::Community => 0,
            Bucket::Environment => 1,
            Bucket::Education => 2,
        }
    }
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub struct VestingSchedule {
    /// e.g. "liquidity", "ecosystem", "contributors", "security".
    pub name: String,
    pub beneficiary: AccountId,
    pub total: U128,
    /// Nothing vests before genesis + cliff.
    pub cliff_ns: U64,
    /// Linear vesting from genesis over this duration (cliff counts toward it).
    pub duration_ns: U64,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub struct GovConfig {
    /// Minimum total votes (yes + no) for a proposal to be valid.
    pub quorum: u32,
    /// Required yes share in basis points (> 5000).
    pub threshold_bps: u32,
    pub max_per_proposal: U128,
    /// Max total disbursed per epoch across all buckets.
    pub max_per_epoch: U128,
    pub min_voting_ns: U64,
    pub max_voting_ns: U64,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub struct RateLimits {
    pub submissions_per_epoch: u32,
    pub attestations_per_epoch: u32,
    pub disputes_per_epoch: u32,
}

/// Every economic parameter. Set once in `new`, readable by anyone via `get_config`,
/// and there is no method that can change it.
#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub struct Config {
    /// "production" or "demo": shown in the UI so demo parameters are never mistaken for production.
    pub label: String,
    pub epoch_duration_ns: U64,
    pub deeds_target: u32,
    pub participants_target: u32,
    pub base_reward: U128,
    /// Reward bonus per consecutive successful epoch, in bps of base (1250 = +12.5%).
    pub streak_bonus_bps: u32,
    /// Streak at which the bonus stops growing.
    pub streak_bonus_cap: u32,
    pub pg_unlock_per_success: U128,
    /// Share of the locked treasury burned when an epoch fails (10 = 0.1%).
    pub failure_burn_bps: u32,
    pub min_attestations: u32,
    pub dispute_window_ns: U64,
    pub dispute_quorum: u32,
    pub reviewer_pool: Vec<AccountId>,
    pub organizers: Vec<AccountId>,
    pub vesting: Vec<VestingSchedule>,
    pub gov: GovConfig,
    pub limits: RateLimits,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum ChallengeKind {
    Digital,
    RealWorld,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum OpenTo {
    /// Any NEAR account.
    Anyone,
    /// Only accounts that already have a finalized approved deed.
    VerifiedContributors,
}

/// Organizer-supplied challenge fields. Frozen once published.
#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub struct ChallengeInput {
    pub name: String,
    pub description: String,
    pub kind: ChallengeKind,
    /// Free-form tag (e.g. "open-source", "cleanup"): new categories need no redeploy.
    pub category: String,
    pub instructions: String,
    pub evidence_requirements: String,
    pub eligibility: String,
    pub open_to: OpenTo,
    pub start_ns: U64,
    /// Submission deadline.
    pub end_ns: U64,
    /// Attestations close at this time.
    pub verification_deadline_ns: U64,
    /// Maximum approved deeds (reward capacity).
    pub max_approved: u32,
    /// Informational progress targets (not gating, see DECISIONS D9).
    pub target_participants: u32,
    pub target_approved: u32,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum ChallengeState {
    Draft,
    Published,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub struct Challenge {
    pub id: u32,
    pub organizer: AccountId,
    pub input: ChallengeInput,
    pub state: ChallengeState,
    pub created_at: U64,
    pub published_at: Option<U64>,
    pub submissions: u32,
    pub approved: u32,
}

/// Lifecycle as seen from outside, derived from `state` and the clock.
#[near(serializers = [json])]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum ChallengePhase {
    Draft,
    /// Published, start time not reached.
    Published,
    /// Accepting submissions.
    Active,
    /// Submissions closed, attestations open.
    Verification,
    /// Verification deadline passed; outcome fixed.
    Finalized,
    /// The epoch containing the verification deadline has been settled.
    Archived,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum SubmissionStatus {
    Pending,
    Approved,
    Rejected,
    Disputed,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub struct Submission {
    pub id: U64,
    pub challenge_id: u32,
    pub account: AccountId,
    /// Lowercase hex SHA-256 of the evidence (64 chars).
    pub evidence_hash: String,
    pub evidence_uri: String,
    pub description: String,
    pub submitted_at: U64,
    pub status: SubmissionStatus,
    pub approvals: Vec<AccountId>,
    pub rejections: Vec<AccountId>,
    pub approved_at: Option<U64>,
    /// Epoch the deed counts toward (epoch of the approving attestation or of the upheld dispute).
    pub approval_epoch: Option<U64>,
    pub dispute_id: Option<U64>,
    /// Set when the outcome can no longer change.
    pub finalized_at: Option<U64>,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub struct Dispute {
    pub id: U64,
    pub submission_id: U64,
    pub opener: AccountId,
    pub reason: String,
    pub opened_at: U64,
    /// Votes that the deed is valid (keep approval).
    pub valid_votes: Vec<AccountId>,
    pub invalid_votes: Vec<AccountId>,
    /// None while open; Some(true) upheld, Some(false) overturned.
    pub outcome: Option<bool>,
    pub resolved_at: Option<U64>,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Copy, PartialEq, Eq, Debug, Default)]
pub enum EpochStatus {
    #[default]
    Open,
    Succeeded,
    /// Targets met but the reserve could not cover every reward: no partial distribution.
    SucceededNoReserve,
    Failed,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, Default)]
pub struct EpochRecord {
    pub approved_deeds: u32,
    pub participants: u32,
    pub status: EpochStatus,
    pub reward_per_participant: U128,
    pub reward_total: U128,
    pub rewards_claimed: u32,
    pub burned: U128,
    pub unlocked: U128,
    pub streak_after: u32,
    pub settled_at: Option<U64>,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, Default)]
pub struct BucketState {
    pub locked: U128,
    pub spendable: U128,
    pub disbursed: U128,
    pub burned: U128,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum ProposalStatus {
    Voting,
    Executed,
    Rejected,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub struct ProposalInput {
    pub title: String,
    pub description: String,
    pub bucket: Bucket,
    pub amount: U128,
    pub beneficiary: AccountId,
    pub beneficiary_name: String,
    pub evidence_uri: String,
    pub voting_duration_ns: U64,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub struct Proposal {
    pub id: U64,
    pub proposer: AccountId,
    pub input: ProposalInput,
    pub voting_start: U64,
    pub voting_end: U64,
    pub yes: u32,
    pub no: u32,
    pub status: ProposalStatus,
    pub executed_at: Option<U64>,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, Default)]
pub struct AccountStats {
    pub submissions: u32,
    pub approved: u32,
    pub rejected: u32,
    pub attestations: u32,
    pub disputes_opened: u32,
    pub dispute_votes: u32,
    pub proposals_voted: u32,
    pub rewards_claimed: U128,
    /// Time from which this account counts as a verified contributor
    /// (can attest, vote, enter VerifiedContributors challenges).
    pub verified_since: Option<U64>,
    /// Submission that granted `verified_since` (cleared if that deed gets disputed).
    pub verified_by_submission: Option<U64>,
    /// Epochs in which this account has at least one counted approved deed.
    pub epochs: Vec<U64>,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum ActivityKind {
    GenesisMint,
    RewardMint,
    VestingMint,
    FailureBurn,
    OtherBurn,
    TreasuryUnlock,
    TreasuryDisbursement,
    EpochSucceeded,
    EpochSucceededNoReserve,
    EpochFailed,
}

/// Append-only log entry. `block_height` lets a client locate the transaction.
#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub struct Activity {
    pub kind: ActivityKind,
    pub epoch: Option<U64>,
    pub account: Option<AccountId>,
    pub amount: U128,
    pub timestamp: U64,
    pub block_height: U64,
    pub memo: String,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, Default)]
pub struct RateCounter {
    pub submissions: u32,
    pub attestations: u32,
    pub disputes: u32,
}
