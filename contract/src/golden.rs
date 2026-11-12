//! Replays `tests/golden/basic.json`, produced by the Python reference model (`sim/`), and checks that
//! the contract reaches exactly the same state after every step.
use near_contract_standards::fungible_token::core::FungibleTokenCore;
use near_sdk::json_types::{U64, U128};
use near_sdk::serde_json::{self, Value};

use crate::Contract;
use crate::tests::{acc, ctx};
use crate::types::*;

const TRACE: &str = include_str!("../../tests/golden/basic.json");

fn u(v: &Value) -> u128 {
    v.as_str().map(|s| s.parse().unwrap()).unwrap_or_else(|| v.as_u64().unwrap() as u128)
}
fn name(v: &Value) -> String {
    format!("{}.near", v.as_str().unwrap())
}

#[test]
fn golden_trace_matches_reference_model() {
    let trace: Value = serde_json::from_str(TRACE).unwrap();
    let cfg = &trace["config"];
    let config = Config {
        label: "golden".into(),
        week_ns: U64(u(&cfg["W_ns"]) as u64),
        min_gift: U128(u(&cfg["min_gift"])),
        record_fee: U128(u(&cfg["record_fee"])),
        fee_bps: u(&cfg["fee_bps"]) as u32,
        markup_bps: u(&cfg["markup_bps"]) as u32,
        bounty_bps: u(&cfg["bounty_bps"]) as u32,
        allowance_bps: u(&cfg["allowance_bps"]) as u32,
        seed_good: U128(u(&cfg["seed"])),
        goal_start: u(&cfg["G0"]) as u32,
        goal_min: u(&cfg["Gmin"]) as u32,
        goal_max: u(&cfg["Gmax"]) as u32,
        causes: cfg["causes"]
            .as_array()
            .unwrap()
            .iter()
            .map(|c| CauseInput { account: acc(c.as_str().unwrap()), name: "cause".into(), uri: String::new() })
            .collect(),
    };
    ctx("deployer.near", 0, u(&cfg["H0"]));
    near_sdk::mock::with_mocked_blockchain(|b| {
        b.take_storage();
    });
    let mut c = Contract::new(config);

    let mut t: u64 = 0;
    let steps = trace["steps"].as_array().unwrap();
    let expected = trace["expected"].as_array().unwrap();
    for (step, exp) in steps.iter().zip(expected) {
        if let Some(ts) = step.get("t_ns") {
            t = u(ts) as u64;
        }
        let i = step["i"].as_u64().unwrap();
        match step["op"].as_str().unwrap() {
            "give" => {
                ctx(&name(&step["account"]), t, u(&step["attached"]));
                let spark = step["sparked_by"].as_str().map(|s| acc(&format!("{s}.near")));
                c.give(U64(step["week"].as_u64().unwrap()), step["cause"].as_u64().unwrap() as u32, spark);
            }
            "settle" => {
                ctx("anyone.near", t, 0);
                c.settle();
            }
            "payout" => {
                let w = step["week"].as_u64().unwrap();
                if c.fires.get(&w).unwrap().payout == PayoutStatus::Due {
                    ctx("anyone.near", t, 0);
                    c.payout(U64(w));
                }
                ctx("goodcoin.near", t, 0);
                let ok = step["result"].as_str().unwrap() == "ok";
                c.on_payout(
                    U64(w),
                    if ok { Ok(()) } else { Err(near_sdk::PromiseError::Failed) },
                );
            }
            "claim" => {
                ctx(&name(&step["account"]), t, ONE_NEAR / 100);
                let weeks = step["weeks"].as_array().unwrap().iter().map(|w| U64(w.as_u64().unwrap())).collect();
                c.claim(weeks);
            }
            "kindle" => {
                ctx(&name(&step["account"]), t, 0);
                c.kindle(U64(step["week"].as_u64().unwrap()));
            }
            "redeem" => {
                ctx(&name(&step["account"]), t, 0);
                c.redeem(U128(u(&step["amount"])));
            }
            op => panic!("unknown op {op}"),
        }
        ctx("viewer.near", t, 0);
        let check = |field: &str, got: u128| {
            assert_eq!(got, u(&exp[field]), "step {i}: {field}");
        };
        check("hearth", c.hearth);
        check("B", c.backed());
        check("max_supply", c.max_supply);
        check("total_minted", c.total_minted);
        check("total_burned", c.total_burned);
        check("earmarked", c.earmarked);
        check("carry_total", c.carry_total);
        check("refunds_owed", c.refunds_owed);
        check("payouts_owed", c.payouts_owed);
        check("next_to_settle", c.next_to_settle as u128);
        check("streak", c.streak as u128);
        assert_eq!(c.e as i64, exp["e"].as_i64().unwrap(), "step {i}: e");
        assert_eq!(c.extinguished, exp["extinguished"].as_bool().unwrap(), "step {i}: extinguished");
        for (who, bal) in exp["good"].as_object().unwrap() {
            assert_eq!(c.ft_balance_of(acc(&format!("{who}.near"))).0, u(bal), "step {i}: GOOD of {who}");
        }
        assert!(c.check_invariants().floor_never_decreased, "step {i}: floor");
    }
}
