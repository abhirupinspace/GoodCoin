//! Paying the cause (SPEC §3.6): status machine Due → Sending → Paid | Carried, the carry queue,
//! dead causes and the Extinguished terminal state.
use near_sdk::json_types::{U64, U128};
use near_sdk::{Gas, NearToken, Promise, PromiseError, env, near, require};

use crate::events::Event;
use crate::types::*;
use crate::{Contract, ContractExt};

#[near]
impl Contract {
    /// Send a caught fire's 90% (plus any carried slices) to its cause. Permissionless; acts only on `Due`.
    pub fn payout(&mut self, week: U64) {
        self.internal_payout(week.0);
    }

    #[private]
    pub fn on_payout(&mut self, week: U64, #[callback_result] result: Result<(), PromiseError>) {
        let n = week.0;
        let mut f = self.fires.get(&n).cloned().expect("fire");
        require!(f.payout == PayoutStatus::Sending, "not sending");
        let slices: Vec<(u64, u128)> = f.sending_slices.drain(..).map(|(w, a)| (w.0, a.0)).collect();
        let amount = f.pay.0 + slices.iter().map(|s| s.1).sum::<u128>();
        self.payouts_owed -= amount;
        let cause = self.causes[f.cause as usize].account.clone();
        if result.is_ok() {
            f.payout = PayoutStatus::Paid;
            Event::Payout { week, cause, amount: U128(amount), status: PayoutStatus::Paid }.emit();
            self.fires.insert(n, f);
        } else {
            self.causes[f.cause as usize].dead = true;
            Event::CauseDead { cause: cause.clone() }.emit();
            f.payout = PayoutStatus::Carried;
            let pay = f.pay.0;
            self.fires.insert(n, f);
            // Re-queue the pay under this week and each slice under its own source week.
            self.push_carry(n, pay);
            for (w, a) in slices {
                self.push_carry(w, a);
            }
            Event::Payout { week, cause, amount: U128(amount), status: PayoutStatus::Carried }.emit();
            if self.causes.iter().all(|c| c.dead) {
                self.extinguish();
            }
        }
        self.bump_floor();
    }
}

impl Contract {
    pub(crate) fn internal_payout(&mut self, n: u64) {
        let mut f = self.fires.get(&n).cloned().expect("NO_FIRE");
        require!(f.payout == PayoutStatus::Due, "NOT_DUE");
        self.due_weeks.retain(|&w| w != n);
        let pay = f.pay.0;
        let cause = self.causes[f.cause as usize].clone();
        if cause.dead || self.extinguished {
            f.payout = PayoutStatus::Carried;
            self.fires.insert(n, f);
            self.payouts_owed -= pay;
            self.push_carry(n, pay);
            Event::Payout { week: U64(n), cause: cause.account, amount: U128(pay), status: PayoutStatus::Carried }
                .emit();
            return;
        }
        // Drain the whole carry queue into this payout.
        let slices: Vec<(u64, u128)> = self.carry.iter().copied().collect();
        self.carry.clear();
        let carried: u128 = slices.iter().map(|s| s.1).sum();
        self.carry_total -= carried;
        self.payouts_owed += carried;
        f.sending_slices = slices.iter().map(|&(w, a)| (U64(w), U128(a))).collect();
        f.payout = PayoutStatus::Sending;
        self.fires.insert(n, f);
        let amount = pay + carried;
        Event::Payout { week: U64(n), cause: cause.account.clone(), amount: U128(amount), status: PayoutStatus::Sending }
            .emit();
        Promise::new(cause.account)
            .transfer(NearToken::from_yoctonear(amount))
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(Gas::from_tgas(CALLBACK_TGAS))
                    .on_payout(U64(n)),
            )
            .detach();
    }

    /// Carry a slice; after Extinguished it becomes refundable to that week's givers at once.
    pub(crate) fn push_carry(&mut self, week: u64, amount: u128) {
        if amount == 0 {
            return;
        }
        self.carry_total += amount;
        if self.extinguished {
            let mut f = self.fires.get(&week).cloned().expect("fire");
            f.carry_refundable = U128(f.carry_refundable.0 + amount);
            self.fires.insert(week, f);
        } else {
            self.carry.push((week, amount));
        }
    }

    /// Terminal state: every cause is dead. Carry becomes refundable per source week.
    pub(crate) fn extinguish(&mut self) {
        self.extinguished = true;
        Event::Extinguished {}.emit();
        let slices: Vec<(u64, u128)> = self.carry.iter().copied().collect();
        self.carry.clear();
        for (w, a) in slices {
            let mut f = self.fires.get(&w).cloned().expect("fire");
            f.carry_refundable = U128(f.carry_refundable.0 + a);
            self.fires.insert(w, f);
        }
    }
}
