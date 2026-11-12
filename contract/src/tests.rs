//! Unit tests: one per SPEC clause, plus a property test over random histories.
//! Time is driven with `VMContextBuilder::block_timestamp`; promise callbacks are called directly.
use near_contract_standards::fungible_token::core::FungibleTokenCore;
use near_sdk::json_types::{U64, U128};
use near_sdk::test_utils::VMContextBuilder;
use near_sdk::{AccountId, NearToken, PromiseError, testing_env};

use crate::Contract;
use crate::types::*;

pub(crate) const SEC: u64 = 1_000_000_000;
pub(crate) const W: u64 = 360 * SEC;
pub(crate) const T0: u64 = 1_800_000_000 * SEC;
pub(crate) const MIN: u128 = ONE_NEAR / 10;
pub(crate) const FEE: u128 = 5 * ONE_NEAR / 1000;

pub(crate) fn acc(s: &str) -> AccountId {
    s.parse().unwrap()
}
pub(crate) fn me() -> AccountId {
    acc("goodcoin.near")
}

pub(crate) fn ctx(who: &str, t: u64, deposit: u128) {
    let mut b = VMContextBuilder::new();
    b.current_account_id(me())
        .predecessor_account_id(acc(who))
        .signer_account_id(acc(who))
        .block_timestamp(T0 + t)
        .attached_deposit(NearToken::from_yoctonear(deposit))
        .account_balance(NearToken::from_near(1_000));
    testing_env!(b.build());
}

fn now_rel() -> u64 {
    Contract::now() - T0
}

pub(crate) fn demo_config(causes: &[&str]) -> Config {
    Config {
        label: "demo".into(),
        week_ns: U64(W),
        min_gift: U128(MIN),
        record_fee: U128(FEE),
        fee_bps: 1000,
        markup_bps: 2500,
        bounty_bps: 2500,
        allowance_bps: 25,
        seed_good: U128(1_000_000 * ONE_GOOD),
        goal_start: 4,
        goal_min: 2,
        goal_max: 100,
        causes: causes
            .iter()
            .map(|c| CauseInput { account: acc(c), name: format!("Cause {c}"), uri: "https://example.org".into() })
            .collect(),
    }
}

pub(crate) fn setup(causes: &[&str]) -> Contract {
    ctx("deployer.near", 0, ONE_NEAR);
    // testing_env! carries storage over; start every contract from empty storage.
    near_sdk::mock::with_mocked_blockchain(|b| {
        b.take_storage();
    });
    Contract::new(demo_config(causes))
}

pub(crate) fn give(c: &mut Contract, who: &str, t: u64, attached: u128, spark: Option<&str>) {
    ctx(who, t, attached);
    let week = c.current_week();
    let cause = c.projected_cause(week);
    c.give(U64(week), cause, spark.map(acc));
}

pub(crate) fn settle(c: &mut Contract, t: u64) -> u32 {
    ctx("anyone.near", t, 0);
    c.settle()
}

/// Resolve a payout of `week` (Due → payout(); then the callback with `ok`).
pub(crate) fn resolve(c: &mut Contract, week: u64, ok: bool) {
    if c.fires.get(&week).unwrap().payout == PayoutStatus::Due {
        ctx("anyone.near", now_rel(), 0);
        c.payout(U64(week));
    }
    if c.fires.get(&week).unwrap().payout == PayoutStatus::Sending {
        ctx("goodcoin.near", now_rel(), 0);
        c.on_payout(U64(week), if ok { Ok(()) } else { Err(PromiseError::Failed) });
    }
}

pub(crate) fn claim(c: &mut Contract, who: &str, weeks: &[u64]) -> (u128, u128) {
    ctx(who, now_rel(), ONE_NEAR / 100);
    let r = c.claim(weeks.iter().map(|&w| U64(w)).collect());
    (r.good.0, r.near.0)
}

pub(crate) fn assert_inv(c: &Contract) {
    let i = c.check_invariants();
    assert!(i.within_cap, "within_cap");
    assert!(i.supply_equation, "supply_equation");
    assert!(i.floor_never_decreased, "floor");
}

/// Fire 0: alice 1 NEAR, bob 0.1 sparked by alice, carol 0.1, dave 0.1 → caught.
pub(crate) fn fire0_caught(c: &mut Contract) {
    give(c, "alice.near", 10 * SEC, ONE_NEAR + FEE, None);
    give(c, "bob.near", 20 * SEC, MIN + FEE, Some("alice.near"));
    give(c, "carol.near", 30 * SEC, MIN + FEE, None);
    give(c, "dave.near", 40 * SEC, MIN + FEE, None);
    settle(c, W + SEC);
}

// ------------------------------------------------------------------ init

#[test]
fn init_seed_pin_and_bounds() {
    let c = setup(&["c0.near", "c1.near"]);
    assert_eq!(c.hearth, ONE_NEAR);
    assert_eq!(c.backed(), 1_000_000 * ONE_GOOD);
    assert_eq!((c.pin.base_goal, c.pin.cause), (4, 0));
    assert_eq!(c.pin.allowance.0, 2_500_000 * ONE_GOOD);
    assert_eq!((c.e_min, c.e_max), (-7, 33));
    assert_eq!(c.ft_total_supply().0, 0);
    assert_inv(&c);
}

#[test]
#[should_panic(expected = "causes must be named accounts")]
fn init_rejects_implicit_cause() {
    setup(&["0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"]);
}

#[test]
#[should_panic(expected = "duplicate cause")]
fn init_rejects_duplicate_cause() {
    setup(&["c0.near", "c0.near"]);
}

// ------------------------------------------------------------------ give

#[test]
fn give_records_fee_weight_and_givers() {
    let mut c = setup(&["c0.near"]);
    give(&mut c, "alice.near", SEC, ONE_NEAR + FEE, None);
    give(&mut c, "alice.near", 2 * SEC, MIN, None); // top-up: no fee, same giver
    let f = c.fires.get(&0).unwrap().clone();
    assert_eq!(f.givers, 1);
    assert_eq!(f.total.0, ONE_NEAR + MIN);
    assert_eq!(c.escrow_open, ONE_NEAR + MIN);
}

#[test]
#[should_panic(expected = "WRONG_WEEK")]
fn give_wrong_week() {
    let mut c = setup(&["c0.near"]);
    ctx("alice.near", SEC, MIN + FEE);
    c.give(U64(1), 0, None);
}

#[test]
#[should_panic(expected = "WRONG_CAUSE")]
fn give_wrong_cause() {
    let mut c = setup(&["c0.near", "c1.near"]);
    ctx("alice.near", SEC, MIN + FEE);
    c.give(U64(0), 1, None);
}

#[test]
#[should_panic(expected = "BELOW_MIN_GIFT")]
fn give_below_min() {
    let mut c = setup(&["c0.near"]);
    give(&mut c, "alice.near", SEC, MIN, None);
}

#[test]
#[should_panic(expected = "CAUSE_CANNOT_GIVE")]
fn cause_cannot_give() {
    let mut c = setup(&["c0.near"]);
    give(&mut c, "c0.near", SEC, ONE_NEAR, None);
}

#[test]
#[should_panic(expected = "SETTLE_FIRST")]
fn give_reverts_when_far_behind() {
    let mut c = setup(&["c0.near"]);
    give(&mut c, "alice.near", 17 * W + SEC, ONE_NEAR, None);
}

#[test]
fn settle_catches_up_in_batches() {
    let mut c = setup(&["c0.near"]);
    assert_eq!(settle(&mut c, 40 * W + SEC), 16);
    assert_eq!(settle(&mut c, 40 * W + SEC), 16);
    assert_eq!(settle(&mut c, 40 * W + SEC), 8);
    assert_eq!(c.next_to_settle, 40);
    assert_eq!(c.e, c.e_min);
    assert_inv(&c);
}

#[test]
#[should_panic(expected = "NOTHING_TO_SETTLE")]
fn settle_before_end() {
    let mut c = setup(&["c0.near"]);
    settle(&mut c, W - 1);
}

// ------------------------------------------------------------------ spark bounty

#[test]
fn spark_bounty_moves_weight() {
    let mut c = setup(&["c0.near"]);
    give(&mut c, "alice.near", SEC, ONE_NEAR + FEE, None);
    give(&mut c, "bob.near", 2 * SEC, MIN + FEE, Some("alice.near"));
    assert_eq!(c.gifts.get(&(0, acc("alice.near"))).unwrap().weight.0, ONE_NEAR + MIN / 4);
    assert_eq!(c.gifts.get(&(0, acc("bob.near"))).unwrap().weight.0, MIN - MIN / 4);
    assert_eq!(c.fires.get(&0).unwrap().weight_sum.0, ONE_NEAR + MIN);
    assert_eq!(c.profiles.get(&acc("alice.near")).unwrap().sparks, 1);
}

#[test]
fn spark_bounty_capped() {
    let mut c = setup(&["c0.near"]);
    give(&mut c, "alice.near", SEC, ONE_NEAR, None);
    give(&mut c, "whale.near", 2 * SEC, 100 * ONE_NEAR + FEE, Some("alice.near"));
    let a = c.gifts.get(&(0, acc("alice.near"))).unwrap().weight.0;
    assert_eq!(a, (ONE_NEAR - FEE) + (MIN * 3 / 2) / 4);
}

#[test]
fn spark_rules() {
    let mut c = setup(&["c0.near"]);
    give(&mut c, "bob.near", SEC, MIN + FEE, Some("alice.near")); // spark hasn't given
    assert_eq!(c.gifts.get(&(0, acc("bob.near"))).unwrap().weight.0, MIN);
    give(&mut c, "alice.near", 2 * SEC, MIN + FEE, None);
    give(&mut c, "bob.near", 3 * SEC, MIN, Some("alice.near")); // not first-ever gift
    assert_eq!(c.gifts.get(&(0, acc("alice.near"))).unwrap().weight.0, MIN);
    give(&mut c, "carol.near", 4 * SEC, MIN + FEE, Some("carol.near")); // self-spark
    assert_eq!(c.gifts.get(&(0, acc("carol.near"))).unwrap().weight.0, MIN);
}

// ------------------------------------------------------------------ settle

#[test]
fn catch_math_matches_spec() {
    let mut c = setup(&["c0.near"]);
    fire0_caught(&mut c);
    let f = c.fires.get(&0).unwrap().clone();
    assert_eq!(f.outcome, Outcome::Caught);
    assert_eq!(f.total.0, 13 * ONE_NEAR / 10);
    assert_eq!(f.fee.0, 13 * ONE_NEAR / 100);
    assert_eq!(f.pay.0, 117 * ONE_NEAR / 100);
    assert_eq!(f.minted.0, 104_000 * ONE_GOOD);
    assert_eq!(c.hearth, ONE_NEAR + 13 * ONE_NEAR / 100);
    assert_eq!(c.earmarked, 104_000 * ONE_GOOD);
    assert_eq!((c.e, c.pin.base_goal), (1, 5));
    assert_eq!(f.payout, PayoutStatus::Due);
    assert_eq!(c.payouts_owed, f.pay.0);
    assert!(c.hwm_h > ONE_NEAR);
    assert_inv(&c);
}

#[test]
fn smother_shrinks_cap_and_refunds() {
    let mut c = setup(&["c0.near"]);
    give(&mut c, "erin.near", SEC, MIN + FEE, None);
    settle(&mut c, W + SEC);
    assert_eq!(c.fires.get(&0).unwrap().outcome, Outcome::Smothered);
    assert_eq!(c.max_supply, MAX_SUPPLY - 2_500_000 * ONE_GOOD);
    assert_eq!((c.refunds_owed, c.e), (MIN, -1));
    assert_eq!(claim(&mut c, "erin.near", &[0]), (0, MIN));
    assert_eq!(c.refunds_owed, 0);
    assert_inv(&c);
}

#[test]
fn empty_week_writes_no_record() {
    let mut c = setup(&["c0.near"]);
    settle(&mut c, W + SEC);
    assert!(c.fires.get(&0).is_none());
    assert_eq!(c.current_fire().week.0, 1);
    assert_eq!(c.get_fire(U64(0)).outcome, Outcome::Smothered);
}

#[test]
fn causes_rotate() {
    let mut c = setup(&["c0.near", "c1.near", "c2.near"]);
    for (k, want) in [1u32, 2, 0].iter().enumerate() {
        settle(&mut c, (k as u64 + 1) * W + SEC);
        assert_eq!(c.pin.cause, *want);
    }
}

// ------------------------------------------------------------------ payout

#[test]
fn payout_success() {
    let mut c = setup(&["c0.near"]);
    fire0_caught(&mut c);
    resolve(&mut c, 0, true);
    assert_eq!(c.fires.get(&0).unwrap().payout, PayoutStatus::Paid);
    assert_eq!(c.payouts_owed, 0);
    assert!(c.due_weeks.is_empty());
}

#[test]
#[should_panic(expected = "NOT_DUE")]
fn payout_twice_rejected() {
    let mut c = setup(&["c0.near"]);
    fire0_caught(&mut c);
    ctx("anyone.near", W + SEC, 0);
    c.payout(U64(0));
    c.payout(U64(0));
}

#[test]
fn lazy_settlement_triggers_one_payout() {
    let mut c = setup(&["c0.near"]);
    fire0_caught(&mut c);
    give(&mut c, "zed.near", W + 5 * SEC, MIN + FEE, None);
    assert_eq!(c.fires.get(&0).unwrap().payout, PayoutStatus::Sending);
}

#[test]
fn failed_payout_kills_cause_and_carries() {
    let mut c = setup(&["c0.near", "c1.near"]);
    fire0_caught(&mut c);
    resolve(&mut c, 0, false);
    assert!(c.causes[0].dead);
    assert_eq!(c.carry_total, 117 * ONE_NEAR / 100);
    assert_eq!(c.pin.cause, 1);
    for (i, who) in ["a1", "a2", "a3", "a4", "a5"].iter().enumerate() {
        give(&mut c, &format!("{who}.near"), W + (i as u64 + 1) * SEC, MIN + FEE, None);
    }
    settle(&mut c, 2 * W + SEC);
    resolve(&mut c, 1, true);
    assert_eq!((c.carry_total, c.payouts_owed), (0, 0));
    assert_eq!(c.pin.cause, 1); // skips dead c0
    assert_inv(&c);
}

#[test]
fn carry_slices_requeue_under_own_week() {
    let mut c = setup(&["c0.near", "c1.near", "c2.near"]);
    fire0_caught(&mut c);
    resolve(&mut c, 0, false);
    for (i, who) in ["a1", "a2", "a3", "a4", "a5"].iter().enumerate() {
        give(&mut c, &format!("{who}.near"), W + (i as u64 + 1) * SEC, MIN + FEE, None);
    }
    settle(&mut c, 2 * W + SEC);
    resolve(&mut c, 1, false);
    let q: Vec<(u64, u128)> = c.carry.iter().copied().collect();
    assert!(q.contains(&(0, 117 * ONE_NEAR / 100)));
    assert!(q.iter().any(|&(w, _)| w == 1));
    assert!(!c.extinguished);
}

#[test]
fn extinguished_refunds_carry_pro_rata() {
    let mut c = setup(&["c0.near"]);
    fire0_caught(&mut c);
    resolve(&mut c, 0, false);
    assert!(c.extinguished);
    let (good, near) = claim(&mut c, "alice.near", &[0]);
    assert_eq!(good, 82_000 * ONE_GOOD);
    assert_eq!(near, 117 * ONE_NEAR / 100 * 10 / 13);
    assert_inv(&c);
}

#[test]
#[should_panic(expected = "EXTINGUISHED")]
fn give_disabled_after_extinguished() {
    let mut c = setup(&["c0.near"]);
    fire0_caught(&mut c);
    resolve(&mut c, 0, false);
    give(&mut c, "zed.near", W + 10 * SEC, ONE_NEAR, None);
}

#[test]
fn open_fire_smothers_after_extinguished() {
    let mut c = setup(&["c0.near"]);
    fire0_caught(&mut c);
    for (i, who) in ["a1", "a2", "a3", "a4", "a5"].iter().enumerate() {
        give(&mut c, &format!("{who}.near"), W + (i as u64 + 2) * SEC, MIN + FEE, None);
    }
    // first give triggered payout(0) → Sending; it fails now
    ctx("goodcoin.near", W + 10 * SEC, 0);
    c.on_payout(U64(0), Err(PromiseError::Failed));
    settle(&mut c, 2 * W + SEC);
    assert_eq!(c.fires.get(&1).unwrap().outcome, Outcome::Smothered);
    assert_eq!(claim(&mut c, "a1.near", &[1]).1, MIN);
}

// ------------------------------------------------------------------ claims

#[test]
fn claim_shares_match_weights() {
    let mut c = setup(&["c0.near"]);
    fire0_caught(&mut c);
    assert_eq!(claim(&mut c, "alice.near", &[0]).0, 82_000 * ONE_GOOD);
    assert_eq!(claim(&mut c, "bob.near", &[0]).0, 6_000 * ONE_GOOD);
    assert_eq!(claim(&mut c, "carol.near", &[0]).0, 8_000 * ONE_GOOD);
    assert_eq!(c.ft_balance_of(acc("alice.near")).0, 82_000 * ONE_GOOD);
    assert_eq!(c.earmarked, 8_000 * ONE_GOOD);
    assert_inv(&c);
}

#[test]
#[should_panic(expected = "NOTHING_TO_CLAIM")]
fn double_claim_rejected() {
    let mut c = setup(&["c0.near"]);
    fire0_caught(&mut c);
    claim(&mut c, "alice.near", &[0]);
    claim(&mut c, "alice.near", &[0]);
}

#[test]
#[should_panic(expected = "ATTACH_STORAGE_DEPOSIT")]
fn claim_requires_storage_deposit() {
    let mut c = setup(&["c0.near"]);
    fire0_caught(&mut c);
    ctx("alice.near", W + SEC, 0);
    c.claim(vec![U64(0)]);
}

#[test]
#[should_panic(expected = "NOT_SETTLED")]
fn claim_unsettled() {
    let mut c = setup(&["c0.near"]);
    give(&mut c, "alice.near", SEC, ONE_NEAR, None);
    claim(&mut c, "alice.near", &[0]);
}

#[test]
fn failed_refund_reopens() {
    let mut c = setup(&["c0.near"]);
    give(&mut c, "erin.near", SEC, MIN + FEE, None);
    settle(&mut c, W + SEC);
    claim(&mut c, "erin.near", &[0]);
    ctx("goodcoin.near", W + SEC, 0);
    c.on_refund(acc("erin.near"), vec![(U64(0), RefundKind::Smother, U128(MIN))], Err(PromiseError::Failed));
    assert_eq!(c.refunds_owed, MIN);
    assert_eq!(claim(&mut c, "erin.near", &[0]).1, MIN);
}

#[test]
fn close_cancels_unclaimed_and_shrinks_cap() {
    let mut c = setup(&["c0.near"]);
    fire0_caught(&mut c);
    claim(&mut c, "alice.near", &[0]);
    let t = W + 52 * W;
    for _ in 0..4 {
        settle(&mut c, t);
    }
    let cap = c.max_supply;
    ctx("anyone.near", t, 0);
    c.close(U64(0));
    assert_eq!(c.max_supply, cap - 22_000 * ONE_GOOD);
    assert_eq!(c.earmarked, 0);
    assert_inv(&c);
}

#[test]
#[should_panic(expected = "TOO_EARLY")]
fn close_too_early() {
    let mut c = setup(&["c0.near"]);
    fire0_caught(&mut c);
    ctx("anyone.near", 10 * W, 0);
    c.close(U64(0));
}

// ------------------------------------------------------------------ redeem

#[test]
fn redeem_at_floor() {
    let mut c = setup(&["c0.near"]);
    fire0_caught(&mut c);
    claim(&mut c, "alice.near", &[0]);
    let (h0, b0) = (c.hearth, c.backed());
    ctx("alice.near", W + SEC, 0);
    let near = c.redeem(U128(10_000 * ONE_GOOD)).0;
    assert_eq!(near, crate::math::mul_div(10_000 * ONE_GOOD, h0, b0));
    assert!(crate::math::floor_ge(c.hearth, c.backed(), h0, b0));
    assert_eq!(c.total_burned, 10_000 * ONE_GOOD);
    ctx("goodcoin.near", W + SEC, 0);
    c.on_redeem(U128(near), Err(PromiseError::Failed));
    assert_eq!(c.hearth, h0);
    assert_inv(&c);
}

#[test]
#[should_panic(expected = "INSUFFICIENT_BALANCE")]
fn redeem_more_than_balance() {
    let mut c = setup(&["c0.near"]);
    ctx("alice.near", SEC, 0);
    c.redeem(U128(1));
}

#[test]
fn redeem_not_blocked_by_unsettled_fires() {
    let mut c = setup(&["c0.near"]);
    fire0_caught(&mut c);
    claim(&mut c, "alice.near", &[0]);
    ctx("alice.near", 100 * W, 0);
    assert!(c.redeem(U128(ONE_GOOD)).0 > 0);
}

// ------------------------------------------------------------------ kindle

/// Fire 0 caught (goal → 5), fire 1 smothered (goal → 4), fire 2 has 3 of 4 givers.
fn three_of_four(c: &mut Contract) {
    fire0_caught(c);
    claim(c, "alice.near", &[0]);
    give(c, "erin.near", W + 40 * SEC, MIN + FEE, None);
    settle(c, 2 * W + SEC);
    for (i, who) in ["frank", "gina", "hank"].iter().enumerate() {
        give(c, &format!("{who}.near"), 2 * W + 80 * SEC + i as u64 * SEC, MIN + FEE, None);
    }
}

#[test]
fn kindle_rescues_without_raising_goal() {
    let mut c = setup(&["c0.near", "c1.near"]);
    three_of_four(&mut c);
    let e_before = c.e;
    ctx("alice.near", 2 * W + 330 * SEC, 0);
    let quote = c.kindle_quote(U64(2)).unwrap().0;
    let expected = crate::math::mul3_div2_ceil(1, 1000 * MIN, c.backed(), BPS, c.hearth);
    assert_eq!(quote, expected);
    assert_eq!(c.kindle(U64(2)).0, quote);
    settle(&mut c, 3 * W + SEC);
    assert_eq!(c.fires.get(&2).unwrap().outcome, Outcome::Caught);
    assert_eq!(c.e, e_before);
    assert_inv(&c);
}

#[test]
#[should_panic(expected = "NOT_RESCUE_WINDOW")]
fn kindle_outside_window() {
    let mut c = setup(&["c0.near", "c1.near"]);
    three_of_four(&mut c);
    ctx("alice.near", 2 * W + 300 * SEC, 0);
    c.kindle(U64(2));
}

#[test]
#[should_panic(expected = "TOO_FAR_FROM_GOAL")]
fn kindle_too_far() {
    let mut c = setup(&["c0.near"]);
    fire0_caught(&mut c);
    claim(&mut c, "alice.near", &[0]);
    give(&mut c, "erin.near", W + 40 * SEC, MIN + FEE, None);
    ctx("alice.near", W + 330 * SEC, 0);
    c.kindle(U64(1));
}

#[test]
#[should_panic(expected = "INSUFFICIENT_BALANCE")]
fn kindle_needs_good() {
    let mut c = setup(&["c0.near", "c1.near"]);
    three_of_four(&mut c);
    ctx("nobody.near", 2 * W + 330 * SEC, 0);
    c.kindle(U64(2));
}

// ------------------------------------------------------------------ views

#[test]
fn fire_card_is_svg() {
    let mut c = setup(&["c0.near"]);
    give(&mut c, "alice.near", SEC, ONE_NEAR, None);
    let svg = c.fire_card(U64(0));
    assert!(svg.starts_with("<svg") && svg.contains("1 / 4 givers"));
}

// ------------------------------------------------------------------ property test

mod prop {
    use super::*;
    use proptest::prelude::*;

    #[derive(Debug, Clone)]
    enum Op {
        Give(u8, u8, bool),
        Settle,
        Payout(bool),
        Claim(u8),
        Redeem(u8, u8),
        Kindle(u8),
        Advance(u16),
    }

    fn op() -> impl Strategy<Value = Op> {
        prop_oneof![
            5 => (0u8..10, 2u8..30, any::<bool>()).prop_map(|(a, n, s)| Op::Give(a, n, s)),
            1 => Just(Op::Settle),
            2 => any::<bool>().prop_map(Op::Payout),
            2 => (0u8..10).prop_map(Op::Claim),
            1 => (0u8..10, 1u8..100).prop_map(|(a, p)| Op::Redeem(a, p)),
            2 => (0u8..10).prop_map(Op::Kindle),
            3 => (1u16..200).prop_map(Op::Advance),
        ]
    }

    fn name(i: u8) -> String {
        format!("u{i}.near")
    }

    /// Weeks where `who` has something to claim (mirrors `claim`'s rules).
    fn claimable(c: &Contract, who: &AccountId) -> Vec<u64> {
        (0..c.next_to_settle)
            .filter(|&w| {
                let (Some(g), Some(f)) = (c.gifts.get(&(w, who.clone())), c.fires.get(&w)) else { return false };
                let share = f.outcome == Outcome::Caught && !g.claimed_share && !f.closed
                    && crate::math::mul_div(f.minted.0, g.weight.0, f.weight_sum.0) > 0;
                let refund = f.outcome == Outcome::Smothered && !g.claimed_refund;
                let carry = f.carry_refundable.0 > 0 && !g.claimed_carry;
                share || refund || carry
            })
            .rev()
            .take(52)
            .collect()
    }

    proptest! {
        #![proptest_config(ProptestConfig { cases: 24, .. ProptestConfig::default() })]
        #[test]
        fn invariants_hold_over_random_histories(ops in proptest::collection::vec(op(), 1..150)) {
            let mut c = setup(&["c0.near", "c1.near", "c2.near"]);
            let mut t: u64 = SEC;
            for o in ops {
                ctx("viewer.near", t, 0);
                let behind = c.current_week() - c.next_to_settle;
                match o {
                    Op::Advance(s) => t += s as u64 * SEC,
                    Op::Settle if behind > 0 => { settle(&mut c, t); }
                    Op::Give(a, n, s) if behind <= 16 && !c.extinguished => {
                        let spark = s.then(|| name((a + 1) % 10));
                        give(&mut c, &name(a), t, n as u128 * MIN / 2 + FEE, spark.as_deref());
                    }
                    Op::Payout(ok) => {
                        let w = (0..c.next_to_settle).find(|w| c.fires.get(w).map(|f| matches!(f.payout, PayoutStatus::Due | PayoutStatus::Sending)).unwrap_or(false));
                        if let Some(w) = w { resolve(&mut c, w, ok); }
                    }
                    Op::Claim(a) if behind <= 16 => {
                        let weeks = claimable(&c, &acc(&name(a)));
                        if !weeks.is_empty() {
                            // settle_due inside claim may settle more weeks first; claimable weeks stay claimable
                            claim(&mut c, &name(a), &weeks);
                        }
                    }
                    Op::Redeem(a, p) => {
                        let bal = c.good_balance(&acc(&name(a)));
                        if bal > 0 {
                            ctx(&name(a), t, 0);
                            c.redeem(U128((bal * p as u128 / 100).max(1)));
                        }
                    }
                    Op::Kindle(a) if behind == 0 => {
                        let w = c.current_week();
                        if let Some(q) = c.kindle_quote(U64(w))
                            && c.good_balance(&acc(&name(a))) >= q.0 {
                                ctx(&name(a), t, 0);
                                c.kindle(U64(w));
                            }
                    }
                    _ => {}
                }
                ctx("viewer.near", t, 0);
                assert_inv(&c);
                prop_assert!(c.total_minted + c.earmarked <= c.max_supply);
            }
        }
    }
}
