//! Configuration and records. Every economic parameter lives in `Config`, fixed at `new()`.
use near_sdk::json_types::{U64, U128};
use near_sdk::{AccountId, near};

pub const ONE_NEAR: u128 = 1_000_000_000_000_000_000_000_000;
pub const ONE_GOOD: u128 = 1_000_000_000_000_000_000_000_000;
pub const BPS: u128 = 10_000;
/// Initial cap: 1,000,000,000 GOOD. Only ever decreases.
pub const MAX_SUPPLY: u128 = 1_000_000_000 * ONE_GOOD;
/// Max fires settled by one lazy settlement / `settle()` call.
pub const MAX_SETTLE: u64 = 16;
/// Max weeks per `claim` call.
pub const MAX_CLAIM_WEEKS: usize = 52;
/// Max kindles in one week (2^16 doubling).
pub const MAX_KINDLE_J: u32 = 16;
/// Weeks after a fire's end before its unclaimed GOOD can be closed.
pub const CLOSE_AFTER_WEEKS: u64 = 52;
/// Static gas for payout / refund / redeem callbacks.
pub const CALLBACK_TGAS: u64 = 10;
pub const MAX_CAUSES: usize = 16;
pub const MAX_PAGE: u64 = 100;

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub struct CauseInput {
    pub account: AccountId,
    pub name: String,
    pub uri: String,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub struct Cause {
    pub account: AccountId,
    pub name: String,
    pub uri: String,
    pub dead: bool,
}

/// SPEC §9. All values fixed at deploy; there is no setter.
#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub struct Config {
    /// "production" or "demo" — shown by every client.
    pub label: String,
    /// Week length W (ns).
    pub week_ns: U64,
    /// Minimum total gift per giver per week (yoctoNEAR).
    pub min_gift: U128,
    /// Record fee σ on an account's first gift in a week (yoctoNEAR); never refunded.
    pub record_fee: U128,
    /// φ: share of a caught fire that goes to the Hearth (bps).
    pub fee_bps: u32,
    /// β: markup over the floor paid for every new GOOD (bps).
    pub markup_bps: u32,
    /// γ: spark bounty, share of a newcomer's first gift weight moved to the spark (bps).
    pub bounty_bps: u32,
    /// α: weekly allowance as a share of headroom (bps).
    pub allowance_bps: u32,
    /// Locked seed counted in B (GOOD base units). Hearth seed = attached deposit at `new()`.
    pub seed_good: U128,
    /// Ĝ₀, G_min, G_max (givers).
    pub goal_start: u32,
    pub goal_min: u32,
    pub goal_max: u32,
    pub causes: Vec<CauseInput>,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Outcome {
    Open,
    Caught,
    Smothered,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum PayoutStatus {
    /// Fire did not catch (no payout).
    None,
    Due,
    Sending,
    Paid,
    Carried,
}

/// Parameters of a fire, pinned when the previous fire settles (SPEC §3.1).
#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub struct Pin {
    pub week: U64,
    pub cause: u32,
    pub allowance: U128,
    pub e: i32,
    pub base_goal: u32,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub struct Fire {
    pub week: U64,
    pub cause: u32,
    pub allowance: U128,
    pub base_goal: u32,
    pub givers: u32,
    pub total: U128,
    pub weight_sum: U128,
    pub kindled: u32,
    pub outcome: Outcome,
    /// Hearth fee taken at settlement (caught only).
    pub fee: U128,
    /// 90% owed to the cause (caught only).
    pub pay: U128,
    /// GOOD earmarked for givers (M).
    pub minted: U128,
    /// GOOD already claimed from `minted`.
    pub claimed: U128,
    pub payout: PayoutStatus,
    /// Carry slices drained into the in-flight payout: (source week, amount).
    pub sending_slices: Vec<(U64, U128)>,
    /// Carry refundable to this week's givers after Extinguished (pro-rata by gift).
    pub carry_refundable: U128,
    pub closed: bool,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, Default)]
pub struct Gift {
    pub amount: U128,
    pub weight: U128,
    pub claimed_share: bool,
    pub claimed_refund: bool,
    pub claimed_carry: bool,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub struct Profile {
    pub first_week: U64,
    pub sparked_by: Option<AccountId>,
    /// Newcomers this account brought (bounty applied).
    pub sparks: u32,
    /// Total weight received as spark bounties.
    pub bounty_weight: U128,
    /// Floor (H, B) at this account's first gift — for "floor gain since you gave".
    pub first_floor_h: U128,
    pub first_floor_b: U128,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub struct Report {
    pub cause: AccountId,
    pub uri: String,
    pub sha256: String,
}

/// What a `claim` refund covers, so a failed transfer can re-open exactly those flags.
#[near(serializers = [json, borsh])]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum RefundKind {
    Smother,
    Carry,
}
