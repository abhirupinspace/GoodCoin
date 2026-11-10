//! Collective Milestone Engine: permissionless ordered settlement, streak, claim-based rewards.
//!
//! Epoch `e` covers `[genesis + e·D, genesis + (e+1)·D)`. It can be settled by anyone once
//! `now ≥ end(e) + dispute_window`, which guarantees no dispute can still change its counts.
//! Epochs settle strictly in order (the streak is order-dependent), at most
//! `MAX_SETTLE_PER_CALL` per call. Status is written once, so double settlement is impossible.
use near_sdk::json_types::{U64, U128};
use near_sdk::{env, near, require};

use crate::events::GoodEvent;
use crate::types::*;
use crate::{Contract, ContractExt};

#[near]
impl Contract {
    /// Settle every settleable epoch (up to 16). Returns how many were settled.
    pub fn settle_epochs(&mut self) -> u32 {
        let now = Self::now();
        let window = self.config.dispute_window_ns.0;
        let mut settled = 0;
        while settled < MAX_SETTLE_PER_CALL {
            let e = self.next_to_settle;
            if now < self.epoch_end(e) + window {
                break;
            }
            self.settle_one(e, now);
            self.next_to_settle += 1;
            settled += 1;
        }
        require!(
            settled > 0,
            format!(
                "epoch {} can be settled from {} (ns)",
                self.next_to_settle,
                self.epoch_end(self.next_to_settle) + window
            )
        );
        settled
    }

    /// Claim the reward for a successful epoch in which the caller had ≥1 counted approved deed.
    /// Registers the caller for GOOD storage if needed (caller pays the bytes).
    #[payable]
    pub fn claim_reward(&mut self, epoch: U64) -> U128 {
        let initial = env::storage_usage();
        let account = env::predecessor_account_id();
        let e = epoch.0;
        require!(e < self.next_to_settle, "epoch not settled yet");
        let mut rec = self.epochs.get(&e).cloned().expect("no participants in this epoch");
        require!(rec.status == EpochStatus::Succeeded, "epoch did not succeed with rewards");
        let key = (e, account.clone());
        require!(self.epoch_participant.contains_key(&key), "no counted approved deed in this epoch");
        require!(!self.claimed.contains(&key), "already claimed");
        self.claimed.insert(key);

        let amount = rec.reward_per_participant.0;
        self.reserve_earmarked -= amount;
        rec.rewards_claimed += 1;
        self.epochs.insert(e, rec);
        self.ensure_registered(&account);
        self.internal_mint(&account, amount, "epoch-reward");
        let s = self.stats_mut(&account);
        s.rewards_claimed = U128(s.rewards_claimed.0 + amount);
        self.log_activity(ActivityKind::RewardMint, Some(e), Some(account.clone()), amount, "epoch reward");
        GoodEvent::RewardClaimed { epoch, account, amount: U128(amount) }.emit();
        self.charge_storage(initial);
        U128(amount)
    }
}

impl Contract {
    /// Reward per participant for a success when the streak before it is `streak_before`.
    pub(crate) fn reward_for_streak(&self, streak_before: u32) -> u128 {
        let c = &self.config;
        let steps = streak_before.min(c.streak_bonus_cap) as u128;
        c.base_reward.0 * (BPS + c.streak_bonus_bps as u128 * steps) / BPS
    }

    fn settle_one(&mut self, e: u64, now: u64) {
        let mut rec = self.epochs.get(&e).cloned().unwrap_or_default();
        debug_assert!(rec.status == EpochStatus::Open);
        let c = self.config.clone();
        let success = rec.approved_deeds >= c.deeds_target && rec.participants >= c.participants_target;

        if success {
            let rpp = self.reward_for_streak(self.streak);
            let total = rpp * rec.participants as u128;
            if total <= self.reserve_remaining {
                // All-or-nothing earmark: claims can never exceed what was reserved.
                self.reserve_remaining -= total;
                self.reserve_earmarked += total;
                rec.status = EpochStatus::Succeeded;
                rec.reward_per_participant = U128(rpp);
                rec.reward_total = U128(total);
            } else {
                rec.status = EpochStatus::SucceededNoReserve;
            }
            // Unlock a fixed slice of the locked treasury into spendable buckets (50/30/20).
            let mut unlocked = 0u128;
            for (i, b) in self.buckets.iter_mut().enumerate() {
                let amt = (c.pg_unlock_per_success.0 * BUCKET_BPS[i] / BPS).min(b.locked.0);
                b.locked = U128(b.locked.0 - amt);
                b.spendable = U128(b.spendable.0 + amt);
                unlocked += amt;
            }
            rec.unlocked = U128(unlocked);
            self.streak += 1;
            self.longest_streak = self.longest_streak.max(self.streak);
            self.successful_epochs += 1;
            let kind = if rec.status == EpochStatus::Succeeded {
                ActivityKind::EpochSucceeded
            } else {
                ActivityKind::EpochSucceededNoReserve
            };
            self.log_activity(kind, Some(e), None, rec.reward_total.0, "rewards earmarked for claim");
            if unlocked > 0 {
                self.log_activity(ActivityKind::TreasuryUnlock, Some(e), None, unlocked, "locked -> spendable 50/30/20");
            }
        } else {
            rec.status = EpochStatus::Failed;
            self.streak = 0;
            self.failed_epochs += 1;
            // Burn failure_burn_bps of each locked bucket, pro rata.
            let mut burned = 0u128;
            for b in self.buckets.iter_mut() {
                let amt = b.locked.0 * c.failure_burn_bps as u128 / BPS;
                b.locked = U128(b.locked.0 - amt);
                b.burned = U128(b.burned.0 + amt);
                burned += amt;
            }
            self.internal_burn_treasury(burned, "failed-epoch");
            rec.burned = U128(burned);
            self.log_activity(ActivityKind::EpochFailed, Some(e), None, 0, "targets missed: streak reset");
            if burned > 0 {
                self.log_activity(ActivityKind::FailureBurn, Some(e), None, burned, "0.1% of locked treasury burned");
            }
        }
        rec.streak_after = self.streak;
        rec.settled_at = Some(U64(now));
        GoodEvent::EpochSettled {
            epoch: U64(e),
            status: rec.status,
            approved_deeds: rec.approved_deeds,
            participants: rec.participants,
            reward_per_participant: rec.reward_per_participant,
            reward_total: rec.reward_total,
            burned: rec.burned,
            unlocked: rec.unlocked,
            streak: self.streak,
            longest_streak: self.longest_streak,
        }
        .emit();
        self.epochs.insert(e, rec);
    }
}
