//! NEP-297 events, standard `goodcoin` (SPEC §7). Supply changes also emit NEP-141 `ft_mint`/`ft_burn`.
use near_sdk::json_types::{U64, U128};
use near_sdk::{AccountId, near};

use crate::types::{PayoutStatus, RefundKind};

#[near(event_json(standard = "goodcoin"))]
pub enum Event {
    #[event_version("1.0.0")]
    FireGift { week: U64, giver: AccountId, amount: U128, sparked_by: Option<AccountId>, bounty: U128 },
    #[event_version("1.0.0")]
    FireCaught {
        week: U64,
        cause: AccountId,
        givers: u32,
        total: U128,
        fee: U128,
        minted: U128,
        floor_h: U128,
        floor_b: U128,
        goal: u32,
    },
    #[event_version("1.0.0")]
    FireSmothered { week: U64, givers: u32, total: U128, allowance_destroyed: U128, max_supply: U128 },
    #[event_version("1.0.0")]
    Payout { week: U64, cause: AccountId, amount: U128, status: PayoutStatus },
    #[event_version("1.0.0")]
    CauseDead { cause: AccountId },
    #[event_version("1.0.0")]
    Extinguished {},
    #[event_version("1.0.0")]
    Kindled { week: U64, burner: AccountId, cost: U128, goal: u32 },
    #[event_version("1.0.0")]
    Redeemed { account: AccountId, good: U128, near: U128 },
    #[event_version("1.0.0")]
    ClaimedGood { week: U64, account: AccountId, amount: U128 },
    #[event_version("1.0.0")]
    ClaimedNear { week: U64, account: AccountId, kind: RefundKind, amount: U128 },
    #[event_version("1.0.0")]
    Closed { week: U64, cancelled: U128 },
    #[event_version("1.0.0")]
    Report { week: U64, cause: AccountId, uri: String, sha256: String },
}
