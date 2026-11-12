//! Pull-based claims (SPEC §3.7): GOOD shares of caught fires, NEAR refunds of smothered fires and
//! extinguished carry, and `close` of stale earmarks.
use near_contract_standards::fungible_token::events::FtMint;
use near_sdk::json_types::{U64, U128};
use near_sdk::{AccountId, Gas, NearToken, Promise, PromiseError, env, near, require};

use crate::events::Event;
use crate::math::mul_div;
use crate::types::*;
use crate::{Contract, ContractExt};

#[near(serializers = [json])]
pub struct ClaimResult {
    pub good: U128,
    pub near: U128,
}

#[near]
impl Contract {
    /// Claim everything owed to the caller for the given settled weeks (≤ 52). Attach the GOOD
    /// storage deposit (`storage_balance_bounds().min`) if you are not registered yet; excess is refunded.
    #[payable]
    pub fn claim(&mut self, weeks: Vec<U64>) -> ClaimResult {
        self.settle_due();
        require!(!weeks.is_empty() && weeks.len() <= MAX_CLAIM_WEEKS, "1-52 weeks");
        let account = env::predecessor_account_id();
        let mut good = 0u128;
        let mut near = 0u128;
        let mut refunded: Vec<(U64, RefundKind, U128)> = vec![];
        let mut seen: Vec<u64> = vec![];
        for w in weeks {
            let w = w.0;
            if seen.contains(&w) {
                continue;
            }
            seen.push(w);
            require!(w < self.next_to_settle, "NOT_SETTLED");
            let key = (w, account.clone());
            let mut gift = self.gifts.get(&key).cloned().expect("NOT_A_GIVER");
            let mut f = self.fires.get(&w).cloned().expect("NOT_A_GIVER");
            match f.outcome {
                Outcome::Caught if !gift.claimed_share && !f.closed => {
                    let share = mul_div(f.minted.0, gift.weight.0, f.weight_sum.0);
                    gift.claimed_share = true;
                    f.claimed = U128(f.claimed.0 + share);
                    good += share;
                    Event::ClaimedGood { week: U64(w), account: account.clone(), amount: U128(share) }.emit();
                }
                Outcome::Smothered if !gift.claimed_refund => {
                    let amt = gift.amount.0;
                    gift.claimed_refund = true;
                    self.refunds_owed -= amt;
                    near += amt;
                    refunded.push((U64(w), RefundKind::Smother, U128(amt)));
                    Event::ClaimedNear { week: U64(w), account: account.clone(), kind: RefundKind::Smother, amount: U128(amt) }
                        .emit();
                }
                _ => {}
            }
            if f.carry_refundable.0 > 0 && !gift.claimed_carry {
                let amt = mul_div(f.carry_refundable.0, gift.amount.0, f.total.0);
                gift.claimed_carry = true;
                self.carry_total -= amt;
                near += amt;
                refunded.push((U64(w), RefundKind::Carry, U128(amt)));
                Event::ClaimedNear { week: U64(w), account: account.clone(), kind: RefundKind::Carry, amount: U128(amt) }
                    .emit();
            }
            self.gifts.insert(key, gift);
            self.fires.insert(w, f);
        }
        require!(good > 0 || near > 0, "NOTHING_TO_CLAIM");

        let attached = env::attached_deposit().as_yoctonear();
        let mut storage_cost = 0u128;
        if good > 0 {
            if !self.token.accounts.contains_key(&account) {
                storage_cost = self.storage_min();
                require!(attached >= storage_cost, "ATTACH_STORAGE_DEPOSIT");
                self.token.internal_register_account(&account);
            }
            self.earmarked -= good;
            self.total_minted += good;
            self.token.internal_deposit(&account, good);
            FtMint { owner_id: &account, amount: U128(good), memo: Some("fire-share") }.emit();
        }
        let excess = attached - storage_cost;
        if near > 0 {
            Promise::new(account.clone())
                .transfer(NearToken::from_yoctonear(near + excess))
                .then(
                    Self::ext(env::current_account_id())
                        .with_static_gas(Gas::from_tgas(CALLBACK_TGAS))
                        .on_refund(account, refunded),
                )
                .detach();
        } else if excess > 0 {
            Promise::new(account).transfer(NearToken::from_yoctonear(excess)).detach();
        }
        self.bump_floor();
        ClaimResult { good: U128(good), near: U128(near) }
    }

    /// Re-opens refunds whose transfer failed (deleted account), so they can be claimed again.
    #[private]
    pub fn on_refund(
        &mut self,
        account: AccountId,
        items: Vec<(U64, RefundKind, U128)>,
        #[callback_result] result: Result<(), PromiseError>,
    ) {
        if result.is_ok() {
            return;
        }
        for (w, kind, amt) in items {
            let key = (w.0, account.clone());
            if let Some(mut g) = self.gifts.get(&key).cloned() {
                match kind {
                    RefundKind::Smother => {
                        g.claimed_refund = false;
                        self.refunds_owed += amt.0;
                    }
                    RefundKind::Carry => {
                        g.claimed_carry = false;
                        self.carry_total += amt.0;
                    }
                }
                self.gifts.insert(key, g);
            }
        }
    }

    /// From 52 weeks after a caught fire's end: cancel its unclaimed GOOD (earmark and cap both
    /// shrink, so headroom is not freed; the floor rises). NEAR refunds never expire.
    pub fn close(&mut self, week: U64) {
        self.settle_due();
        let w = week.0;
        let mut f = self.fires.get(&w).cloned().expect("NOT_CAUGHT");
        require!(f.outcome == Outcome::Caught, "NOT_CAUGHT");
        require!(Self::now() >= self.week_end(w) + CLOSE_AFTER_WEEKS * self.week_ns(), "TOO_EARLY");
        require!(!f.closed, "ALREADY_CLOSED");
        let x = f.minted.0 - f.claimed.0;
        f.closed = true;
        self.fires.insert(w, f);
        self.earmarked -= x;
        self.max_supply -= x;
        Event::Closed { week, cancelled: U128(x) }.emit();
        self.bump_floor();
    }
}

impl Contract {
    pub(crate) fn storage_min(&self) -> u128 {
        env::storage_byte_cost().as_yoctonear() * self.token.account_storage_usage as u128
    }
}
