"""Daily driver: vesting claimed daily, epoch N settled on day 7(N+1)+1, invariants every step."""
from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np

from .contract import Contract, Status
from .params import Params

SERIES = ("supply_mechanic", "supply_total", "treasury", "locked", "spendable",
          "reserve_remaining", "streak", "rewards_minted", "burned")


@dataclass
class RunResult:
    daily: dict  # name -> np.ndarray (horizon+1,)
    contract: Contract


def run_path(deeds, participants, policy: str, p: Params, horizon_days: int,
             record_daily: bool = True) -> RunResult:
    c = Contract(p, policy)
    n_settle = p.epochs_settled_by(horizon_days)
    if len(deeds) < n_settle or len(participants) < n_settle:
        raise ValueError(f"need {n_settle} epochs of behaviour, got {len(deeds)}")
    settle_on = {p.settle_day(n): n for n in range(n_settle)}
    daily = {k: np.empty(horizon_days + 1) for k in SERIES} if record_daily else None
    for day in range(horizon_days + 1):
        c.claim_vested(day)
        if day in settle_on:
            n = settle_on[day]
            c.settle(float(deeds[n]), float(participants[n]))
        c.check()
        if record_daily:
            for k, v in (("supply_mechanic", c.supply_mechanic), ("supply_total", c.total_supply),
                         ("treasury", c.treasury), ("locked", sum(c.locked)),
                         ("spendable", sum(c.spendable)), ("reserve_remaining", c.reserve_remaining),
                         ("streak", c.streak), ("rewards_minted", c.rewards_minted),
                         ("burned", c.burned_total)):
                daily[k][day] = v
    return RunResult(daily, c)


def summarize(c: Contract, horizon_days: int) -> dict:
    p = c.p
    eps = c.epochs
    rewarded_pe = sum(e.participants for e in eps if e.status == Status.SUCCEEDED)
    rate_per_day = c.earmarked_total / horizon_days
    years = (c.reserve_remaining / rate_per_day / 365.0) if rate_per_day > 0 else math.inf
    return {
        "initial_minted_supply": p.treasury_genesis,
        "final_supply_mechanic": c.supply_mechanic,
        "final_supply_total": c.total_supply,
        "rewards_minted": c.rewards_minted,
        "treasury_unlocked": c.unlocked_total,
        "treasury_distributed": c.distributed,
        "burned": c.burned_total,
        "reserve_remaining": c.reserve_remaining,
        "treasury_balance": c.treasury,
        "successes": sum(e.status != Status.FAILED for e in eps),
        "failures": sum(e.status == Status.FAILED for e in eps),
        "no_reserve": sum(e.status == Status.SUCCEEDED_NO_RESERVE for e in eps),
        "final_streak": c.streak,
        "longest_streak": c.longest,
        "reward_per_participant": (c.earmarked_total / rewarded_pe) if rewarded_pe else math.nan,
        # naive linear extrapolation of this run's earmark rate; inf if nothing earmarked
        "reserve_years_left_linear": years,
    }
