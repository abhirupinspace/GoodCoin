//! Read API. Every number the frontend shows comes from these views.
use near_sdk::json_types::{U64, U128};
use near_sdk::{AccountId, env, near};

use crate::types::*;
use crate::{Contract, ContractExt};

#[near(serializers = [json])]
pub struct Stats {
    pub label: String,
    pub genesis_ns: U64,
    pub now_ns: U64,
    pub current_epoch: U64,
    pub current_epoch_start_ns: U64,
    pub current_epoch_end_ns: U64,
    pub next_to_settle: U64,
    /// When `settle_epochs` can next be called successfully.
    pub next_settle_at_ns: U64,
    pub current_streak: u32,
    pub longest_streak: u32,
    pub successful_epochs: u32,
    pub failed_epochs: u32,
    pub total_approved_deeds: U64,
    pub unique_contributors: U64,
    pub challenges: u32,
    pub submissions: U64,
    pub disputes: U64,
    pub proposals: U64,
    pub accounts: u32,
    /// Reward per participant if the current epoch succeeds (streak multiplier applied).
    pub next_reward_per_participant: U128,
}

#[near(serializers = [json])]
pub struct Supply {
    pub max_supply: U128,
    pub total_supply: U128,
    /// Cumulative minted incl. genesis.
    pub total_minted: U128,
    pub total_burned: U128,
    /// total_supply − tokens held by the contract (treasury + anything sent to it).
    pub circulating: U128,
    pub treasury_held: U128,
    pub reserve_remaining: U128,
    pub reserve_earmarked_unclaimed: U128,
    pub unvested: U128,
    pub vested_unclaimed: U128,
    /// max_supply − total_minted: can never be exceeded.
    pub mint_headroom: U128,
}

#[near(serializers = [json])]
pub struct Invariants {
    /// total_supply == total_minted − total_burned
    pub supply_equation: bool,
    /// total_minted ≤ MAX_SUPPLY
    pub under_cap: bool,
    /// total_minted + reserve_remaining + reserve_earmarked + unvested == MAX_SUPPLY (every token accounted for)
    pub allocations_accounted: bool,
    /// contract FT balance ≥ Σ bucket locked + spendable
    pub treasury_backed: bool,
}

#[near(serializers = [json])]
pub struct EpochView {
    pub epoch: U64,
    pub start_ns: U64,
    pub end_ns: U64,
    pub settleable_at_ns: U64,
    pub deeds_target: u32,
    pub participants_target: u32,
    pub record: EpochRecord,
}

#[near(serializers = [json])]
pub struct ChallengeView {
    pub challenge: Challenge,
    pub phase: ChallengePhase,
}

#[near(serializers = [json])]
pub struct SubmissionView {
    pub submission: Submission,
    /// Outcome can no longer change (rejected, dispute resolved, or dispute window passed).
    pub finalized: bool,
    pub dispute_window_ends_ns: Option<U64>,
}

#[near(serializers = [json])]
pub struct AccountView {
    pub account: AccountId,
    pub stats: AccountStats,
    pub is_reviewer: bool,
    pub is_organizer: bool,
    pub verified_contributor: bool,
    pub can_attest: bool,
    pub good_balance: U128,
    pub registered: bool,
    /// Settled successful epochs with an unclaimed reward for this account.
    pub claimable_epochs: Vec<U64>,
}

#[near(serializers = [json])]
pub struct VestingView {
    pub index: u32,
    pub schedule: VestingSchedule,
    pub vested: U128,
    pub claimed: U128,
}

fn page(from: Option<u32>, limit: Option<u32>, len: u32) -> std::ops::Range<u32> {
    let from = from.unwrap_or(0).min(len);
    let limit = limit.unwrap_or(MAX_PAGE).min(MAX_PAGE);
    from..(from.saturating_add(limit)).min(len)
}

#[near]
impl Contract {
    pub fn get_config(&self) -> Config {
        self.config.clone()
    }

    pub fn get_stats(&self) -> Stats {
        let e = self.current_epoch();
        Stats {
            label: self.config.label.clone(),
            genesis_ns: U64(self.genesis_ns),
            now_ns: U64(Self::now()),
            current_epoch: U64(e),
            current_epoch_start_ns: U64(self.epoch_start(e)),
            current_epoch_end_ns: U64(self.epoch_end(e)),
            next_to_settle: U64(self.next_to_settle),
            next_settle_at_ns: U64(self.epoch_end(self.next_to_settle) + self.config.dispute_window_ns.0),
            current_streak: self.streak,
            longest_streak: self.longest_streak,
            successful_epochs: self.successful_epochs,
            failed_epochs: self.failed_epochs,
            total_approved_deeds: U64(self.total_approved),
            unique_contributors: U64(self.unique_contributors),
            challenges: self.challenges.len(),
            submissions: U64(self.submissions.len() as u64),
            disputes: U64(self.disputes.len() as u64),
            proposals: U64(self.proposals.len() as u64),
            accounts: self.account_index.len(),
            next_reward_per_participant: U128(self.projected_reward(e)),
        }
    }

    pub fn get_supply(&self) -> Supply {
        let me = env::current_account_id();
        let held = self.token.accounts.get(&me).unwrap_or(0);
        let now = Self::now();
        let vested_unclaimed: u128 = (0..self.config.vesting.len())
            .map(|i| self.vested_amount(i, now) - self.vesting_claimed[i])
            .sum();
        Supply {
            max_supply: U128(MAX_SUPPLY),
            total_supply: U128(self.token.total_supply),
            total_minted: U128(self.total_minted),
            total_burned: U128(self.total_burned),
            circulating: U128(self.token.total_supply - held),
            treasury_held: U128(self.treasury_held()),
            reserve_remaining: U128(self.reserve_remaining),
            reserve_earmarked_unclaimed: U128(self.reserve_earmarked),
            unvested: U128(self.unvested_total()),
            vested_unclaimed: U128(vested_unclaimed),
            mint_headroom: U128(MAX_SUPPLY - self.total_minted),
        }
    }

    /// On-chain self-check anyone can call.
    pub fn check_invariants(&self) -> Invariants {
        let me = env::current_account_id();
        let held = self.token.accounts.get(&me).unwrap_or(0);
        Invariants {
            supply_equation: self.token.total_supply == self.total_minted - self.total_burned,
            under_cap: self.total_minted <= MAX_SUPPLY,
            allocations_accounted: self.total_minted
                + self.reserve_remaining
                + self.reserve_earmarked
                + self.unvested_total()
                == MAX_SUPPLY,
            treasury_backed: held >= self.treasury_held(),
        }
    }

    pub fn get_treasury(&self) -> Vec<(Bucket, BucketState)> {
        Bucket::ALL.iter().map(|b| (*b, self.buckets[b.idx()].clone())).collect()
    }

    pub fn get_epoch(&self, epoch: U64) -> EpochView {
        let e = epoch.0;
        EpochView {
            epoch,
            start_ns: U64(self.epoch_start(e)),
            end_ns: U64(self.epoch_end(e)),
            settleable_at_ns: U64(self.epoch_end(e) + self.config.dispute_window_ns.0),
            deeds_target: self.config.deeds_target,
            participants_target: self.config.participants_target,
            record: self.epochs.get(&e).cloned().unwrap_or_default(),
        }
    }

    /// Epochs from `from` (default: newest first window ending at current epoch).
    pub fn list_epochs(&self, from: Option<U64>, limit: Option<u32>) -> Vec<EpochView> {
        let cur = self.current_epoch();
        let limit = limit.unwrap_or(MAX_PAGE).min(MAX_PAGE) as u64;
        let start = from.map(|f| f.0).unwrap_or(cur.saturating_sub(limit - 1));
        (start..=cur).take(limit as usize).map(|e| self.get_epoch(U64(e))).collect()
    }

    pub fn get_challenge(&self, challenge_id: u32) -> Option<ChallengeView> {
        self.challenges
            .get(challenge_id)
            .map(|c| ChallengeView { challenge: c.clone(), phase: self.challenge_phase(c) })
    }

    pub fn list_challenges(&self, from_index: Option<u32>, limit: Option<u32>) -> Vec<ChallengeView> {
        page(from_index, limit, self.challenges.len())
            .filter_map(|i| self.get_challenge(i))
            .collect()
    }

    pub fn get_submission(&self, submission_id: U64) -> Option<SubmissionView> {
        self.submissions.get(submission_id.0 as u32).map(|s| self.submission_view(s))
    }

    pub fn list_submissions(&self, from_index: Option<u32>, limit: Option<u32>) -> Vec<SubmissionView> {
        page(from_index, limit, self.submissions.len())
            .filter_map(|i| self.submissions.get(i).map(|s| self.submission_view(s)))
            .collect()
    }

    pub fn get_submission_for(&self, challenge_id: u32, account_id: AccountId) -> Option<SubmissionView> {
        self.submission_by_challenge_account
            .get(&(challenge_id, account_id))
            .and_then(|id| self.get_submission(U64(*id)))
    }

    pub fn list_disputes(&self, from_index: Option<u32>, limit: Option<u32>) -> Vec<Dispute> {
        page(from_index, limit, self.disputes.len())
            .filter_map(|i| self.disputes.get(i).cloned())
            .collect()
    }

    pub fn list_proposals(&self, from_index: Option<u32>, limit: Option<u32>) -> Vec<Proposal> {
        page(from_index, limit, self.proposals.len())
            .filter_map(|i| self.proposals.get(i).cloned())
            .collect()
    }

    pub fn has_voted(&self, proposal_id: U64, account_id: AccountId) -> bool {
        self.proposal_votes.contains(&(proposal_id.0, account_id))
    }

    pub fn get_account(&self, account_id: AccountId) -> AccountView {
        let stats = self.stats.get(&account_id).cloned().unwrap_or_default();
        let claimable_epochs = stats
            .epochs
            .iter()
            .filter(|e| {
                e.0 < self.next_to_settle
                    && self.epochs.get(&e.0).is_some_and(|r| r.status == EpochStatus::Succeeded)
                    && !self.claimed.contains(&(e.0, account_id.clone()))
            })
            .copied()
            .collect();
        AccountView {
            is_reviewer: self.is_reviewer(&account_id),
            is_organizer: self.config.organizers.contains(&account_id),
            verified_contributor: self.verified_at(&account_id, Self::now()),
            can_attest: self.can_attest(&account_id),
            good_balance: U128(self.token.accounts.get(&account_id).unwrap_or(0)),
            registered: self.token.accounts.contains_key(&account_id),
            claimable_epochs,
            stats,
            account: account_id,
        }
    }

    /// Leaderboard source: accounts in first-seen order with their stats.
    pub fn list_accounts(&self, from_index: Option<u32>, limit: Option<u32>) -> Vec<(AccountId, AccountStats)> {
        page(from_index, limit, self.account_index.len())
            .filter_map(|i| {
                let a = self.account_index.get(i)?;
                Some((a.clone(), self.stats.get(a).cloned().unwrap_or_default()))
            })
            .collect()
    }

    pub fn activity_count(&self) -> u32 {
        self.activity.len()
    }

    pub fn list_activity(&self, from_index: Option<u32>, limit: Option<u32>) -> Vec<Activity> {
        page(from_index, limit, self.activity.len())
            .filter_map(|i| self.activity.get(i).cloned())
            .collect()
    }

    pub fn get_vesting(&self) -> Vec<VestingView> {
        let now = Self::now();
        self.config
            .vesting
            .iter()
            .enumerate()
            .map(|(i, v)| VestingView {
                index: i as u32,
                schedule: v.clone(),
                vested: U128(self.vested_amount(i, now)),
                claimed: U128(self.vesting_claimed[i]),
            })
            .collect()
    }
}

impl Contract {
    fn submission_view(&self, s: &Submission) -> SubmissionView {
        let now = Self::now();
        let window_end = s.approved_at.map(|t| U64(t.0 + self.config.dispute_window_ns.0));
        let finalized = s.finalized_at.is_some()
            || (s.status == SubmissionStatus::Approved
                && s.dispute_id.is_none()
                && window_end.is_some_and(|w| now >= w.0));
        SubmissionView { submission: s.clone(), finalized, dispute_window_ends_ns: window_end }
    }

    /// Reward per participant if epoch `e` succeeds, assuming all earlier unsettled epochs
    /// settle as their current counts imply (exact once they are settled).
    fn projected_reward(&self, e: u64) -> u128 {
        let mut streak = self.streak;
        for k in self.next_to_settle..e {
            let r = self.epochs.get(&k).cloned().unwrap_or_default();
            if r.approved_deeds >= self.config.deeds_target && r.participants >= self.config.participants_target {
                streak += 1;
            } else {
                streak = 0;
            }
            if k > self.next_to_settle + 64 {
                break;
            }
        }
        self.reward_for_streak(streak)
    }
}
