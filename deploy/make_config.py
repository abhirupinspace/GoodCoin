#!/usr/bin/env python3
"""Emit the `new` init args for a GOODCOIN deployment.

usage: make_config.py production|demo <team-account>   (e.g. goodcoin-team-530a20.testnet)

production = spec parameters (DESIGN §7.1, DECISIONS, SIMULATION recommendation).
demo       = same code, minutes-long epochs and tiny targets so the full
             success -> mint -> fail -> burn loop can be shown live. Labeled "demo" on-chain.
"""
import json, sys

ONE = 10**24
SEC = 10**9
MIN = 60 * SEC
DAY = 86_400 * SEC
YEAR = 365 * DAY

def g(n):  # GOOD -> base units as JSON string (U128)
    return str(n * ONE)

def config(kind: str, team: str) -> dict:
    a = lambda n: f"{n}.{team}"
    vesting = [
        {"name": "liquidity", "beneficiary": a("liquidity"), "total": g(150_000_000), "cliff_ns": "0", "duration_ns": str(YEAR)},
        {"name": "ecosystem", "beneficiary": a("ecosystem"), "total": g(100_000_000), "cliff_ns": "0", "duration_ns": str(2 * YEAR)},
        {"name": "contributors", "beneficiary": a("contributors"), "total": g(50_000_000), "cliff_ns": str(182 * DAY), "duration_ns": str(2 * YEAR)},
        {"name": "security", "beneficiary": a("security"), "total": g(50_000_000), "cliff_ns": "0", "duration_ns": str(2 * YEAR)},
    ]
    common = {
        "base_reward": g(25),
        "streak_bonus_bps": 1250,
        "streak_bonus_cap": 8,
        "pg_unlock_per_success": g(1_000),
        "failure_burn_bps": 10,
        "min_attestations": 3,
        "dispute_quorum": 2,
        "reviewer_pool": [a(f"r{i}") for i in range(6)],
        "organizers": [a("org")],
        "vesting": vesting,
        "limits": {"submissions_per_epoch": 5, "attestations_per_epoch": 50, "disputes_per_epoch": 3},
    }
    if kind == "production":
        return {**common,
            "label": "production",
            "epoch_duration_ns": str(7 * DAY),
            "deeds_target": 100,
            "participants_target": 50,
            "dispute_window_ns": str(DAY),
            "gov": {"quorum": 10, "threshold_bps": 6000, "max_per_proposal": g(1_000), "max_per_epoch": g(2_000),
                    "min_voting_ns": str(3 * DAY), "max_voting_ns": str(7 * DAY)},
        }
    if kind == "demo":
        return {**common,
            "label": "demo",
            "epoch_duration_ns": str(6 * MIN),
            "deeds_target": 3,
            "participants_target": 3,
            "dispute_window_ns": str(2 * MIN),
            "gov": {"quorum": 2, "threshold_bps": 6000, "max_per_proposal": g(500), "max_per_epoch": g(1_000),
                    "min_voting_ns": str(1 * MIN), "max_voting_ns": str(10 * MIN)},
        }
    raise SystemExit("kind must be production|demo")

ICON = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E"
        "%3Ccircle cx='32' cy='32' r='30' fill='%2316a34a'/%3E"
        "%3Cpath d='M20 33l8 8 16-18' stroke='white' stroke-width='6' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")

if __name__ == "__main__":
    kind, team = sys.argv[1], sys.argv[2]
    print(json.dumps({"config": config(kind, team), "icon": ICON}))
