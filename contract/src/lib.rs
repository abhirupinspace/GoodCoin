//! # GOODCOIN — Proof of Good
//!
//! A NEP-141 memecoin whose supply reacts to collective, peer-verified good deeds.
//!
//! * Every 7-day epoch (time-derived, no admin) the community must reach BOTH an approved-deeds
//!   target and a unique-participants target.
//! * Success: every counted participant may claim `base_reward × streak multiplier` GOOD (minted from
//!   the unminted 400M reserve), a fixed slice of the public-goods treasury unlocks for proposals,
//!   and the community streak grows.
//! * Failure: nothing is minted, the streak resets, and 0.1% of the locked treasury is burned.
//!
//! All parameters are fixed in `new`. There is no owner, no setter, no upgrade method; the deploy
//! script deletes every full-access key after initialization.
//!
//! Modules: [`deeds`] challenges & submissions · [`verify`] attestations & disputes ·
//! [`epoch`] settlement, rewards, streak · [`treasury`] buckets & governance ·
//! [`vesting`] non-protocol allocations · [`views`] read API · [`token`] NEP-141/145/148.

pub mod deeds;
pub mod epoch;
pub mod events;
pub mod token;
pub mod treasury;
pub mod types;
pub mod verify;
pub mod vesting;
pub mod views;

#[cfg(test)]
mod tests;

use near_contract_standards::fungible_token::FungibleToken;
use near_contract_standards::fungible_token::events::{FtBurn, FtMint};
use near_contract_standards::fungible_token::metadata::{FT_METADATA_SPEC, FungibleTokenMetadata};
use near_sdk::json_types::{U64, U128};
use near_sdk::store::{LookupMap, LookupSet, Vector};
use near_sdk::{
    AccountId, BorshStorageKey, NearToken, PanicOnDefault, Promise, env, near, require,
};

use crate::types::*;

#[near]
#[derive(BorshStorageKey)]
pub enum StorageKey {
    FtAccounts,
    Challenges,
    Submissions,
    SubmissionByChallengeAccount,
    EvidenceHashes,
    Stats,
    AccountIndex,
    Epochs,
    EpochParticipant,
    Claimed,
    Disputes,
    Proposals,
    ProposalVotes,
    EpochFunding,
    Activity,
    Rate,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    pub(crate) token: FungibleToken,
    pub(crate) metadata: FungibleTokenMetadata,
    pub(crate) config: Config,
    pub(crate) genesis_ns: u64,

    // ---- supply accounting (S(t) = S(0) + M(t) − B(t)) ----
    /// Cumulative minted, including genesis. Never decreases. ≤ MAX_SUPPLY.
    pub(crate) total_minted: u128,
    pub(crate) total_burned: u128,
    /// Unminted reward reserve not yet earmarked.
    pub(crate) reserve_remaining: u128,
    /// Earmarked for successful epochs, not yet claimed (unminted).
    pub(crate) reserve_earmarked: u128,
    pub(crate) vesting_claimed: Vec<u128>,

    // ---- treasury ----
    pub(crate) buckets: Vec<BucketState>,

    // ---- deeds & verification ----
    pub(crate) challenges: Vector<Challenge>,
    pub(crate) submissions: Vector<Submission>,
    pub(crate) submission_by_challenge_account: LookupMap<(u32, AccountId), u64>,
    pub(crate) evidence_hashes: LookupMap<String, u64>,
    pub(crate) disputes: Vector<Dispute>,
    pub(crate) stats: LookupMap<AccountId, AccountStats>,
    pub(crate) account_index: Vector<AccountId>,
    pub(crate) rate: LookupMap<(u64, AccountId), RateCounter>,

    // ---- epochs ----
    pub(crate) epochs: LookupMap<u64, EpochRecord>,
    /// Counted approved deeds per (epoch, account).
    pub(crate) epoch_participant: LookupMap<(u64, AccountId), u32>,
    pub(crate) claimed: LookupSet<(u64, AccountId)>,
    /// Next epoch to settle; all epochs below it are settled.
    pub(crate) next_to_settle: u64,
    pub(crate) streak: u32,
    pub(crate) longest_streak: u32,
    pub(crate) successful_epochs: u32,
    pub(crate) failed_epochs: u32,
    pub(crate) total_approved: u64,
    pub(crate) unique_contributors: u64,

    // ---- governance ----
    pub(crate) proposals: Vector<Proposal>,
    pub(crate) proposal_votes: LookupSet<(u64, AccountId)>,
    pub(crate) epoch_funding: LookupMap<u64, u128>,

    // ---- transparency ----
    pub(crate) activity: Vector<Activity>,
}

#[near]
impl Contract {
    /// One-time initialization. Validates the full configuration; nothing can change it afterwards.
    #[init]
    pub fn new(config: Config, icon: Option<String>) -> Self {
        validate_config(&config);
        let genesis_ns = env::block_timestamp();
        let me = env::current_account_id();

        let mut token = FungibleToken::new(StorageKey::FtAccounts);
        token.internal_register_account(&me);
        token.internal_deposit(&me, TREASURY_ALLOCATION);

        let buckets = BUCKET_BPS
            .iter()
            .map(|bps| BucketState {
                locked: U128(TREASURY_ALLOCATION * bps / BPS),
                ..Default::default()
            })
            .collect();

        let vesting_claimed = vec![0u128; config.vesting.len()];
        let mut this = Self {
            token,
            metadata: FungibleTokenMetadata {
                spec: FT_METADATA_SPEC.to_string(),
                name: "GOODCOIN".to_string(),
                symbol: "GOOD".to_string(),
                icon,
                reference: None,
                reference_hash: None,
                decimals: 24,
            },
            config,
            genesis_ns,
            total_minted: TREASURY_ALLOCATION,
            total_burned: 0,
            reserve_remaining: REWARD_RESERVE,
            reserve_earmarked: 0,
            vesting_claimed,
            buckets,
            challenges: Vector::new(StorageKey::Challenges),
            submissions: Vector::new(StorageKey::Submissions),
            submission_by_challenge_account: LookupMap::new(
                StorageKey::SubmissionByChallengeAccount,
            ),
            evidence_hashes: LookupMap::new(StorageKey::EvidenceHashes),
            disputes: Vector::new(StorageKey::Disputes),
            stats: LookupMap::new(StorageKey::Stats),
            account_index: Vector::new(StorageKey::AccountIndex),
            rate: LookupMap::new(StorageKey::Rate),
            epochs: LookupMap::new(StorageKey::Epochs),
            epoch_participant: LookupMap::new(StorageKey::EpochParticipant),
            claimed: LookupSet::new(StorageKey::Claimed),
            next_to_settle: 0,
            streak: 0,
            longest_streak: 0,
            successful_epochs: 0,
            failed_epochs: 0,
            total_approved: 0,
            unique_contributors: 0,
            proposals: Vector::new(StorageKey::Proposals),
            proposal_votes: LookupSet::new(StorageKey::ProposalVotes),
            epoch_funding: LookupMap::new(StorageKey::EpochFunding),
            activity: Vector::new(StorageKey::Activity),
        };
        FtMint { owner_id: &me, amount: U128(TREASURY_ALLOCATION), memo: Some("genesis-treasury") }
            .emit();
        this.log_activity(ActivityKind::GenesisMint, None, Some(me), TREASURY_ALLOCATION, "public-goods treasury");
        this
    }
}

pub(crate) fn validate_config(c: &Config) {
    require!(!c.label.is_empty() && c.label.len() <= MAX_LABEL, "label: 1-32 chars");
    require!(c.epoch_duration_ns.0 > 0, "epoch_duration_ns must be > 0");
    require!(c.deeds_target > 0 && c.participants_target > 0, "targets must be > 0");
    require!(
        c.deeds_target >= c.participants_target,
        "deeds_target must be >= participants_target (each participant has >= 1 deed)"
    );
    require!(c.base_reward.0 > 0, "base_reward must be > 0");
    require!(c.streak_bonus_bps <= 10_000, "streak_bonus_bps <= 10000");
    require!(c.streak_bonus_cap <= 100, "streak_bonus_cap <= 100");
    require!(c.failure_burn_bps <= 1_000, "failure_burn_bps <= 1000 (10%)");
    require!(c.min_attestations >= 1, "min_attestations >= 1");
    require!(c.dispute_quorum >= 1, "dispute_quorum >= 1");
    require!(
        c.dispute_window_ns.0 > 0 && c.dispute_window_ns.0 <= c.epoch_duration_ns.0,
        "0 < dispute_window_ns <= epoch_duration_ns"
    );
    let mut pool = c.reviewer_pool.clone();
    pool.sort();
    pool.dedup();
    require!(pool.len() == c.reviewer_pool.len(), "reviewer_pool has duplicates");
    require!(
        c.reviewer_pool.len() as u32 >= c.min_attestations + c.dispute_quorum + 1,
        "reviewer_pool must be >= min_attestations + dispute_quorum + 1 so disputes are always resolvable"
    );
    require!(!c.organizers.is_empty(), "organizers must not be empty");
    let vest_total: u128 = c.vesting.iter().map(|v| v.total.0).sum();
    require!(vest_total == VESTED_ALLOCATION, "vesting totals must equal 350M GOOD");
    for v in &c.vesting {
        require!(v.duration_ns.0 > 0 && v.cliff_ns.0 <= v.duration_ns.0, "vesting: 0 < cliff <= duration");
        require!(!v.name.is_empty() && v.name.len() <= MAX_LABEL, "vesting name: 1-32 chars");
    }
    require!(
        c.gov.threshold_bps > 5_000 && c.gov.threshold_bps <= 10_000,
        "threshold_bps in (5000, 10000]"
    );
    require!(c.gov.quorum >= 1, "gov quorum >= 1");
    require!(
        c.gov.min_voting_ns.0 > 0 && c.gov.min_voting_ns.0 <= c.gov.max_voting_ns.0,
        "0 < min_voting_ns <= max_voting_ns"
    );
    require!(c.gov.max_per_proposal.0 <= c.gov.max_per_epoch.0, "max_per_proposal <= max_per_epoch");
    require!(
        c.limits.submissions_per_epoch > 0
            && c.limits.attestations_per_epoch > 0
            && c.limits.disputes_per_epoch > 0,
        "rate limits must be > 0"
    );
}

// ---------------------------------------------------------------- internal helpers
impl Contract {
    pub(crate) fn now() -> u64 {
        env::block_timestamp()
    }

    pub(crate) fn epoch_at(&self, t: u64) -> u64 {
        (t.saturating_sub(self.genesis_ns)) / self.config.epoch_duration_ns.0
    }

    pub(crate) fn current_epoch(&self) -> u64 {
        self.epoch_at(Self::now())
    }

    pub(crate) fn epoch_start(&self, e: u64) -> u64 {
        self.genesis_ns + e * self.config.epoch_duration_ns.0
    }

    pub(crate) fn epoch_end(&self, e: u64) -> u64 {
        self.epoch_start(e + 1)
    }

    /// The single mint path. Callers: `claim_reward`, `claim_vested`.
    pub(crate) fn internal_mint(&mut self, to: &AccountId, amount: u128, memo: &str) {
        require!(amount > 0, "mint amount must be > 0");
        let new_total = self.total_minted.checked_add(amount).expect("overflow");
        require!(new_total <= MAX_SUPPLY, "max supply exceeded");
        self.total_minted = new_total;
        self.token.internal_deposit(to, amount);
        FtMint { owner_id: to, amount: U128(amount), memo: Some(memo) }.emit();
    }

    /// Burn from the contract-held treasury.
    pub(crate) fn internal_burn_treasury(&mut self, amount: u128, memo: &str) {
        if amount == 0 {
            return;
        }
        let me = env::current_account_id();
        self.token.internal_withdraw(&me, amount);
        self.total_burned += amount;
        FtBurn { owner_id: &me, amount: U128(amount), memo: Some(memo) }.emit();
    }

    pub(crate) fn log_activity(
        &mut self,
        kind: ActivityKind,
        epoch: Option<u64>,
        account: Option<AccountId>,
        amount: u128,
        memo: &str,
    ) {
        self.activity.push(Activity {
            kind,
            epoch: epoch.map(U64),
            account,
            amount: U128(amount),
            timestamp: U64(Self::now()),
            block_height: U64(env::block_height()),
            memo: memo.to_string(),
        });
    }

    pub(crate) fn stats_mut(&mut self, account: &AccountId) -> &mut AccountStats {
        if !self.stats.contains_key(account) {
            self.stats.insert(account.clone(), AccountStats::default());
            self.account_index.push(account.clone());
        }
        self.stats.get_mut(account).unwrap()
    }

    pub(crate) fn rate_mut(&mut self, account: &AccountId) -> &mut RateCounter {
        let key = (self.current_epoch(), account.clone());
        if !self.rate.contains_key(&key) {
            self.rate.insert(key.clone(), RateCounter::default());
        }
        self.rate.get_mut(&key).unwrap()
    }

    pub(crate) fn is_reviewer(&self, account: &AccountId) -> bool {
        self.config.reviewer_pool.contains(account)
    }

    /// Verified contributor = has a finalized approved deed (dispute window passed or upheld).
    pub(crate) fn verified_at(&self, account: &AccountId, t: u64) -> bool {
        self.stats
            .get(account)
            .and_then(|s| s.verified_since)
            .is_some_and(|since| since.0 <= t)
    }

    pub(crate) fn can_attest(&self, account: &AccountId) -> bool {
        self.is_reviewer(account) || self.verified_at(account, Self::now())
    }

    pub(crate) fn treasury_held(&self) -> u128 {
        self.buckets.iter().map(|b| b.locked.0 + b.spendable.0).sum()
    }

    pub(crate) fn unvested_total(&self) -> u128 {
        self.config
            .vesting
            .iter()
            .zip(self.vesting_claimed.iter())
            .map(|(v, c)| v.total.0 - c)
            .sum()
    }
}

impl Contract {
    /// Charge the caller for storage added since `initial_usage`; refund the rest of the deposit.
    /// Users pay for exactly the bytes they create (DECISIONS D21).
    /// `near_sdk::store` collections buffer writes until the call ends, so flush them first,
    /// otherwise `env::storage_usage()` would not yet include the new bytes.
    pub(crate) fn charge_storage(&mut self, initial_usage: u64) {
        self.challenges.flush();
        self.submissions.flush();
        self.submission_by_challenge_account.flush();
        self.evidence_hashes.flush();
        self.disputes.flush();
        self.stats.flush();
        self.account_index.flush();
        self.rate.flush();
        self.epochs.flush();
        self.epoch_participant.flush();
        self.proposals.flush();
        self.epoch_funding.flush();
        self.activity.flush();
        charge_storage_raw(initial_usage);
    }
}

fn charge_storage_raw(initial_usage: u64) {
    let used = env::storage_usage().saturating_sub(initial_usage);
    let cost = env::storage_byte_cost().saturating_mul(used as u128);
    let attached = env::attached_deposit();
    require!(
        attached >= cost,
        format!("Attach at least {} yoctoNEAR to cover {} bytes of storage", cost.as_yoctonear(), used)
    );
    let refund = attached.saturating_sub(cost);
    if refund > NearToken::from_yoctonear(0) {
        Promise::new(env::predecessor_account_id()).transfer(refund).detach();
    }
}

pub(crate) fn check_len(field: &str, s: &str, min: usize, max: usize) {
    let n = s.chars().count();
    require!(n >= min && n <= max, format!("{field}: length must be {min}-{max}"));
}
