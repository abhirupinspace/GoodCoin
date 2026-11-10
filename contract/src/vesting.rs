//! Non-protocol allocations (liquidity, ecosystem, contributors, security): 350M GOOD, unminted at
//! genesis, released linearly from genesis with an optional cliff. Only the fixed beneficiary can
//! claim, and only what has vested. Schedules are part of the immutable config.
use near_sdk::json_types::U128;
use near_sdk::{env, near, require};

use crate::events::GoodEvent;
use crate::types::ActivityKind;
use crate::{Contract, ContractExt};

#[near]
impl Contract {
    #[payable]
    pub fn claim_vested(&mut self, schedule: u32) -> U128 {
        let initial = env::storage_usage();
        let caller = env::predecessor_account_id();
        let i = schedule as usize;
        require!(i < self.config.vesting.len(), "schedule not found");
        let v = self.config.vesting[i].clone();
        require!(caller == v.beneficiary, "only the beneficiary");
        let claimable = self.vested_amount(i, Self::now()) - self.vesting_claimed[i];
        require!(claimable > 0, "nothing vested to claim");
        self.vesting_claimed[i] += claimable;
        self.ensure_registered(&caller);
        self.internal_mint(&caller, claimable, &format!("vesting:{}", v.name));
        self.log_activity(ActivityKind::VestingMint, None, Some(caller.clone()), claimable, &v.name);
        GoodEvent::VestingClaimed { schedule, beneficiary: caller, amount: U128(claimable) }.emit();
        self.charge_storage(initial);
        U128(claimable)
    }
}

impl Contract {
    pub(crate) fn vested_amount(&self, i: usize, t: u64) -> u128 {
        let v = &self.config.vesting[i];
        let elapsed = t.saturating_sub(self.genesis_ns);
        if elapsed < v.cliff_ns.0 {
            0
        } else if elapsed >= v.duration_ns.0 {
            v.total.0
        } else {
            // total × elapsed would overflow u128 (1.5e32 × 6e16); split into quotient and remainder.
            let (d, e) = (v.duration_ns.0 as u128, elapsed as u128);
            (v.total.0 / d) * e + (v.total.0 % d) * e / d
        }
    }
}
