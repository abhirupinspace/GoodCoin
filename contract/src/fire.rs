//! Give and settle (SPEC §3.1–3.4).
use near_sdk::json_types::{U64, U128};
use near_sdk::{AccountId, env, near, require};

use crate::events::Event;
use crate::math::{base_goal, mul3_div2, mul_div};
use crate::types::*;
use crate::{Contract, ContractExt};

#[near]
impl Contract {
    /// Throw NEAR into this week's fire. `week` and `cause` must match the current fire, so a gift
    /// can never land in a fire the giver didn't choose. The first gift of the week pays the record
    /// fee σ (storage; never refunded). Gifts can't be withdrawn before settlement.
    #[payable]
    pub fn give(&mut self, week: U64, cause: u32, sparked_by: Option<AccountId>) {
        self.settle_due();
        require!(!self.extinguished, "EXTINGUISHED");
        let cur = self.current_week();
        require!(week.0 == cur, "WRONG_WEEK");
        require!(cause == self.pin.cause, "WRONG_CAUSE");
        let giver = env::predecessor_account_id();
        require!(giver != env::current_account_id(), "CONTRACT_CANNOT_GIVE");
        require!(!self.is_cause(&giver), "CAUSE_CANNOT_GIVE");
        let attached = env::attached_deposit().as_yoctonear();
        let key = (cur, giver.clone());

        let mut fire = self.fires.get(&cur).cloned().unwrap_or_else(|| self.new_fire(cur));
        let mut gift = self.gifts.get(&key).cloned();
        let g = match gift {
            None => {
                require!(attached > self.config.record_fee.0, "DEPOSIT_BELOW_FEE");
                fire.givers += 1;
                gift = Some(Gift::default());
                attached - self.config.record_fee.0
            }
            Some(_) => {
                require!(attached > 0, "ZERO_GIFT");
                attached
            }
        };
        let mut gift = gift.unwrap();
        require!(gift.amount.0 + g >= self.config.min_gift.0, "BELOW_MIN_GIFT");
        gift.amount = U128(gift.amount.0 + g);
        gift.weight = U128(gift.weight.0 + g);
        fire.total = U128(fire.total.0 + g);
        fire.weight_sum = U128(fire.weight_sum.0 + g);
        self.escrow_open += g;

        // Spark bounty (SPEC §3.3): only on an account's first-ever gift; weight MOVES, never adds.
        let mut bounty = 0u128;
        let mut spark_recorded = None;
        if !self.profiles.contains_key(&giver) {
            let valid_spark = sparked_by
                .filter(|s| s != &giver && self.gifts.contains_key(&(cur, s.clone())))
                .filter(|_| self.config.bounty_bps > 0);
            if let Some(spark) = valid_spark {
                let capped = g.min(self.config.min_gift.0 * 3 / 2);
                bounty = mul_div(self.config.bounty_bps as u128, capped, BPS);
                gift.weight = U128(gift.weight.0 - bounty);
                let sk = (cur, spark.clone());
                let mut sg = self.gifts.get(&sk).cloned().unwrap();
                sg.weight = U128(sg.weight.0 + bounty);
                self.gifts.insert(sk, sg);
                if let Some(p) = self.profiles.get_mut(&spark) {
                    p.sparks += 1;
                    p.bounty_weight = U128(p.bounty_weight.0 + bounty);
                }
                spark_recorded = Some(spark);
            }
            self.profiles.insert(
                giver.clone(),
                Profile {
                    first_week: U64(cur),
                    sparked_by: spark_recorded.clone(),
                    sparks: 0,
                    bounty_weight: U128(0),
                    first_floor_h: U128(self.hearth),
                    first_floor_b: U128(self.backed()),
                },
            );
        }
        self.gifts.insert(key, gift);
        self.fires.insert(cur, fire);
        Event::FireGift { week, giver, amount: U128(g), sparked_by: spark_recorded, bounty: U128(bounty) }.emit();
        self.bump_floor();
    }

    /// Settle up to 16 ended fires, in order (state only, no promises). Never blocked by the
    /// lazy-settlement guard, so anyone can always catch up. Returns how many were settled.
    pub fn settle(&mut self) -> u32 {
        let cur = self.current_week();
        let mut n = 0;
        while self.next_to_settle < cur && n < MAX_SETTLE as u32 {
            self.settle_one(self.next_to_settle);
            n += 1;
        }
        require!(n > 0, "NOTHING_TO_SETTLE");
        n
    }
}

impl Contract {
    fn new_fire(&self, week: u64) -> Fire {
        debug_assert_eq!(self.pin.week.0, week);
        Fire {
            week: U64(week),
            cause: self.pin.cause,
            allowance: self.pin.allowance,
            base_goal: self.pin.base_goal,
            givers: 0,
            total: U128(0),
            weight_sum: U128(0),
            kindled: 0,
            outcome: Outcome::Open,
            fee: U128(0),
            pay: U128(0),
            minted: U128(0),
            claimed: U128(0),
            payout: PayoutStatus::None,
            sending_slices: vec![],
            carry_refundable: U128(0),
            closed: false,
        }
    }

    /// SPEC §3.4. Settles fire `n` (= `next_to_settle`) and pins fire n+1.
    pub(crate) fn settle_one(&mut self, n: u64) {
        require!(n == self.next_to_settle && self.pin.week.0 == n, "settle order");
        let allowance = self.pin.allowance.0.min(self.headroom());
        let cause_acc = self.causes[self.pin.cause as usize].account.clone();
        match self.fires.get(&n).cloned() {
            Some(mut f) => {
                self.escrow_open -= f.total.0;
                let goal = f.base_goal - f.kindled;
                let caught = !self.extinguished && f.givers >= 1 && f.givers >= goal;
                if caught {
                    let x = f.total.0;
                    let fee = mul_div(x, self.config.fee_bps as u128, BPS);
                    let pay = x - fee;
                    let cap = mul3_div2(
                        fee,
                        self.backed(),
                        BPS,
                        self.hearth,
                        BPS + self.config.markup_bps as u128,
                    );
                    let m = allowance.min(cap);
                    self.hearth += fee;
                    self.earmarked += m;
                    f.outcome = Outcome::Caught;
                    f.fee = U128(fee);
                    f.pay = U128(pay);
                    f.minted = U128(m);
                    f.payout = PayoutStatus::Due;
                    self.payouts_owed += pay;
                    self.due_weeks.push(n);
                    self.streak += 1;
                    self.longest_streak = self.longest_streak.max(self.streak);
                    if f.kindled == 0 {
                        self.e = (self.e + 1).min(self.e_max);
                    }
                    Event::FireCaught {
                        week: U64(n),
                        cause: cause_acc,
                        givers: f.givers,
                        total: f.total,
                        fee: U128(fee),
                        minted: U128(m),
                        floor_h: U128(self.hearth),
                        floor_b: U128(self.backed()),
                        goal,
                    }
                    .emit();
                } else {
                    f.outcome = Outcome::Smothered;
                    self.refunds_owed += f.total.0;
                    self.smother(n, f.givers, f.total.0, allowance);
                }
                self.fires.insert(n, f);
            }
            None => self.smother(n, 0, 0, allowance),
        }
        self.next_to_settle = n + 1;
        let cause = if self.extinguished {
            self.pin.cause
        } else {
            self.next_live_cause(self.pin.cause).unwrap_or(self.pin.cause)
        };
        self.pin = Pin {
            week: U64(n + 1),
            cause,
            allowance: U128(mul_div(self.config.allowance_bps as u128, self.headroom(), BPS)),
            e: self.e,
            base_goal: base_goal(self.config.goal_start, self.e),
        };
        self.bump_floor();
    }

    fn smother(&mut self, n: u64, givers: u32, total: u128, allowance: u128) {
        self.max_supply -= allowance;
        self.e = (self.e - 1).max(self.e_min);
        self.streak = 0;
        Event::FireSmothered {
            week: U64(n),
            givers,
            total: U128(total),
            allowance_destroyed: U128(allowance),
            max_supply: U128(self.max_supply),
        }
        .emit();
    }
}
