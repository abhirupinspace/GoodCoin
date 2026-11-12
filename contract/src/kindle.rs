//! Kindle: a holder burns GOOD to rescue a fire in its last 10% (SPEC §5).
use near_contract_standards::fungible_token::events::FtBurn;
use near_sdk::json_types::{U64, U128};
use near_sdk::{env, near, require};

use crate::events::Event;
use crate::math::mul3_div2_ceil;
use crate::types::*;
use crate::{Contract, ContractExt};

#[near]
impl Contract {
    /// Burn `⌈2^j · φ · min_gift · B/H⌉` GOOD (one gift's Hearth share at the floor, doubling) to
    /// lower this week's goal by one giver. Only in the rescue window, only when the fire is a few
    /// givers short. A kindled catch never raises the base goal. Returns the GOOD burned.
    pub fn kindle(&mut self, week: U64) -> U128 {
        self.settle_due();
        let cost = match self.kindle_check(week.0) {
            Ok(c) => c,
            Err(e) => env::panic_str(e),
        };
        let burner = env::predecessor_account_id();
        require!(self.good_balance(&burner) >= cost, "INSUFFICIENT_BALANCE");
        self.token.internal_withdraw(&burner, cost);
        self.total_burned += cost;
        let mut f = self.fires.get(&week.0).cloned().unwrap();
        f.kindled += 1;
        let new_goal = f.base_goal - f.kindled;
        self.fires.insert(week.0, f);
        FtBurn { owner_id: &burner, amount: U128(cost), memo: Some("kindle") }.emit();
        Event::Kindled { week, burner, cost: U128(cost), goal: new_goal }.emit();
        self.bump_floor();
        U128(cost)
    }

    /// GOOD a kindle would burn right now, or `None` if kindling isn't allowed for `week` now.
    pub fn kindle_quote(&self, week: U64) -> Option<U128> {
        if self.next_to_settle != self.current_week() {
            return None;
        }
        self.kindle_check(week.0).ok().map(U128)
    }
}

impl Contract {
    pub(crate) fn kindle_check(&self, week: u64) -> Result<u128, &'static str> {
        if self.extinguished {
            return Err("EXTINGUISHED");
        }
        let cur = self.current_week();
        if week != cur {
            return Err("WRONG_WEEK");
        }
        if Self::now() < self.week_end(cur) - self.week_ns() / 10 {
            return Err("NOT_RESCUE_WINDOW");
        }
        let f = self.fires.get(&cur).ok_or("TOO_FAR_FROM_GOAL")?;
        let goal = f.base_goal - f.kindled;
        if f.givers >= goal {
            return Err("GOAL_MET");
        }
        if goal - f.givers > (f.base_goal / 4).max(1) {
            return Err("TOO_FAR_FROM_GOAL");
        }
        if f.kindled > MAX_KINDLE_J {
            return Err("TOO_MANY_KINDLES");
        }
        if goal < 2 {
            return Err("GOAL_WOULD_BE_ZERO");
        }
        Ok(mul3_div2_ceil(
            1u128 << f.kindled,
            self.config.fee_bps as u128 * self.config.min_gift.0,
            self.backed(),
            BPS,
            self.hearth,
        ))
    }
}
