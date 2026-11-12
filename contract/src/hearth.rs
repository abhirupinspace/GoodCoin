//! Redemption at the floor (SPEC §4) and the cause's Good Wall report (SPEC §6).
use near_contract_standards::fungible_token::events::FtBurn;
use near_sdk::json_types::{U64, U128};
use near_sdk::{Gas, NearToken, Promise, PromiseError, env, near, require};

use crate::events::Event;
use crate::math::mul_div;
use crate::types::*;
use crate::{Contract, ContractExt};

#[near]
impl Contract {
    /// Burn `amount` GOOD and receive ⌊amount·H/B⌋ NEAR. Always open: never blocked by unsettled
    /// fires or by Extinguished. The floor is unchanged (it can only round up).
    pub fn redeem(&mut self, amount: U128) -> U128 {
        let a = amount.0;
        require!(a > 0, "ZERO_AMOUNT");
        let account = env::predecessor_account_id();
        require!(self.good_balance(&account) >= a, "INSUFFICIENT_BALANCE");
        let near = mul_div(a, self.hearth, self.backed());
        self.token.internal_withdraw(&account, a);
        self.total_burned += a;
        self.hearth -= near;
        FtBurn { owner_id: &account, amount: U128(a), memo: Some("redeem") }.emit();
        Event::Redeemed { account: account.clone(), good: U128(a), near: U128(near) }.emit();
        self.bump_floor();
        if near > 0 {
            Promise::new(account)
                .transfer(NearToken::from_yoctonear(near))
                .then(
                    Self::ext(env::current_account_id())
                        .with_static_gas(Gas::from_tgas(CALLBACK_TGAS))
                        .on_redeem(U128(near)),
                )
                .detach();
        }
        U128(near)
    }

    /// If the redemption transfer failed (deleted account), the NEAR stays in the Hearth: floor rises.
    #[private]
    pub fn on_redeem(&mut self, near: U128, #[callback_result] result: Result<(), PromiseError>) {
        if result.is_err() {
            self.hearth += near.0;
            self.bump_floor();
        }
    }

    /// The paid cause publishes what the gift funded, once per week (the Good Wall).
    pub fn report(&mut self, week: U64, uri: String, sha256: String) {
        self.settle_due();
        let f = self.fires.get(&week.0).cloned().expect("NOT_PAID");
        let cause = self.causes[f.cause as usize].account.clone();
        require!(env::predecessor_account_id() == cause, "NOT_CAUSE");
        require!(f.payout == PayoutStatus::Paid, "NOT_PAID");
        require!(!self.reports.contains_key(&week.0), "ALREADY_REPORTED");
        require!(
            uri.len() >= 8 && uri.len() <= 512 && ["https://", "ipfs://", "ar://"].iter().any(|p| uri.starts_with(p)),
            "INVALID_URI"
        );
        require!(
            sha256.len() == 64 && sha256.bytes().all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b)),
            "INVALID_HASH"
        );
        self.reports.insert(week.0, Report { cause: cause.clone(), uri: uri.clone(), sha256: sha256.clone() });
        Event::Report { week, cause, uri, sha256 }.emit();
    }
}
