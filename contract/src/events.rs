//! GOODCOIN protocol events (NEP-297, standard "goodcoin"). Token movements additionally emit the
//! standard NEP-141 `ft_mint` / `ft_burn` / `ft_transfer` events.
use near_sdk::json_types::{U64, U128};
use near_sdk::{AccountId, near};

use crate::types::{Bucket, EpochStatus};

#[near(event_json(standard = "goodcoin"))]
pub enum GoodEvent {
    #[event_version("1.0.0")]
    ChallengeCreated { challenge_id: u32, organizer: AccountId },
    #[event_version("1.0.0")]
    ChallengePublished { challenge_id: u32 },
    #[event_version("1.0.0")]
    DeedSubmitted { submission_id: U64, challenge_id: u32, account: AccountId, evidence_hash: String },
    #[event_version("1.0.0")]
    Attested { submission_id: U64, attestor: AccountId, approve: bool },
    #[event_version("1.0.0")]
    DeedApproved { submission_id: U64, account: AccountId, epoch: U64 },
    #[event_version("1.0.0")]
    DeedRejected { submission_id: U64, account: AccountId },
    #[event_version("1.0.0")]
    DisputeOpened { dispute_id: U64, submission_id: U64, opener: AccountId },
    #[event_version("1.0.0")]
    DisputeVote { dispute_id: U64, reviewer: AccountId, valid: bool },
    #[event_version("1.0.0")]
    DisputeResolved { dispute_id: U64, submission_id: U64, upheld: bool },
    #[event_version("1.0.0")]
    EpochSettled {
        epoch: U64,
        status: EpochStatus,
        approved_deeds: u32,
        participants: u32,
        reward_per_participant: U128,
        reward_total: U128,
        burned: U128,
        unlocked: U128,
        streak: u32,
        longest_streak: u32,
    },
    #[event_version("1.0.0")]
    RewardClaimed { epoch: U64, account: AccountId, amount: U128 },
    #[event_version("1.0.0")]
    VestingClaimed { schedule: u32, beneficiary: AccountId, amount: U128 },
    #[event_version("1.0.0")]
    ProposalCreated { proposal_id: U64, proposer: AccountId, bucket: Bucket, amount: U128 },
    #[event_version("1.0.0")]
    ProposalVote { proposal_id: U64, voter: AccountId, support: bool },
    #[event_version("1.0.0")]
    ProposalExecuted { proposal_id: U64, beneficiary: AccountId, amount: U128 },
    #[event_version("1.0.0")]
    ProposalRejected { proposal_id: U64 },
}
