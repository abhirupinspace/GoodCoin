//! GOODCOIN fire factory.
//!
//! `create_fire` launches a new GOODCOIN fire at `<name>.<factory>`: one batch creates the account,
//! funds its storage, deploys the embedded `goodcoin.wasm` (byte-identical to the flagship
//! `goodfire-prod-ab92.testnet`, check `fire_code_sha256()` against its `code_hash`) and calls
//! `new(config)` with the creator's seed. No key is ever added, so every fire is born locked.
//!
//! Creators choose the cycle length, minimum gift, starting goal and causes. The economics
//! (fee, markup, bounty, allowance, record fee, genesis floor) are fixed to production values.
//! No owner, no setters, no upgrade method; the factory's own keys are deleted after deploy.
use near_sdk::json_types::{U64, U128};
use near_sdk::serde_json::json;
use near_sdk::store::Vector;
use near_sdk::{
    AccountId, BorshStorageKey, Gas, NearToken, PanicOnDefault, Promise, PromiseError, env, log, near, require,
};

/// Frozen copy of `contract/target/near/goodcoin.wasm` (code hash E5yjCoi4CfR4svjy3Q24eRr264qgwYeJoVQ4rALzsguh).
pub const FIRE_CODE: &[u8] = include_bytes!("../res/goodcoin.wasm");

const NEAR: u128 = 10u128.pow(24);
const MILLI: u128 = NEAR / 1000;
const SEC: u64 = 1_000_000_000;
/// Storage price: 1 NEAR per 100 kB.
const BYTE_COST: u128 = 10u128.pow(19);
/// Covers the account record and the fire's initial state (metadata, causes, maps).
const STATE_BUFFER: u128 = 100 * MILLI;
/// Smallest Hearth seed a creator may attach.
pub const MIN_SEED: u128 = 100 * MILLI;
/// Genesis floor, identical to production: 1 NEAR backs 1,000,000 GOOD (24 decimals).
const GOOD_PER_NEAR: u128 = 1_000_000;

pub const MIN_CYCLE: u64 = 5 * 60 * SEC;
pub const MAX_CYCLE: u64 = 30 * 86_400 * SEC;
pub const MIN_GIFT: u128 = 50 * MILLI;
pub const MAX_GOAL_START: u32 = 1_000;
pub const MAX_CAUSES: usize = 4;

const GAS_NEW: Gas = Gas::from_tgas(60);
const GAS_CALLBACK: Gas = Gas::from_tgas(15);

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq)]
pub struct CauseInput {
    pub account: AccountId,
    pub name: String,
    pub uri: String,
}

/// What a creator chooses. Everything else is fixed.
#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct FireParams {
    /// Shown on the fire, 1-22 chars; stored on-chain as `community:<label>`.
    pub label: String,
    /// Cycle length in ns, 5 minutes to 30 days.
    pub cycle_ns: U64,
    /// Minimum gift per giver per cycle (yoctoNEAR), at least 0.05 NEAR.
    pub min_gift: U128,
    /// Starting goal in distinct givers, 2-1000. Bounds are derived: min = max(1, start/2), max = start*100.
    pub goal_start: u32,
    /// 1-4 causes, rotated in order.
    pub causes: Vec<CauseInput>,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq)]
pub struct FireRecord {
    pub id: u64,
    pub account: AccountId,
    pub creator: AccountId,
    pub label: String,
    pub cycle_ns: U64,
    pub min_gift: U128,
    pub goal_start: u32,
    pub causes: Vec<CauseInput>,
    pub seed: U128,
    pub created_ns: U64,
}

#[near(serializers = [borsh])]
#[derive(BorshStorageKey)]
enum Key {
    Fires,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Factory {
    fires: Vector<FireRecord>,
}

pub fn valid_name(name: &str) -> bool {
    (2..=32).contains(&name.len())
        && name.bytes().all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
        && !name.starts_with('-')
        && !name.ends_with('-')
        && !name.contains("--")
}

/// NEAR that the new account needs for its code and initial state (excludes the seed).
pub fn storage_cost() -> u128 {
    FIRE_CODE.len() as u128 * BYTE_COST + STATE_BUFFER
}

/// Full `new(config)` arguments for a community fire. Panics on invalid params.
pub fn fire_config(p: &FireParams, seed: u128) -> near_sdk::serde_json::Value {
    let label = p.label.trim();
    require!(!label.is_empty() && label.len() <= 22, "label: 1-22 chars");
    require!((MIN_CYCLE..=MAX_CYCLE).contains(&p.cycle_ns.0), "cycle: 5 minutes to 30 days");
    require!(p.min_gift.0 >= MIN_GIFT, "min_gift >= 0.05 NEAR");
    require!((2..=MAX_GOAL_START).contains(&p.goal_start), "goal_start: 2-1000");
    require!(!p.causes.is_empty() && p.causes.len() <= MAX_CAUSES, "1-4 causes");
    require!(seed >= MIN_SEED, "seed >= 0.1 NEAR");
    let goal_min = (p.goal_start / 2).max(1);
    let goal_max = p.goal_start * 100;
    json!({ "config": {
        "label": format!("community:{label}"),
        "week_ns": p.cycle_ns,
        "min_gift": p.min_gift,
        "record_fee": U128(5 * MILLI),
        "fee_bps": 1000,
        "markup_bps": 2500,
        "bounty_bps": 2500,
        "allowance_bps": 25,
        "seed_good": U128(seed * GOOD_PER_NEAR),
        "goal_start": p.goal_start,
        "goal_min": goal_min,
        "goal_max": goal_max,
        "causes": p.causes,
    }})
}

#[near]
impl Factory {
    #[init]
    pub fn new() -> Self {
        Self { fires: Vector::new(Key::Fires) }
    }

    /// Launch a fire at `<name>.<factory>`. Attach at least `create_cost()`; everything above the
    /// storage cost becomes the Hearth seed. On failure the whole deposit is refunded.
    #[payable]
    pub fn create_fire(&mut self, name: String, params: FireParams) -> Promise {
        require!(valid_name(&name), "name: 2-32 chars of a-z, 0-9, single hyphens");
        let deposit = env::attached_deposit().as_yoctonear();
        let storage = storage_cost();
        require!(deposit >= storage + MIN_SEED, "attach at least create_cost()");
        let seed = deposit - storage;
        let args = fire_config(&params, seed);
        let account: AccountId = format!("{name}.{}", env::current_account_id()).parse().unwrap();
        let creator = env::predecessor_account_id();
        let record = FireRecord {
            id: self.fires.len() as u64,
            account: account.clone(),
            creator,
            label: params.label.trim().to_string(),
            cycle_ns: params.cycle_ns,
            min_gift: params.min_gift,
            goal_start: params.goal_start,
            causes: params.causes,
            seed: U128(seed),
            created_ns: U64(env::block_timestamp()),
        };
        Promise::new(account)
            .create_account()
            .transfer(NearToken::from_yoctonear(storage))
            .deploy_contract(FIRE_CODE.to_vec())
            .function_call(
                "new".to_string(),
                args.to_string().into_bytes(),
                NearToken::from_yoctonear(seed),
                GAS_NEW,
            )
            .then(Self::ext(env::current_account_id()).with_static_gas(GAS_CALLBACK).on_created(record, U128(deposit)))
    }

    #[private]
    pub fn on_created(
        &mut self,
        mut record: FireRecord,
        deposit: U128,
        #[callback_result] result: Result<(), PromiseError>,
    ) -> Option<AccountId> {
        if result.is_err() {
            log!("fire {} not created; refunding {} yocto", record.account, deposit.0);
            Promise::new(record.creator).transfer(NearToken::from_yoctonear(deposit.0)).detach();
            return None;
        }
        record.id = self.fires.len() as u64;
        let account = record.account.clone();
        log!(
            "EVENT_JSON:{}",
            json!({ "standard": "goodcoin_factory", "version": "1.0.0", "event": "fire_created", "data": [{
                "id": record.id, "account": record.account, "creator": record.creator, "label": record.label,
                "cycle_ns": record.cycle_ns, "min_gift": record.min_gift, "goal_start": record.goal_start,
                "seed": record.seed,
            }]})
        );
        self.fires.push(record);
        Some(account)
    }

    // ---------------------------------------------------------------- views

    /// Minimum deposit for `create_fire`: storage for the code and state plus the minimum seed.
    pub fn create_cost(&self) -> U128 {
        U128(storage_cost() + MIN_SEED)
    }

    /// SHA-256 of the embedded fire code (hex). NEAR's `code_hash` is the same digest in base58.
    pub fn fire_code_sha256(&self) -> String {
        env::sha256(FIRE_CODE).iter().map(|b| format!("{b:02x}")).collect()
    }

    pub fn count(&self) -> u64 {
        self.fires.len() as u64
    }

    pub fn list_created(&self, from: U64, limit: Option<u64>) -> Vec<FireRecord> {
        let limit = limit.unwrap_or(50).min(100);
        (from.0..(from.0 + limit).min(self.fires.len() as u64))
            .filter_map(|i| self.fires.get(i as u32).cloned())
            .collect()
    }

    pub fn bounds(&self) -> near_sdk::serde_json::Value {
        json!({
            "min_cycle_ns": U64(MIN_CYCLE), "max_cycle_ns": U64(MAX_CYCLE), "min_gift": U128(MIN_GIFT),
            "max_goal_start": MAX_GOAL_START, "max_causes": MAX_CAUSES, "min_seed": U128(MIN_SEED),
            "storage": U128(storage_cost()),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::{VMContextBuilder, get_logs};
    use near_sdk::testing_env;

    fn params() -> FireParams {
        FireParams {
            label: "oss sprint".into(),
            cycle_ns: U64(600 * SEC),
            min_gift: U128(100 * MILLI),
            goal_start: 3,
            causes: vec![CauseInput { account: "dao.testnet".parse().unwrap(), name: "DAO".into(), uri: "".into() }],
        }
    }

    fn ctx(deposit: u128) {
        testing_env!(
            VMContextBuilder::new()
                .current_account_id("fires.testnet".parse().unwrap())
                .predecessor_account_id("alice.testnet".parse().unwrap())
                .attached_deposit(NearToken::from_yoctonear(deposit))
                .prepaid_gas(Gas::from_tgas(300))
                .build()
        );
    }

    #[test]
    fn names() {
        for ok in ["ab", "oss-sprint", "fire-2026", "a1"] {
            assert!(valid_name(ok), "{ok}");
        }
        for bad in ["a", "-ab", "ab-", "a--b", "Ab", "a.b", "a_b", &"x".repeat(33)] {
            assert!(!valid_name(bad), "{bad}");
        }
    }

    #[test]
    fn config_fixes_economics_and_derives_bounds() {
        let v = fire_config(&params(), 2 * NEAR);
        let c = &v["config"];
        assert_eq!(c["label"], "community:oss sprint");
        assert_eq!(c["fee_bps"], 1000);
        assert_eq!(c["markup_bps"], 2500);
        assert_eq!(c["allowance_bps"], 25);
        assert_eq!(c["record_fee"], "5000000000000000000000");
        assert_eq!(c["seed_good"], (2 * NEAR * GOOD_PER_NEAR).to_string());
        assert_eq!((c["goal_min"].as_u64(), c["goal_max"].as_u64()), (Some(1), Some(300)));
    }

    #[test]
    #[should_panic(expected = "cycle: 5 minutes to 30 days")]
    fn rejects_short_cycle() {
        let mut p = params();
        p.cycle_ns = U64(60 * SEC);
        fire_config(&p, NEAR);
    }

    #[test]
    #[should_panic(expected = "min_gift >= 0.05 NEAR")]
    fn rejects_tiny_gift() {
        let mut p = params();
        p.min_gift = U128(MILLI);
        fire_config(&p, NEAR);
    }

    #[test]
    #[should_panic(expected = "1-4 causes")]
    fn rejects_too_many_causes() {
        let mut p = params();
        p.causes = (0..5)
            .map(|i| CauseInput { account: format!("d{i}.testnet").parse().unwrap(), name: "x".into(), uri: "".into() })
            .collect();
        fire_config(&p, NEAR);
    }

    #[test]
    fn cost_covers_code_state_and_seed() {
        ctx(0);
        let f = Factory::new();
        assert_eq!(f.create_cost().0, FIRE_CODE.len() as u128 * BYTE_COST + STATE_BUFFER + MIN_SEED);
        assert!(f.create_cost().0 > 3 * NEAR && f.create_cost().0 < 4 * NEAR);
        assert_eq!(f.fire_code_sha256().len(), 64);
    }

    #[test]
    #[should_panic(expected = "attach at least create_cost()")]
    fn rejects_short_deposit() {
        ctx(storage_cost());
        Factory::new().create_fire("oss".into(), params());
    }

    #[test]
    fn create_then_record_on_success() {
        ctx(storage_cost() + NEAR);
        let mut f = Factory::new();
        f.create_fire("oss".into(), params());
        let rec = FireRecord {
            id: 0,
            account: "oss.fires.testnet".parse().unwrap(),
            creator: "alice.testnet".parse().unwrap(),
            label: "oss sprint".into(),
            cycle_ns: U64(600 * SEC),
            min_gift: U128(100 * MILLI),
            goal_start: 3,
            causes: params().causes,
            seed: U128(NEAR),
            created_ns: U64(0),
        };
        assert_eq!(f.on_created(rec.clone(), U128(NEAR), Ok(())), Some(rec.account.clone()));
        assert_eq!(f.count(), 1);
        assert_eq!(f.list_created(U64(0), None), vec![rec]);
        assert!(get_logs().iter().any(|l| l.contains("\"fire_created\"")));
        assert_eq!(f.on_created(f.list_created(U64(0), None)[0].clone(), U128(NEAR), Err(PromiseError::Failed)), None);
        assert_eq!(f.count(), 1);
    }
}
