#!/usr/bin/env python3
"""Emit the `new(config)` arguments for a GOODCOIN deployment.

usage: make_config.py production|demo <team-account> <suffix>

production: 7-day fires, 1 NEAR minimum gift, goal 20 (SPEC §9).
demo:       same code, 6-minute fires, 0.1 NEAR minimum gift, goal 4, labeled "demo" on-chain,
            plus a deletable "ghost" cause used by deploy/e2e.sh to demonstrate dead-cause failover.
Causes are Sputnik DAO treasuries created through sputnik-v2.testnet (testnet placeholders).
"""
import json
import sys

ONE = 10**24
SEC = 10**9


def config(kind: str, team: str, suffix: str) -> dict:
    oss = {"account": f"gf-{suffix}-oss.sputnik-v2.testnet",
           "name": "Open-source maintainers fund (demo DAO)",
           "uri": "https://github.com/abhirupinspace/GoodCoin"}
    climate = {"account": f"gf-{suffix}-climate.sputnik-v2.testnet",
               "name": "Climate action fund (demo DAO)",
               "uri": "https://github.com/abhirupinspace/GoodCoin"}
    common = {
        "record_fee": str(5 * ONE // 1000),
        "fee_bps": 1000,
        "markup_bps": 2500,
        "bounty_bps": 2500,
        "allowance_bps": 25,
        "seed_good": str(1_000_000 * ONE),
    }
    if kind == "production":
        return {**common, "label": "production", "week_ns": str(7 * 86_400 * SEC),
                "min_gift": str(ONE), "goal_start": 20, "goal_min": 5, "goal_max": 10_000,
                "causes": [oss, climate]}
    if kind == "demo":
        ghost = {"account": f"ghost.{team}", "name": "Failover test cause (deleted during the E2E run)",
                 "uri": "https://github.com/abhirupinspace/GoodCoin"}
        return {**common, "label": "demo", "week_ns": str(360 * SEC),
                "min_gift": str(ONE // 10), "goal_start": 4, "goal_min": 2, "goal_max": 100,
                "causes": [oss, ghost, climate]}
    raise SystemExit("kind must be production|demo")


if __name__ == "__main__":
    kind, team, suffix = sys.argv[1], sys.argv[2], sys.argv[3]
    print(json.dumps({"config": config(kind, team, suffix)}))
