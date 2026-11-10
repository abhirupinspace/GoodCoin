"""Monte Carlo, mean-path, sensitivity and adversarial analyses."""
from __future__ import annotations

import math

import numpy as np

from . import behavior
from .contract import POLICIES, Contract, Status, streak_multiplier
from .engine import run_path, summarize
from .params import (DISPERSION_K, HORIZON_DAYS, MC_RUNS, SCENARIOS_SPEC, SEED,
                     SPEC_STATED_SUCCESSES, Params)
from .scenarios import SCENARIOS, SPEC_NAMES, ring_topup

DAILY_KEEP = ("supply_mechanic", "supply_total", "treasury", "locked", "spendable",
              "reserve_remaining", "streak")


def scenario_behaviour(name: str, p: Params, runs: int, k: float, seed: int):
    """Sample behaviour once per scenario (common random numbers across policies)."""
    mu_d, mu_p, attack, _ = SCENARIOS[name]
    rng = np.random.default_rng([seed, list(SCENARIOS).index(name)])
    d, n = behavior.sample(rng, mu_d, mu_p, runs, k)
    extra = {}
    if attack == "ring":
        d, n, puppets, fakes = ring_topup(d, n, p)
        extra = {"puppets": puppets, "fakes": fakes}
    md, mp = mu_d.copy(), mu_p.copy()
    if attack == "ring":
        md, mp, _, _ = ring_topup(md, mp, p)
    return d, n, md, mp, extra


def run_all(p: Params, runs: int = MC_RUNS, k: float = DISPERSION_K, seed: int = SEED,
            horizon: int = HORIZON_DAYS):
    """Returns results[scenario][policy] = {mean_path, mc (list of summaries), daily (B only)}."""
    out = {}
    for name in SCENARIOS:
        d, n, md, mp, extra = scenario_behaviour(name, p, runs, k, seed)
        out[name] = {"extra": extra}
        for pol in POLICIES:
            mean_res = run_path(md, mp, pol, p, horizon)
            keep_daily = pol == "B"
            summaries, daily = [], {key: [] for key in DAILY_KEEP}
            for r in range(runs):
                res = run_path(d[r], n[r], pol, p, horizon, record_daily=keep_daily)
                summaries.append(summarize(res.contract, horizon))
                if keep_daily:
                    for key in DAILY_KEEP:
                        daily[key].append(res.daily[key])
            out[name][pol] = {
                "mean_path": summarize(mean_res.contract, horizon),
                "mean_daily": mean_res.daily,
                "mean_epochs": mean_res.contract.epochs,
                "mc": summaries,
                "daily": {key: np.array(v) for key, v in daily.items()} if keep_daily else None,
            }
    return out


def mc_stats(summaries: list, key: str):
    v = np.array([s[key] for s in summaries], dtype=float)
    # "nearest" keeps percentiles well-defined when some runs are inf (no reserve use)
    # nan = metric undefined for that run (e.g. no rewarded epoch) -> excluded
    if np.all(np.isnan(v)):
        return math.nan, math.nan, math.nan
    return (float(np.nanmean(v)), float(np.nanpercentile(v, 10, method="nearest")),
            float(np.nanpercentile(v, 90, method="nearest")))


# ---------------- dispersion sensitivity ----------------

def k_sensitivity(p: Params, runs: int = MC_RUNS, seed: int = SEED):
    n_settle = p.epochs_settled_by(HORIZON_DAYS)
    grid = list(np.round(np.geomspace(0.25, 400, 45), 4)) + [math.inf]
    table = {}
    for k in grid:
        row = {}
        for i, name in enumerate(SPEC_NAMES):
            mu_d, mu_p = SCENARIOS_SPEC[name]
            rng = np.random.default_rng([seed, 99, i])
            d, n = behavior.sample(rng, np.full(n_settle, mu_d), np.full(n_settle, mu_p), runs, k)
            succ = ((d >= p.deeds_target) & (n >= p.participants_target)).sum(axis=1)
            row[name] = float(succ.mean())
            # variant: no per-person deed noise, deeds = floor(P * mu_d/mu_p)
            d_fix = np.floor(n * (mu_d / mu_p) + 1e-9)
            succ_fix = ((d_fix >= p.deeds_target) & (n >= p.participants_target)).sum(axis=1)
            row[name + "_fixed_ratio"] = float(succ_fix.mean())
        table[k] = row
    target = SPEC_STATED_SUCCESSES
    sse = {k: sum((row[s] - target[s]) ** 2 for s in SPEC_NAMES) for k, row in table.items()}
    best_k = min(sse, key=sse.get)
    per_scen = {}
    for s in SPEC_NAMES:
        ks = [k for k in grid if math.isfinite(k)]
        ys = [table[k][s] for k in ks]
        hit = None
        for (k0, y0), (k1, y1) in zip(zip(ks, ys), zip(ks[1:], ys[1:])):
            if (y0 - target[s]) * (y1 - target[s]) <= 0 and y0 != y1:
                hit = k0 + (target[s] - y0) * (k1 - k0) / (y1 - y0)
                break
        per_scen[s] = hit
    return {"grid": grid, "table": table, "best_k": best_k, "best_sse": sse[best_k],
            "per_scenario_k": per_scen}


# ---------------- adversarial ----------------

def duplicate_flood(p: Params, base_approved: float = 110.0, attest_cap: int = 50, subs_cap: int = 5,
                    min_att: int = 3):
    """Exact duplicates: rejected at submit by evidence-hash map (0 attestor load).
    Byte-altered duplicates pass the hash check and need `min_att` rejections each."""
    rows = []
    honest_load = base_approved * min_att
    for flood in (0, 1_000, 10_000, 100_000):
        load = flood * min_att
        rows.append({
            "flood_subs_per_epoch": flood,
            "attacker_accounts_needed": math.ceil(flood / subs_cap),
            "exact_dup_attestations": 0,
            "altered_dup_attestations": load,
            "honest_attestations": honest_load,
            "attestors_needed_at_cap": math.ceil((load + honest_load) / attest_cap),
            "reward_impact_GOOD": 0.0,
        })
    return rows


def ring_analysis(p: Params, results: dict, attest_cap: int = 50, min_att: int = 3):
    mu_d, mu_p = SCENARIOS_SPEC["pessimistic"]
    puppets = max(0, p.participants_target - mu_p)
    fakes = max(puppets, p.deeds_target - mu_d)
    ring_needed = max(min_att, math.ceil(fakes * min_att / attest_cap))
    honest = results["pessimistic"]["B"]
    ring = results["pessimistic_ring"]["B"]
    puppet_reward = sum(e.reward_per_participant * puppets for e in ring["mean_epochs"])
    mc_p = results["pessimistic_ring"]["extra"]["puppets"][:, :8].sum(axis=1)
    mc_f = results["pessimistic_ring"]["extra"]["fakes"][:, :8].sum(axis=1)
    capacity = {r: (r * attest_cap) // min_att for r in (3, 4, 5, 10)}
    rpp_max = p.base_reward * streak_multiplier(p.streak_cap, p)
    return {
        "puppets_per_epoch": puppets, "fakes_per_epoch": fakes, "ring_size_needed": ring_needed,
        "puppet_reward_8ep": puppet_reward,
        "honest_rewards_8ep_with_ring": ring["mean_path"]["rewards_minted"] - puppet_reward,
        "burn_avoided_8ep": honest["mean_path"]["burned"] - ring["mean_path"]["burned"],
        "unlocked_with_ring": ring["mean_path"]["treasury_unlocked"],
        "mc_puppets_mean": float(mc_p.mean()), "mc_fakes_mean": float(mc_f.mean()),
        "ring_capacity_fakes_per_epoch": capacity,
        "max_extraction_per_epoch": {r: c * rpp_max for r, c in capacity.items()},
    }


def _first_no_reserve(p: Params, policy: str, mu_d: float, mu_p: float, days: int):
    c = Contract(p, policy)
    n = p.epochs_settled_by(days)
    for _ in range(n):
        if c.settle(mu_d, mu_p).status == Status.SUCCEEDED_NO_RESERVE:
            return True
    return False


def reserve_exhaustion(p: Params, policy: str = "B"):
    """Smallest reward multiplier X that exhausts the reserve (first SucceededNoReserve) within
    the horizon at optimistic mean participation. Vesting does not affect the reserve, so the
    contract is stepped epoch by epoch."""
    mu_d, mu_p = SCENARIOS_SPEC["optimistic"]
    out = {}
    for label, days in (("60 days", HORIZON_DAYS), ("10 years", 3650)):
        lo, hi = 1.0, 1e7
        assert not _first_no_reserve(p.with_(reward_multiplier=lo), policy, mu_d, mu_p, days)
        for _ in range(80):
            mid = math.sqrt(lo * hi)
            if _first_no_reserve(p.with_(reward_multiplier=mid), policy, mu_d, mu_p, days):
                hi = mid
            else:
                lo = mid
        out[label] = {"X": hi, "epochs": p.epochs_settled_by(days)}
    # closed form for 60 days (8 successes, multipliers 1.0..1.875)
    msum = sum(streak_multiplier(s, p) for s in range(8)) if policy == "B" else 8
    out["60 days"]["X_analytic"] = p.reserve / (mu_p * p.base_reward * msum)
    # reserve-share (C) never exhausts: remaining after n successes = R (1 - bps/1e4)^n
    n10 = p.epochs_settled_by(3650)
    out["C_remaining_10y"] = p.reserve * (1 - p.reserve_share_bps / 1e4) ** n10
    return out


def treasury_depletion(p: Params):
    analytic = math.log(0.5) / math.log(1 - p.burn_bps / 1e4)
    c = Contract(p, "B")
    half = p.treasury_genesis / 2
    n = 0
    while sum(c.locked) > half:
        c.settle(0, 0)
        n += 1
    return {"epochs_analytic": analytic, "years_analytic": analytic * p.epoch_days / 365,
            "epochs_simulated": n, "years_simulated": n * p.epoch_days / 365,
            "burned_60d_all_fail": p.treasury_genesis * (1 - (1 - p.burn_bps / 1e4) ** 8)}
