//! Unit tests (spec §16). Time is controlled with `VMContextBuilder::block_timestamp`.
use near_contract_standards::fungible_token::core::FungibleTokenCore;
use near_contract_standards::fungible_token::metadata::FungibleTokenMetadataProvider;
use near_sdk::json_types::{U64, U128};
use near_sdk::test_utils::VMContextBuilder;
use near_sdk::{AccountId, NearToken, testing_env};

use crate::Contract;
use crate::types::*;

const SEC: u64 = 1_000_000_000;
const DAY: u64 = 86_400 * SEC;
const EPOCH: u64 = 7 * DAY;
const T0: u64 = 1_700_000_000 * SEC;

fn acc(s: &str) -> AccountId {
    s.parse().unwrap()
}
fn contract_id() -> AccountId {
    acc("good.near")
}
fn reviewers() -> Vec<AccountId> {
    (0..6).map(|i| acc(&format!("r{i}.near"))).collect()
}
fn good(n: u128) -> u128 {
    n * ONE_GOOD
}

fn ctx(who: &AccountId, t: u64) {
    let mut b = VMContextBuilder::new();
    b.current_account_id(contract_id())
        .predecessor_account_id(who.clone())
        .signer_account_id(who.clone())
        .block_timestamp(t)
        .attached_deposit(NearToken::from_near(1))
        .account_balance(NearToken::from_near(100));
    testing_env!(b.build());
}
fn ctx_no_deposit(who: &AccountId, t: u64) {
    let mut b = VMContextBuilder::new();
    b.current_account_id(contract_id())
        .predecessor_account_id(who.clone())
        .block_timestamp(t)
        .attached_deposit(NearToken::from_yoctonear(0));
    testing_env!(b.build());
}
fn ctx_1yocto(who: &AccountId, t: u64) {
    let mut b = VMContextBuilder::new();
    b.current_account_id(contract_id())
        .predecessor_account_id(who.clone())
        .block_timestamp(t)
        .attached_deposit(NearToken::from_yoctonear(1));
    testing_env!(b.build());
}

fn config() -> Config {
    let y = 365 * DAY;
    Config {
        label: "test".into(),
        epoch_duration_ns: U64(EPOCH),
        deeds_target: 2,
        participants_target: 2,
        base_reward: U128(good(25)),
        streak_bonus_bps: 1_250,
        streak_bonus_cap: 8,
        pg_unlock_per_success: U128(good(1_000)),
        failure_burn_bps: 10,
        min_attestations: 3,
        dispute_window_ns: U64(DAY),
        dispute_quorum: 2,
        reviewer_pool: reviewers(),
        organizers: vec![acc("org.near")],
        vesting: vec![
            VestingSchedule { name: "liquidity".into(), beneficiary: acc("liq.near"), total: U128(good(150_000_000)), cliff_ns: U64(0), duration_ns: U64(y) },
            VestingSchedule { name: "ecosystem".into(), beneficiary: acc("eco.near"), total: U128(good(100_000_000)), cliff_ns: U64(0), duration_ns: U64(2 * y) },
            VestingSchedule { name: "contributors".into(), beneficiary: acc("team.near"), total: U128(good(50_000_000)), cliff_ns: U64(182 * DAY), duration_ns: U64(2 * y) },
            VestingSchedule { name: "security".into(), beneficiary: acc("sec.near"), total: U128(good(50_000_000)), cliff_ns: U64(0), duration_ns: U64(2 * y) },
        ],
        gov: GovConfig {
            quorum: 2,
            threshold_bps: 6_000,
            max_per_proposal: U128(good(500)),
            max_per_epoch: U128(good(800)),
            min_voting_ns: U64(DAY),
            max_voting_ns: U64(EPOCH),
        },
        limits: RateLimits { submissions_per_epoch: 5, attestations_per_epoch: 50, disputes_per_epoch: 3 },
    }
}

fn setup_with(cfg: Config) -> Contract {
    ctx(&acc("deployer.near"), T0);
    Contract::new(cfg, None)
}
fn setup() -> Contract {
    setup_with(config())
}

fn challenge_input(start: u64, end: u64, verify: u64) -> ChallengeInput {
    ChallengeInput {
        name: "Teach a skill".into(),
        description: "Help someone learn something".into(),
        kind: ChallengeKind::Digital,
        category: "education".into(),
        instructions: "Teach, then link a public write-up".into(),
        evidence_requirements: "Public link".into(),
        eligibility: "Anyone".into(),
        open_to: OpenTo::Anyone,
        start_ns: U64(start),
        end_ns: U64(end),
        verification_deadline_ns: U64(verify),
        max_approved: 100,
        target_participants: 10,
        target_approved: 10,
    }
}

/// Published challenge covering the first 10 epochs.
fn with_challenge(c: &mut Contract) -> u32 {
    ctx(&acc("org.near"), T0);
    let id = c.create_challenge(challenge_input(T0, T0 + 10 * EPOCH, T0 + 11 * EPOCH));
    c.publish_challenge(id);
    id
}

fn hash(n: u64) -> String {
    format!("{:064x}", n)
}

fn submit(c: &mut Contract, ch: u32, who: &str, t: u64, n: u64) -> U64 {
    ctx(&acc(who), t);
    c.submit_deed(ch, hash(n), format!("https://example.org/{n}"), "did good".into())
}

fn approve(c: &mut Contract, sid: U64, t: u64) {
    for r in reviewers().iter().take(3) {
        ctx(r, t);
        c.attest(sid, true);
    }
}

/// `n` distinct accounts each get one approved deed in the epoch containing `t`.
fn successful_epoch(c: &mut Contract, ch: u32, t: u64, tag: &str, n: usize, seed: u64) {
    for i in 0..n {
        let sid = submit(c, ch, &format!("{tag}{i}.near"), t, seed + i as u64);
        approve(c, sid, t);
    }
}

fn settle(c: &mut Contract, t: u64) -> u32 {
    ctx(&acc("anyone.near"), t);
    c.settle_epochs()
}

fn assert_invariants(c: &Contract) {
    let i = c.check_invariants();
    assert!(i.supply_equation && i.under_cap && i.allocations_accounted && i.treasury_backed);
}

// ------------------------------------------------------------------ token & supply

#[test]
fn genesis_allocation() {
    let c = setup();
    let s = c.get_supply();
    assert_eq!(s.total_supply.0, TREASURY_ALLOCATION);
    assert_eq!(s.total_minted.0, TREASURY_ALLOCATION);
    assert_eq!(s.reserve_remaining.0, REWARD_RESERVE);
    assert_eq!(s.unvested.0, VESTED_ALLOCATION);
    assert_eq!(s.circulating.0, 0);
    assert_eq!(c.ft_balance_of(contract_id()).0, TREASURY_ALLOCATION);
    let t = c.get_treasury();
    assert_eq!(t[0].1.locked.0, good(125_000_000));
    assert_eq!(t[1].1.locked.0, good(75_000_000));
    assert_eq!(t[2].1.locked.0, good(50_000_000));
    let m = c.ft_metadata();
    assert_eq!((m.symbol.as_str(), m.decimals), ("GOOD", 24));
    assert_invariants(&c);
}

#[test]
#[should_panic(expected = "vesting totals must equal 350M GOOD")]
fn config_rejects_bad_vesting_total() {
    let mut cfg = config();
    cfg.vesting[0].total = U128(good(1));
    setup_with(cfg);
}

#[test]
#[should_panic(expected = "reviewer_pool must be")]
fn config_requires_resolvable_disputes() {
    let mut cfg = config();
    cfg.reviewer_pool.truncate(5);
    setup_with(cfg);
}

#[test]
fn vesting_linear_cliff_and_cap() {
    let mut c = setup();
    ctx(&acc("liq.near"), T0 + 365 * DAY / 2);
    let half = c.claim_vested(0).0;
    assert_eq!(half, good(75_000_000));
    ctx(&acc("liq.near"), T0 + 10 * 365 * DAY);
    assert_eq!(c.claim_vested(0).0, good(75_000_000));
    assert_eq!(c.get_vesting()[0].claimed.0, good(150_000_000));
    assert_invariants(&c);
}

#[test]
#[should_panic(expected = "nothing vested to claim")]
fn vesting_cliff_blocks_early_claim() {
    let mut c = setup();
    ctx(&acc("team.near"), T0 + 100 * DAY);
    c.claim_vested(2);
}

#[test]
#[should_panic(expected = "only the beneficiary")]
fn vesting_only_beneficiary() {
    let mut c = setup();
    ctx(&acc("mallory.near"), T0 + 100 * DAY);
    c.claim_vested(0);
}

#[test]
#[should_panic(expected = "nothing vested to claim")]
fn vesting_cannot_double_claim() {
    let mut c = setup();
    ctx(&acc("liq.near"), T0 + 400 * DAY);
    c.claim_vested(0);
    c.claim_vested(0);
}

#[test]
fn reward_transfer_works() {
    let mut c = setup();
    let ch = with_challenge(&mut c);
    successful_epoch(&mut c, ch, T0 + DAY, "u", 2, 0);
    settle(&mut c, T0 + EPOCH + DAY);
    ctx(&acc("u0.near"), T0 + EPOCH + DAY);
    c.claim_reward(U64(0));
    ctx(&acc("u1.near"), T0 + EPOCH + DAY);
    c.claim_reward(U64(0));
    ctx_1yocto(&acc("u0.near"), T0 + EPOCH + DAY);
    c.ft_transfer(acc("u1.near"), U128(good(5)), None);
    assert_eq!(c.ft_balance_of(acc("u0.near")).0, good(20));
    assert_eq!(c.ft_balance_of(acc("u1.near")).0, good(30));
    assert_eq!(c.get_supply().circulating.0, good(50));
    assert_invariants(&c);
}

// ------------------------------------------------------------------ challenges & submissions

#[test]
#[should_panic(expected = "only configured organizers")]
fn only_organizers_create_challenges() {
    let mut c = setup();
    ctx(&acc("mallory.near"), T0);
    c.create_challenge(challenge_input(T0, T0 + EPOCH, T0 + EPOCH));
}

#[test]
#[should_panic(expected = "published challenges are immutable")]
fn published_challenge_is_frozen() {
    let mut c = setup();
    let ch = with_challenge(&mut c);
    ctx(&acc("org.near"), T0);
    c.update_challenge(ch, challenge_input(T0, T0 + 2 * EPOCH, T0 + 2 * EPOCH));
}

#[test]
#[should_panic(expected = "challenge not published")]
fn draft_rejects_submissions() {
    let mut c = setup();
    ctx(&acc("org.near"), T0);
    let ch = c.create_challenge(challenge_input(T0, T0 + EPOCH, T0 + EPOCH));
    submit(&mut c, ch, "u.near", T0 + 1, 1);
}

#[test]
#[should_panic(expected = "challenge has not started")]
fn submission_before_start() {
    let mut c = setup();
    ctx(&acc("org.near"), T0);
    let ch = c.create_challenge(challenge_input(T0 + DAY, T0 + EPOCH, T0 + EPOCH));
    c.publish_challenge(ch);
    submit(&mut c, ch, "u.near", T0 + 1, 1);
}

#[test]
#[should_panic(expected = "submission deadline passed")]
fn submission_after_deadline() {
    let mut c = setup();
    let ch = with_challenge(&mut c);
    submit(&mut c, ch, "u.near", T0 + 10 * EPOCH, 1);
}

#[test]
#[should_panic(expected = "one submission per account per challenge")]
fn one_submission_per_challenge() {
    let mut c = setup();
    let ch = with_challenge(&mut c);
    submit(&mut c, ch, "u.near", T0 + 1, 1);
    submit(&mut c, ch, "u.near", T0 + 2, 2);
}

#[test]
#[should_panic(expected = "duplicate evidence")]
fn duplicate_evidence_rejected() {
    let mut c = setup();
    let ch = with_challenge(&mut c);
    submit(&mut c, ch, "a.near", T0 + 1, 7);
    submit(&mut c, ch, "b.near", T0 + 2, 7);
}

#[test]
#[should_panic(expected = "evidence_hash must be 64 lowercase hex")]
fn malformed_hash_rejected() {
    let mut c = setup();
    let ch = with_challenge(&mut c);
    ctx(&acc("u.near"), T0 + 1);
    c.submit_deed(ch, "XYZ".into(), "https://x.org/a".into(), "d".into());
}

#[test]
#[should_panic(expected = "evidence_uri must start with")]
fn malformed_uri_rejected() {
    let mut c = setup();
    let ch = with_challenge(&mut c);
    ctx(&acc("u.near"), T0 + 1);
    c.submit_deed(ch, hash(1), "javascript:alert(1)".into(), "d".into());
}

#[test]
#[should_panic(expected = "Attach at least")]
fn storage_must_be_paid() {
    let mut c = setup();
    let ch = with_challenge(&mut c);
    ctx_no_deposit(&acc("u.near"), T0 + 1);
    c.submit_deed(ch, hash(1), "https://x.org/a".into(), "d".into());
}

#[test]
#[should_panic(expected = "submission rate limit")]
fn submission_rate_limit() {
    let mut c = setup();
    ctx(&acc("org.near"), T0);
    let ids: Vec<u32> = (0..6)
        .map(|_| {
            let id = c.create_challenge(challenge_input(T0, T0 + EPOCH, T0 + EPOCH));
            c.publish_challenge(id);
            id
        })
        .collect();
    for (n, ch) in ids.into_iter().enumerate() {
        submit(&mut c, ch, "spammer.near", T0 + 1, n as u64);
    }
}

#[test]
#[should_panic(expected = "challenge open to verified contributors only")]
fn verified_only_challenge() {
    let mut c = setup();
    ctx(&acc("org.near"), T0);
    let mut input = challenge_input(T0, T0 + EPOCH, T0 + EPOCH);
    input.open_to = OpenTo::VerifiedContributors;
    let ch = c.create_challenge(input);
    c.publish_challenge(ch);
    submit(&mut c, ch, "newbie.near", T0 + 1, 1);
}

// ------------------------------------------------------------------ verification

#[test]
fn three_distinct_attestations_approve_and_count() {
    let mut c = setup();
    let ch = with_challenge(&mut c);
    let sid = submit(&mut c, ch, "u.near", T0 + 1, 1);
    ctx(&reviewers()[0], T0 + 2);
    c.attest(sid, true);
    ctx(&reviewers()[1], T0 + 2);
    c.attest(sid, true);
    assert_eq!(c.get_submission(sid).unwrap().submission.status, SubmissionStatus::Pending);
    ctx(&reviewers()[2], T0 + 2);
    c.attest(sid, true);
    let v = c.get_submission(sid).unwrap();
    assert_eq!(v.submission.status, SubmissionStatus::Approved);
    assert!(!v.finalized);
    let e = c.get_epoch(U64(0)).record;
    assert_eq!((e.approved_deeds, e.participants), (1, 1));
    ctx(&acc("x.near"), T0 + 2 + DAY);
    assert!(c.get_submission(sid).unwrap().finalized);
    assert!(c.get_account(acc("u.near")).verified_contributor);
}

#[test]
#[should_panic(expected = "cannot attest your own submission")]
fn self_attestation_rejected() {
    let mut c = setup();
    let ch = with_challenge(&mut c);
    let sid = submit(&mut c, ch, "r0.near", T0 + 1, 1);
    ctx(&reviewers()[0], T0 + 2);
    c.attest(sid, true);
}

#[test]
#[should_panic(expected = "already attested")]
fn duplicate_attestation_rejected() {
    let mut c = setup();
    let ch = with_challenge(&mut c);
    let sid = submit(&mut c, ch, "u.near", T0 + 1, 1);
    ctx(&reviewers()[0], T0 + 2);
    c.attest(sid, true);
    c.attest(sid, false);
}

#[test]
#[should_panic(expected = "not an eligible attestor")]
fn sock_puppet_cannot_attest() {
    let mut c = setup();
    let ch = with_challenge(&mut c);
    let sid = submit(&mut c, ch, "u.near", T0 + 1, 1);
    ctx(&acc("sock.near"), T0 + 2);
    c.attest(sid, true);
}

#[test]
fn verified_contributor_can_attest_after_window() {
    let mut c = setup();
    let ch = with_challenge(&mut c);
    let s1 = submit(&mut c, ch, "u.near", T0 + 1, 1);
    approve(&mut c, s1, T0 + 2);
    let s2 = submit(&mut c, ch, "v.near", T0 + 3, 2);
    ctx(&acc("u.near"), T0 + 2 + DAY);
    c.attest(s2, true);
    assert_eq!(c.get_submission(s2).unwrap().submission.approvals.len(), 1);
}

#[test]
fn three_rejections_reject() {
    let mut c = setup();
    let ch = with_challenge(&mut c);
    let sid = submit(&mut c, ch, "u.near", T0 + 1, 1);
    for r in reviewers().iter().take(3) {
        ctx(r, T0 + 2);
        c.attest(sid, false);
    }
    let v = c.get_submission(sid).unwrap();
    assert_eq!(v.submission.status, SubmissionStatus::Rejected);
    assert!(v.finalized);
    assert_eq!(c.get_epoch(U64(0)).record.approved_deeds, 0);
}

#[test]
#[should_panic(expected = "verification deadline passed")]
fn attestation_after_deadline() {
    let mut c = setup();
    let ch = with_challenge(&mut c);
    let sid = submit(&mut c, ch, "u.near", T0 + 1, 1);
    ctx(&reviewers()[0], T0 + 11 * EPOCH);
    c.attest(sid, true);
}

// ------------------------------------------------------------------ disputes

fn approved_sub(c: &mut Contract) -> (u32, U64) {
    let ch = with_challenge(c);
    let sid = submit(c, ch, "u.near", T0 + 1, 1);
    approve(c, sid, T0 + 2);
    (ch, sid)
}

#[test]
fn dispute_uncounts_and_overturn_rejects() {
    let mut c = setup();
    let (_, sid) = approved_sub(&mut c);
    ctx(&reviewers()[3], T0 + 3);
    let did = c.open_dispute(sid, "evidence is a stock photo".into());
    assert_eq!(c.get_submission(sid).unwrap().submission.status, SubmissionStatus::Disputed);
    assert_eq!(c.get_epoch(U64(0)).record.approved_deeds, 0);
    assert!(!c.get_account(acc("u.near")).verified_contributor);
    for r in [4, 5] {
        ctx(&reviewers()[r], T0 + 4);
        c.vote_dispute(did, false);
    }
    assert_eq!(c.get_submission(sid).unwrap().submission.status, SubmissionStatus::Rejected);
    assert_eq!(c.list_disputes(None, None)[0].outcome, Some(false));
}

#[test]
fn upheld_dispute_recounts_in_resolution_epoch() {
    let mut c = setup();
    let (_, sid) = approved_sub(&mut c);
    ctx(&reviewers()[3], T0 + 3);
    let did = c.open_dispute(sid, "suspicious".into());
    let t = T0 + EPOCH + 5; // resolved in epoch 1
    for r in [4, 5] {
        ctx(&reviewers()[r], t);
        c.vote_dispute(did, true);
    }
    let v = c.get_submission(sid).unwrap();
    assert_eq!(v.submission.status, SubmissionStatus::Approved);
    assert_eq!(v.submission.approval_epoch, Some(U64(1)));
    assert!(v.finalized);
    assert_eq!(c.get_epoch(U64(0)).record.approved_deeds, 0);
    assert_eq!(c.get_epoch(U64(1)).record.approved_deeds, 1);
}

#[test]
#[should_panic(expected = "original attestors cannot vote")]
fn original_attestor_cannot_judge_dispute() {
    let mut c = setup();
    let (_, sid) = approved_sub(&mut c);
    ctx(&reviewers()[3], T0 + 3);
    let did = c.open_dispute(sid, "x".into());
    ctx(&reviewers()[0], T0 + 4);
    c.vote_dispute(did, true);
}

#[test]
#[should_panic(expected = "dispute opener cannot vote")]
fn opener_cannot_judge_dispute() {
    let mut c = setup();
    let (_, sid) = approved_sub(&mut c);
    ctx(&reviewers()[3], T0 + 3);
    let did = c.open_dispute(sid, "x".into());
    c.vote_dispute(did, false);
}

#[test]
#[should_panic(expected = "dispute window closed")]
fn dispute_after_window() {
    let mut c = setup();
    let (_, sid) = approved_sub(&mut c);
    ctx(&reviewers()[3], T0 + 2 + DAY);
    c.open_dispute(sid, "late".into());
}

#[test]
#[should_panic(expected = "submission already went through a dispute")]
fn one_dispute_per_submission() {
    let mut c = setup();
    let (_, sid) = approved_sub(&mut c);
    ctx(&reviewers()[3], T0 + 3);
    let did = c.open_dispute(sid, "x".into());
    for r in [4, 5] {
        ctx(&reviewers()[r], T0 + 4);
        c.vote_dispute(did, true);
    }
    ctx(&reviewers()[3], T0 + 5);
    c.open_dispute(sid, "again".into());
}

#[test]
#[should_panic(expected = "epoch did not succeed")]
fn disputed_deed_earns_nothing() {
    let mut c = setup();
    let ch = with_challenge(&mut c);
    successful_epoch(&mut c, ch, T0 + 1, "u", 2, 0);
    let sid = c.get_submission_for(ch, acc("u0.near")).unwrap().submission.id;
    ctx(&reviewers()[3], T0 + 3);
    c.open_dispute(sid, "x".into());
    settle(&mut c, T0 + EPOCH + DAY);
    assert_eq!(c.get_epoch(U64(0)).record.status, EpochStatus::Failed);
    ctx(&acc("u1.near"), T0 + EPOCH + DAY);
    c.claim_reward(U64(0));
}

// ------------------------------------------------------------------ epochs & rewards

#[test]
fn successful_epoch_mints_unlocks_and_streaks() {
    let mut c = setup();
    let ch = with_challenge(&mut c);
    successful_epoch(&mut c, ch, T0 + DAY, "u", 3, 0);
    assert_eq!(settle(&mut c, T0 + EPOCH + DAY), 1);
    let r = c.get_epoch(U64(0)).record;
    assert_eq!(r.status, EpochStatus::Succeeded);
    assert_eq!(r.reward_per_participant.0, good(25));
    assert_eq!(r.reward_total.0, good(75));
    assert_eq!(r.unlocked.0, good(1_000));
    let t = c.get_treasury();
    assert_eq!((t[0].1.spendable.0, t[1].1.spendable.0, t[2].1.spendable.0), (good(500), good(300), good(200)));
    let s = c.get_stats();
    assert_eq!((s.current_streak, s.longest_streak, s.successful_epochs), (1, 1, 1));
    assert_eq!(c.get_supply().reserve_earmarked_unclaimed.0, good(75));
    ctx(&acc("u0.near"), T0 + EPOCH + DAY);
    assert_eq!(c.claim_reward(U64(0)).0, good(25));
    assert_eq!(c.get_supply().total_supply.0, TREASURY_ALLOCATION + good(25));
    assert_invariants(&c);
}

#[test]
fn epoch_fails_when_both_targets_missed() {
    let mut c = setup();
    let ch = with_challenge(&mut c);
    successful_epoch(&mut c, ch, T0 + DAY, "solo", 1, 0); // 1 deed, 1 participant vs 2/2
    settle(&mut c, T0 + EPOCH + DAY);
    assert_eq!(c.get_epoch(U64(0)).record.status, EpochStatus::Failed);
}

#[test]
fn epoch_fails_when_only_deeds_target_met() {
    let mut cfg = config();
    cfg.deeds_target = 4;
    cfg.participants_target = 3;
    let mut c = setup_with(cfg);
    ctx(&acc("org.near"), T0);
    let a = c.create_challenge(challenge_input(T0, T0 + 10 * EPOCH, T0 + 11 * EPOCH));
    c.publish_challenge(a);
    let b = c.create_challenge(challenge_input(T0, T0 + 10 * EPOCH, T0 + 11 * EPOCH));
    c.publish_challenge(b);
    // 2 people × 2 challenges = 4 deeds (target met) but 2 participants < 3.
    for (i, who) in ["p.near", "q.near"].iter().enumerate() {
        for (j, ch) in [a, b].iter().enumerate() {
            let sid = submit(&mut c, *ch, who, T0 + DAY, (i * 10 + j) as u64);
            approve(&mut c, sid, T0 + DAY);
        }
    }
    let r = c.get_epoch(U64(0)).record;
    assert_eq!((r.approved_deeds, r.participants), (4, 2));
    settle(&mut c, T0 + EPOCH + DAY);
    assert_eq!(c.get_epoch(U64(0)).record.status, EpochStatus::Failed);
}

#[test]
fn epoch_fails_when_only_participants_target_met() {
    let mut cfg = config();
    cfg.deeds_target = 3;
    cfg.participants_target = 2;
    let mut c = setup_with(cfg);
    let ch = with_challenge(&mut c);
    successful_epoch(&mut c, ch, T0 + DAY, "u", 2, 0); // 2 participants ok, 2 deeds < 3
    settle(&mut c, T0 + EPOCH + DAY);
    assert_eq!(c.get_epoch(U64(0)).record.status, EpochStatus::Failed);
}

#[test]
fn failed_epoch_burns_and_resets_streak_but_keeps_record() {
    let mut c = setup();
    let ch = with_challenge(&mut c);
    for e in 0..3u64 {
        successful_epoch(&mut c, ch, T0 + e * EPOCH + DAY, &format!("e{e}u"), 2, e * 100);
    }
    // epoch 3: nobody
    settle(&mut c, T0 + 4 * EPOCH + DAY);
    let s = c.get_stats();
    assert_eq!((s.current_streak, s.longest_streak, s.successful_epochs, s.failed_epochs), (0, 3, 3, 1));
    let r = c.get_epoch(U64(3)).record;
    assert_eq!(r.status, EpochStatus::Failed);
    let locked_before = TREASURY_ALLOCATION - good(3_000);
    assert_eq!(r.burned.0, locked_before / 1_000);
    assert_eq!(c.get_supply().total_burned.0, r.burned.0);
    assert_invariants(&c);
}

#[test]
fn streak_multiplier_grows_and_caps() {
    let mut c = setup();
    let ch = with_challenge(&mut c);
    for e in 0..3u64 {
        successful_epoch(&mut c, ch, T0 + e * EPOCH + DAY, &format!("e{e}u"), 2, e * 100);
    }
    settle(&mut c, T0 + 3 * EPOCH + DAY);
    let rpp: Vec<u128> = (0..3).map(|e| c.get_epoch(U64(e)).record.reward_per_participant.0).collect();
    assert_eq!(rpp, vec![good(25), good(25) * 11_250 / 10_000, good(25) * 12_500 / 10_000]);
    assert_eq!(c.reward_for_streak(8), good(50));
    assert_eq!(c.reward_for_streak(100), good(50));
}

#[test]
#[should_panic(expected = "can be settled from")]
fn premature_settlement_rejected() {
    let mut c = setup();
    settle(&mut c, T0 + EPOCH + DAY - 1);
}

#[test]
#[should_panic(expected = "can be settled from")]
fn double_settlement_impossible() {
    let mut c = setup();
    assert_eq!(settle(&mut c, T0 + EPOCH + DAY), 1);
    settle(&mut c, T0 + EPOCH + DAY + 5);
}

#[test]
fn settlement_is_bounded_and_ordered() {
    let mut c = setup();
    assert_eq!(settle(&mut c, T0 + 40 * EPOCH), MAX_SETTLE_PER_CALL);
    assert_eq!(c.get_stats().next_to_settle.0, 16);
    assert_eq!(settle(&mut c, T0 + 40 * EPOCH), 16);
    assert_eq!(settle(&mut c, T0 + 40 * EPOCH), 7); // epochs 32..=38 (39 still in window)
    assert_eq!(c.get_stats().failed_epochs, 39);
    assert_invariants(&c);
}

#[test]
#[should_panic(expected = "already claimed")]
fn double_claim_rejected() {
    let mut c = setup();
    let ch = with_challenge(&mut c);
    successful_epoch(&mut c, ch, T0 + DAY, "u", 2, 0);
    settle(&mut c, T0 + EPOCH + DAY);
    ctx(&acc("u0.near"), T0 + EPOCH + DAY);
    c.claim_reward(U64(0));
    c.claim_reward(U64(0));
}

#[test]
#[should_panic(expected = "epoch not settled yet")]
fn claim_before_settlement_rejected() {
    let mut c = setup();
    let ch = with_challenge(&mut c);
    successful_epoch(&mut c, ch, T0 + DAY, "u", 2, 0);
    ctx(&acc("u0.near"), T0 + EPOCH);
    c.claim_reward(U64(0));
}

#[test]
#[should_panic(expected = "no counted approved deed")]
fn non_participant_cannot_claim() {
    let mut c = setup();
    let ch = with_challenge(&mut c);
    successful_epoch(&mut c, ch, T0 + DAY, "u", 2, 0);
    settle(&mut c, T0 + EPOCH + DAY);
    ctx(&acc("mallory.near"), T0 + EPOCH + DAY);
    c.claim_reward(U64(0));
}

#[test]
fn reserve_exhaustion_is_all_or_nothing() {
    let mut cfg = config();
    cfg.base_reward = U128(REWARD_RESERVE / 3 + 1); // 3 participants need > reserve
    let mut c = setup_with(cfg);
    let ch = with_challenge(&mut c);
    successful_epoch(&mut c, ch, T0 + DAY, "u", 3, 0);
    settle(&mut c, T0 + EPOCH + DAY);
    let r = c.get_epoch(U64(0)).record;
    assert_eq!(r.status, EpochStatus::SucceededNoReserve);
    assert_eq!(r.reward_total.0, 0);
    assert_eq!(c.get_supply().reserve_remaining.0, REWARD_RESERVE);
    assert_eq!(c.get_stats().current_streak, 1);
    assert_invariants(&c);
}

#[test]
fn claimable_epochs_view() {
    let mut c = setup();
    let ch = with_challenge(&mut c);
    successful_epoch(&mut c, ch, T0 + DAY, "u", 2, 0);
    settle(&mut c, T0 + EPOCH + DAY);
    assert_eq!(c.get_account(acc("u0.near")).claimable_epochs, vec![U64(0)]);
    ctx(&acc("u0.near"), T0 + EPOCH + DAY);
    c.claim_reward(U64(0));
    assert!(c.get_account(acc("u0.near")).claimable_epochs.is_empty());
}

// ------------------------------------------------------------------ treasury

/// Two verified contributors (u0, u1) and 1,000 GOOD unlocked.
fn funded(c: &mut Contract) -> u64 {
    let ch = with_challenge(c);
    successful_epoch(c, ch, T0 + DAY, "u", 2, 0);
    let t = T0 + EPOCH + DAY;
    settle(c, t);
    t
}

fn proposal(amount: u128, bucket: Bucket) -> ProposalInput {
    ProposalInput {
        title: "Park cleanup kit".into(),
        description: "Gloves and bags for 40 volunteers".into(),
        bucket,
        amount: U128(amount),
        beneficiary: acc("park.near"),
        beneficiary_name: "Park Friends".into(),
        evidence_uri: "https://example.org/park".into(),
        voting_duration_ns: U64(DAY),
    }
}

#[test]
fn proposal_passes_and_executes() {
    let mut c = setup();
    let t = funded(&mut c);
    ctx(&acc("u0.near"), t);
    let pid = c.create_proposal(proposal(good(400), Bucket::Community));
    for v in ["u0.near", "u1.near"] {
        ctx(&acc(v), t + 1);
        c.vote_proposal(pid, true);
    }
    ctx(&acc("anyone.near"), t + DAY);
    assert_eq!(c.finalize_proposal(pid), ProposalStatus::Executed);
    assert_eq!(c.ft_balance_of(acc("park.near")).0, good(400));
    let b = &c.get_treasury()[0].1;
    assert_eq!((b.spendable.0, b.disbursed.0), (good(100), good(400)));
    assert_invariants(&c);
}

#[test]
fn proposal_without_quorum_rejected() {
    let mut c = setup();
    let t = funded(&mut c);
    ctx(&acc("u0.near"), t);
    let pid = c.create_proposal(proposal(good(100), Bucket::Community));
    c.vote_proposal(pid, true);
    ctx(&acc("anyone.near"), t + DAY);
    assert_eq!(c.finalize_proposal(pid), ProposalStatus::Rejected);
    assert_eq!(c.ft_balance_of(acc("park.near")).0, 0);
}

#[test]
#[should_panic(expected = "bucket spendable balance too low")]
fn proposal_limited_by_bucket() {
    let mut c = setup();
    let t = funded(&mut c);
    ctx(&acc("u0.near"), t);
    let pid = c.create_proposal(proposal(good(250), Bucket::Education)); // education spendable = 200
    for v in ["u0.near", "u1.near"] {
        ctx(&acc(v), t + 1);
        c.vote_proposal(pid, true);
    }
    ctx(&acc("anyone.near"), t + DAY);
    c.finalize_proposal(pid);
}

#[test]
#[should_panic(expected = "amount must be in (0, max_per_proposal]")]
fn proposal_cap_enforced() {
    let mut c = setup();
    let t = funded(&mut c);
    ctx(&acc("u0.near"), t);
    c.create_proposal(proposal(good(501), Bucket::Community));
}

#[test]
#[should_panic(expected = "only verified contributors can propose")]
fn unverified_cannot_propose() {
    let mut c = setup();
    let t = funded(&mut c);
    ctx(&acc("mallory.near"), t);
    c.create_proposal(proposal(good(1), Bucket::Community));
}

#[test]
#[should_panic(expected = "must be a verified contributor before voting started")]
fn late_verified_cannot_vote() {
    let mut c = setup();
    let t = funded(&mut c);
    ctx(&acc("u0.near"), t);
    let mut p = proposal(good(1), Bucket::Community);
    p.voting_duration_ns = U64(EPOCH);
    let pid = c.create_proposal(p);
    // New contributor verified after voting started.
    let ch = c.list_challenges(None, None)[0].challenge.id;
    let sid = submit(&mut c, ch, "late.near", t + 1, 999);
    approve(&mut c, sid, t + 1);
    ctx(&acc("late.near"), t + 2 * DAY);
    c.vote_proposal(pid, true);
}

#[test]
#[should_panic(expected = "already voted")]
fn one_account_one_vote() {
    let mut c = setup();
    let t = funded(&mut c);
    ctx(&acc("u0.near"), t);
    let pid = c.create_proposal(proposal(good(1), Bucket::Community));
    c.vote_proposal(pid, true);
    c.vote_proposal(pid, true);
}

#[test]
#[should_panic(expected = "per-epoch funding cap reached")]
fn per_epoch_funding_cap() {
    let mut c = setup();
    let t = funded(&mut c);
    ctx(&acc("u0.near"), t);
    let p1 = c.create_proposal(proposal(good(500), Bucket::Community));
    let p2 = c.create_proposal(proposal(good(300), Bucket::Environment));
    let p3 = c.create_proposal(proposal(good(100), Bucket::Education));
    for p in [p1, p2, p3] {
        for v in ["u0.near", "u1.near"] {
            ctx(&acc(v), t + 1);
            c.vote_proposal(p, true);
        }
    }
    ctx(&acc("anyone.near"), t + DAY);
    c.finalize_proposal(p1);
    c.finalize_proposal(p2); // 800 = cap
    c.finalize_proposal(p3); // exceeds
}

#[test]
#[should_panic(expected = "treasury cannot unregister")]
fn treasury_cannot_unregister() {
    let mut c = setup();
    ctx_1yocto(&contract_id(), T0);
    use near_contract_standards::storage_management::StorageManagement;
    c.storage_unregister(Some(true));
}

// ------------------------------------------------------------------ property-style invariant run

#[test]
fn invariants_hold_over_mixed_history() {
    let mut c = setup();
    let ch = with_challenge(&mut c);
    // Deterministic pseudo-random history over 8 epochs.
    let mut x: u64 = 42;
    let mut next = || {
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        x
    };
    let mut n = 0u64;
    for e in 0..8u64 {
        let people = (next() % 4) as usize; // 0..=3
        for i in 0..people {
            n += 1;
            let sid = submit(&mut c, ch, &format!("e{e}p{i}.near"), T0 + e * EPOCH + DAY, n);
            if next() % 5 == 0 {
                for r in reviewers().iter().take(3) {
                    ctx(r, T0 + e * EPOCH + DAY);
                    c.attest(sid, false);
                }
            } else {
                approve(&mut c, sid, T0 + e * EPOCH + DAY);
            }
        }
        if e > 0 {
            settle(&mut c, T0 + e * EPOCH + DAY + 1);
        }
        assert_invariants(&c);
    }
    settle(&mut c, T0 + 9 * EPOCH);
    let s = c.get_stats();
    assert_eq!(s.successful_epochs + s.failed_epochs, 8);
    assert!(s.longest_streak >= s.current_streak);
    // Claim everything claimable.
    for a in c.list_accounts(None, None) {
        for e in c.get_account(a.0.clone()).claimable_epochs {
            ctx(&a.0, T0 + 9 * EPOCH);
            c.claim_reward(e);
        }
    }
    assert_eq!(c.get_supply().reserve_earmarked_unclaimed.0, 0);
    assert_invariants(&c);
}
