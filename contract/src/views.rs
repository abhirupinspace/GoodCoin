//! Read API. Every number a client shows comes from here.
use near_sdk::json_types::{U64, U128};
use near_sdk::{AccountId, env, near};

use crate::math::floor_ge;
use crate::types::*;
use crate::{Contract, ContractExt};

#[near(serializers = [json])]
pub struct FireView {
    pub week: U64,
    pub start_ns: U64,
    pub end_ns: U64,
    pub cause: u32,
    pub cause_account: AccountId,
    pub cause_name: String,
    pub base_goal: u32,
    pub kindled: u32,
    pub goal: u32,
    pub givers: u32,
    pub total: U128,
    pub allowance: U128,
    pub outcome: Outcome,
    pub minted: U128,
    pub payout: PayoutStatus,
    /// True while earlier fires still await settlement (numbers for this week are provisional).
    pub settle_pending: bool,
    pub rescue_window_open: bool,
}

#[near(serializers = [json])]
pub struct SupplyView {
    pub max_supply: U128,
    pub total_minted: U128,
    pub total_burned: U128,
    pub circulating: U128,
    pub earmarked: U128,
    pub seed: U128,
    pub headroom: U128,
}

#[near(serializers = [json])]
pub struct HearthView {
    /// H (yoctoNEAR).
    pub hearth: U128,
    /// B (GOOD base units).
    pub backed: U128,
    /// Floor in yoctoNEAR per whole GOOD (H·10^24 / B), for display only.
    pub floor_yocto_per_good: U128,
    pub high_water_h: U128,
    pub high_water_b: U128,
}

#[near(serializers = [json])]
pub struct StatsView {
    pub label: String,
    pub genesis_ns: U64,
    pub now_ns: U64,
    pub current_week: U64,
    pub next_to_settle: U64,
    pub e: i32,
    pub e_min: i32,
    pub e_max: i32,
    pub streak: u32,
    pub longest_streak: u32,
    pub extinguished: bool,
    pub due_weeks: Vec<U64>,
    pub escrow_open: U128,
    pub payouts_owed: U128,
    pub refunds_owed: U128,
    pub carry_total: U128,
}

#[near(serializers = [json])]
pub struct AccountView {
    pub account: AccountId,
    pub good_balance: U128,
    pub registered: bool,
    pub is_cause: bool,
    pub profile: Option<Profile>,
    /// Floor gain since the account's first gift, in bps (10000 = unchanged).
    pub floor_gain_bps: Option<U128>,
}

#[near(serializers = [json])]
pub struct Invariants {
    /// total_minted + earmarked ≤ max_supply
    pub within_cap: bool,
    /// ft_total_supply == total_minted − total_burned
    pub supply_equation: bool,
    /// floor H/B ≥ highest floor ever recorded
    pub floor_never_decreased: bool,
    /// contract balance ≥ Hearth + escrow + payouts owed + refunds owed + carry + storage
    pub solvent: bool,
}

#[near]
impl Contract {
    pub fn get_config(&self) -> Config {
        self.config.clone()
    }

    pub fn get_causes(&self) -> Vec<Cause> {
        self.causes.clone()
    }

    pub fn get_stats(&self) -> StatsView {
        StatsView {
            label: self.config.label.clone(),
            genesis_ns: U64(self.genesis_ns),
            now_ns: U64(Self::now()),
            current_week: U64(self.current_week()),
            next_to_settle: U64(self.next_to_settle),
            e: self.e,
            e_min: self.e_min,
            e_max: self.e_max,
            streak: self.streak,
            longest_streak: self.longest_streak,
            extinguished: self.extinguished,
            due_weeks: self.due_weeks.iter().map(|&w| U64(w)).collect(),
            escrow_open: U128(self.escrow_open),
            payouts_owed: U128(self.payouts_owed),
            refunds_owed: U128(self.refunds_owed),
            carry_total: U128(self.carry_total),
        }
    }

    pub fn current_fire(&self) -> FireView {
        self.fire_view(self.current_week())
    }

    pub fn get_fire(&self, week: U64) -> FireView {
        self.fire_view(week.0)
    }

    /// Fires `from .. from+limit` (≤ 100), oldest first, including weeks nobody gave in.
    pub fn list_fires(&self, from: U64, limit: Option<u64>) -> Vec<FireView> {
        let to = (from.0 + limit.unwrap_or(MAX_PAGE).min(MAX_PAGE)).min(self.current_week() + 1);
        (from.0..to).map(|w| self.fire_view(w)).collect()
    }

    pub fn get_gift(&self, week: U64, account_id: AccountId) -> Option<Gift> {
        self.gifts.get(&(week.0, account_id)).cloned()
    }

    pub fn get_supply(&self) -> SupplyView {
        SupplyView {
            max_supply: U128(self.max_supply),
            total_minted: U128(self.total_minted),
            total_burned: U128(self.total_burned),
            circulating: U128(self.total_minted - self.total_burned),
            earmarked: U128(self.earmarked),
            seed: U128(self.seed),
            headroom: U128(self.headroom()),
        }
    }

    pub fn get_hearth(&self) -> HearthView {
        HearthView {
            hearth: U128(self.hearth),
            backed: U128(self.backed()),
            floor_yocto_per_good: U128(crate::math::mul_div(self.hearth, ONE_GOOD, self.backed())),
            high_water_h: U128(self.hwm_h),
            high_water_b: U128(self.hwm_b),
        }
    }

    pub fn get_account(&self, account_id: AccountId) -> AccountView {
        let profile = self.profiles.get(&account_id).cloned();
        let floor_gain_bps = profile.as_ref().map(|p| {
            // (H/B) / (h0/b0) in bps
            U128(crate::math::mul3_div2(self.hearth, p.first_floor_b.0, BPS, self.backed(), p.first_floor_h.0))
        });
        AccountView {
            good_balance: U128(self.good_balance(&account_id)),
            registered: self.token.accounts.contains_key(&account_id),
            is_cause: self.is_cause(&account_id),
            profile,
            floor_gain_bps,
            account: account_id,
        }
    }

    pub fn get_report(&self, week: U64) -> Option<Report> {
        self.reports.get(&week.0).cloned()
    }

    pub fn check_invariants(&self) -> Invariants {
        let storage = env::storage_usage() as u128 * env::storage_byte_cost().as_yoctonear();
        let owed = self.hearth + self.escrow_open + self.payouts_owed + self.refunds_owed + self.carry_total + storage;
        Invariants {
            within_cap: self.total_minted + self.earmarked <= self.max_supply,
            supply_equation: self.token.total_supply == self.total_minted - self.total_burned,
            floor_never_decreased: floor_ge(self.hearth, self.backed(), self.hwm_h, self.hwm_b),
            solvent: env::account_balance().as_yoctonear() >= owed,
        }
    }

    /// Self-contained SVG of a fire, rendered from contract state only.
    pub fn fire_card(&self, week: U64) -> String {
        let f = self.fire_view(week.0);
        let pct = if f.goal == 0 { 100 } else { (f.givers as u64 * 100 / f.goal as u64).min(100) };
        let flame = 40 + pct * 140 / 100;
        let color = match f.outcome {
            Outcome::Caught => "#f97316",
            Outcome::Smothered => "#6b7280",
            Outcome::Open => "#fb923c",
        };
        let status = match f.outcome {
            Outcome::Caught => "CAUGHT".to_string(),
            Outcome::Smothered => "SMOTHERED".to_string(),
            Outcome::Open => format!("{} / {} givers", f.givers, f.goal),
        };
        let floor = self.get_hearth().floor_yocto_per_good.0;
        format!(
            "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'>\
<rect width='400' height='300' fill='#111827'/>\
<path d='M200 {top} C240 {c1} 260 250 200 270 C140 250 160 {c1} 200 {top} Z' fill='{color}'/>\
<text x='20' y='34' fill='#f9fafb' font-family='sans-serif' font-size='20'>GOODCOIN · fire {week}</text>\
<text x='20' y='60' fill='#d1d5db' font-family='sans-serif' font-size='14'>{cause}</text>\
<text x='20' y='285' fill='#f9fafb' font-family='sans-serif' font-size='16'>{status}</text>\
<text x='380' y='285' fill='#9ca3af' font-family='sans-serif' font-size='12' text-anchor='end'>floor {floor} yN/GOOD</text>\
</svg>",
            top = 270 - flame,
            c1 = 270 - flame / 2,
            color = color,
            week = week.0,
            cause = xml_escape(&f.cause_name),
            status = status,
            floor = floor,
        )
    }
}

fn xml_escape(s: &str) -> String {
    s.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;").replace('\'', "&apos;").replace('"', "&quot;")
}

impl Contract {
    /// Cause fire `w` will burn for, assuming no further cause dies (rotation is deterministic).
    pub(crate) fn projected_cause(&self, w: u64) -> u32 {
        let mut c = self.pin.cause;
        if self.extinguished || w <= self.pin.week.0 {
            return c;
        }
        for _ in self.pin.week.0..w {
            c = self.next_live_cause(c).unwrap_or(c);
        }
        c
    }

    fn fire_view(&self, w: u64) -> FireView {
        let start = self.genesis_ns + w * self.week_ns();
        let end = self.week_end(w);
        let rec = self.fires.get(&w).cloned();
        let (cause, base_goal, allowance) = match &rec {
            Some(f) => (f.cause, f.base_goal, f.allowance.0),
            None if self.pin.week.0 == w => (self.pin.cause, self.pin.base_goal, self.pin.allowance.0),
            None => (self.projected_cause(w), self.pin.base_goal, 0),
        };
        let outcome = rec.as_ref().map(|f| f.outcome).unwrap_or(if w < self.next_to_settle {
            Outcome::Smothered
        } else {
            Outcome::Open
        });
        let kindled = rec.as_ref().map(|f| f.kindled).unwrap_or(0);
        let now = Self::now();
        let c = &self.causes[cause as usize];
        FireView {
            week: U64(w),
            start_ns: U64(start),
            end_ns: U64(end),
            cause,
            cause_account: c.account.clone(),
            cause_name: c.name.clone(),
            base_goal,
            kindled,
            goal: base_goal.saturating_sub(kindled),
            givers: rec.as_ref().map(|f| f.givers).unwrap_or(0),
            total: rec.as_ref().map(|f| f.total).unwrap_or(U128(0)),
            allowance: U128(allowance),
            outcome,
            minted: rec.as_ref().map(|f| f.minted).unwrap_or(U128(0)),
            payout: rec.as_ref().map(|f| f.payout).unwrap_or(PayoutStatus::None),
            settle_pending: self.next_to_settle < w,
            rescue_window_open: outcome == Outcome::Open && now >= end - self.week_ns() / 10 && now < end,
        }
    }
}
