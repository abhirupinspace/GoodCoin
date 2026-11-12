//! # GOODCOIN — Make good contagious
//!
//! Three rules:
//! 1. **Give together.** One fire per week for one public good. Enough givers → it catches:
//!    90% to the cause, 10% to the Hearth. Too few → every gift is refunded and that week's GOOD
//!    can never exist (max supply shrinks).
//! 2. **Get GOOD.** Givers of a caught fire receive GOOD, paid for at ≥ (1+β)× the floor, so every
//!    catch raises the floor (Hearth NEAR ÷ backed GOOD) for every holder. The floor never decreases.
//! 3. **Bring a friend.** A newcomer who names you passes part of their first-gift weight to you.
//!
//! Holders can **kindle** (burn GOOD) to rescue a fire in its final 10%.
//!
//! No owner, no setters, no upgrade method; every access key is deleted after `new()`.

pub mod claims;
pub mod events;
pub mod fire;
pub mod hearth;
pub mod kindle;
pub mod math;
pub mod payout;
pub mod token;
pub mod types;
pub mod views;

#[cfg(test)]
mod golden;
#[cfg(test)]
mod tests;

use near_contract_standards::fungible_token::FungibleToken;
use near_contract_standards::fungible_token::metadata::{FT_METADATA_SPEC, FungibleTokenMetadata};
use near_sdk::json_types::{U64, U128};
use near_sdk::store::{LookupMap, Vector};
use near_sdk::{AccountId, BorshStorageKey, PanicOnDefault, env, near, require};

use crate::math::{base_goal, e_max, e_min, floor_ge, mul_div};
use crate::types::*;

#[near]
#[derive(BorshStorageKey)]
pub enum StorageKey {
    FtAccounts,
    Fires,
    Gifts,
    Profiles,
    Reports,
    Carry,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    pub(crate) token: FungibleToken,
    pub(crate) metadata: FungibleTokenMetadata,
    pub(crate) config: Config,
    pub(crate) causes: Vec<Cause>,
    pub(crate) genesis_ns: u64,
    pub(crate) e_min: i32,
    pub(crate) e_max: i32,

    // ---- supply (GOOD) ----
    pub(crate) max_supply: u128,
    pub(crate) total_minted: u128,
    pub(crate) total_burned: u128,
    pub(crate) earmarked: u128,
    pub(crate) seed: u128,

    // ---- Hearth (yoctoNEAR) and floor high-water mark ----
    pub(crate) hearth: u128,
    pub(crate) hwm_h: u128,
    pub(crate) hwm_b: u128,

    // ---- fire schedule ----
    pub(crate) next_to_settle: u64,
    pub(crate) e: i32,
    pub(crate) streak: u32,
    pub(crate) longest_streak: u32,
    pub(crate) extinguished: bool,
    /// Pinned parameters of fire `next_to_settle`.
    pub(crate) pin: Pin,
    /// Caught weeks whose payout is `Due`, oldest first.
    pub(crate) due_weeks: Vec<u64>,

    // ---- NEAR liabilities (for invariant 4) ----
    pub(crate) escrow_open: u128,
    pub(crate) payouts_owed: u128,
    pub(crate) refunds_owed: u128,
    pub(crate) carry_total: u128,

    pub(crate) fires: LookupMap<u64, Fire>,
    pub(crate) gifts: LookupMap<(u64, AccountId), Gift>,
    pub(crate) profiles: LookupMap<AccountId, Profile>,
    pub(crate) reports: LookupMap<u64, Report>,
    pub(crate) carry: Vector<(u64, u128)>,
}

#[near]
impl Contract {
    /// One-time initialization. The attached deposit seeds the Hearth (SPEC §2).
    #[init]
    #[payable]
    pub fn new(config: Config) -> Self {
        validate(&config);
        let seed_near = env::attached_deposit().as_yoctonear();
        require!(seed_near > 0, "attach the Hearth seed");
        let causes: Vec<Cause> = config
            .causes
            .iter()
            .map(|c| Cause { account: c.account.clone(), name: c.name.clone(), uri: c.uri.clone(), dead: false })
            .collect();
        let allowance = mul_div(config.allowance_bps as u128, MAX_SUPPLY, BPS);
        let g0 = config.goal_start;
        Self {
            token: FungibleToken::new(StorageKey::FtAccounts),
            metadata: FungibleTokenMetadata {
                spec: FT_METADATA_SPEC.to_string(),
                name: "GOODCOIN".to_string(),
                symbol: "GOOD".to_string(),
                icon: Some(ICON.to_string()),
                reference: None,
                reference_hash: None,
                decimals: 24,
            },
            e_min: e_min(g0, config.goal_min),
            e_max: e_max(g0, config.goal_max),
            seed: config.seed_good.0,
            causes,
            genesis_ns: env::block_timestamp(),
            max_supply: MAX_SUPPLY,
            total_minted: 0,
            total_burned: 0,
            earmarked: 0,
            hearth: seed_near,
            hwm_h: seed_near,
            hwm_b: config.seed_good.0,
            next_to_settle: 0,
            e: 0,
            streak: 0,
            longest_streak: 0,
            extinguished: false,
            pin: Pin { week: U64(0), cause: 0, allowance: U128(allowance), e: 0, base_goal: base_goal(g0, 0) },
            due_weeks: vec![],
            escrow_open: 0,
            payouts_owed: 0,
            refunds_owed: 0,
            carry_total: 0,
            fires: LookupMap::new(StorageKey::Fires),
            gifts: LookupMap::new(StorageKey::Gifts),
            profiles: LookupMap::new(StorageKey::Profiles),
            reports: LookupMap::new(StorageKey::Reports),
            carry: Vector::new(StorageKey::Carry),
            config,
        }
    }
}

fn validate(c: &Config) {
    require!(!c.label.is_empty() && c.label.len() <= 32, "label: 1-32 chars");
    require!(c.week_ns.0 >= 10 * 1_000_000_000, "week must be >= 10s");
    require!(c.min_gift.0 > c.record_fee.0 && c.record_fee.0 > 0, "min_gift > record_fee > 0");
    require!(c.fee_bps > 0 && c.fee_bps < 10_000, "fee_bps in (0, 10000)");
    require!(c.markup_bps > 0 && c.markup_bps <= 100_000, "markup_bps in (0, 100000]");
    require!(c.bounty_bps <= 5_000, "bounty_bps <= 5000");
    require!(c.allowance_bps > 0 && c.allowance_bps <= 1_000, "allowance_bps in (0, 1000]");
    require!(c.seed_good.0 > 0 && c.seed_good.0 < MAX_SUPPLY, "seed_good in (0, max_supply)");
    require!(
        c.goal_min >= 1 && c.goal_min <= c.goal_start && c.goal_start <= c.goal_max && c.goal_max <= 100_000,
        "1 <= goal_min <= goal_start <= goal_max <= 100000"
    );
    require!(!c.causes.is_empty() && c.causes.len() <= MAX_CAUSES, "1-16 causes");
    let me = env::current_account_id();
    for (i, cause) in c.causes.iter().enumerate() {
        require!(cause.account != me, "the contract cannot be a cause");
        require!(!is_implicit(&cause.account), "causes must be named accounts");
        require!(!cause.name.is_empty() && cause.name.len() <= 80, "cause name: 1-80 chars");
        require!(cause.uri.len() <= 512, "cause uri <= 512 chars");
        require!(c.causes[..i].iter().all(|o| o.account != cause.account), "duplicate cause");
    }
}

/// 64-hex implicit accounts and 0x-prefixed eth-implicit accounts can't fail a transfer.
pub(crate) fn is_implicit(a: &AccountId) -> bool {
    let s = a.as_str();
    (s.len() == 64 && s.bytes().all(|b| b.is_ascii_hexdigit())) || (s.starts_with("0x") && s.len() == 42)
}

const ICON: &str = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cpath d='M32 4c4 12 18 18 18 34a18 18 0 0 1-36 0c0-9 5-14 9-19 1 6 4 9 7 10-2-9 0-17 2-25z' fill='%23f97316'/%3E%3C/svg%3E";

// ---------------------------------------------------------------- internal helpers
impl Contract {
    pub(crate) fn now() -> u64 {
        env::block_timestamp()
    }
    pub(crate) fn week_ns(&self) -> u64 {
        self.config.week_ns.0
    }
    pub(crate) fn current_week(&self) -> u64 {
        (Self::now() - self.genesis_ns) / self.week_ns()
    }
    pub(crate) fn week_end(&self, w: u64) -> u64 {
        self.genesis_ns + (w + 1) * self.week_ns()
    }
    /// Backed supply B = circulating + earmarked + seed.
    pub(crate) fn backed(&self) -> u128 {
        self.total_minted - self.total_burned + self.earmarked + self.seed
    }
    pub(crate) fn headroom(&self) -> u128 {
        self.max_supply - self.total_minted - self.earmarked
    }

    /// Update the floor high-water mark and assert the floor never decreased (SPEC §3.5, inv. 3).
    pub(crate) fn bump_floor(&mut self) {
        let (h, b) = (self.hearth, self.backed());
        require!(floor_ge(h, b, self.hwm_h, self.hwm_b), "INVARIANT: floor decreased");
        self.hwm_h = h;
        self.hwm_b = b;
    }

    /// Lazy settlement (SPEC §3.1): used by give, kindle, claim, close, report.
    pub(crate) fn settle_due(&mut self) {
        let cur = self.current_week();
        require!(cur - self.next_to_settle <= MAX_SETTLE, "SETTLE_FIRST");
        while self.next_to_settle < cur {
            self.settle_one(self.next_to_settle);
        }
        if let Some(&w) = self.due_weeks.first() {
            self.internal_payout(w);
        }
    }

    pub(crate) fn next_live_cause(&self, after: u32) -> Option<u32> {
        let n = self.causes.len() as u32;
        (1..=n).map(|i| (after + i) % n).find(|&i| !self.causes[i as usize].dead)
    }

    pub(crate) fn is_cause(&self, a: &AccountId) -> bool {
        self.causes.iter().any(|c| &c.account == a)
    }
}
