"""Monte Carlo orchestration, sweeps and summary statistics."""
from __future__ import annotations

import os
from concurrent.futures import ProcessPoolExecutor
from dataclasses import replace

import numpy as np

from . import engine
from .engine import SERIES, Scenario
from .params import PROD, cfg_with
from .protocol import e_bounds
from .scenarios import BASE, SCENARIOS, STEADY

F0 = PROD.H0 / PROD.seed  # genesis floor, NEAR per GOOD


def _job(args):
    sc, cfg, seed, keep = args
    o = engine.run(sc, cfg, seed)
    if keep == "all":
        return o
    return {k: o[k] for k in keep} | {"final": o["final"]}


def pmap(jobs: list) -> list:
    workers = min(len(jobs), os.cpu_count() or 4)
    if workers <= 1:
        return [_job(j) for j in jobs]
    with ProcessPoolExecutor(workers) as ex:
        return list(ex.map(_job, jobs, chunksize=max(1, len(jobs) // (workers * 4))))


def stack(runs: list[dict]) -> dict:
    out = {k: np.stack([r[k] for r in runs]) for k in runs[0] if k != "final"}
    out["final"] = [r["final"] for r in runs]
    return out


def run_scenarios(runs: int, seed: int, weeks: int, cfg=PROD, scenarios=SCENARIOS) -> dict:
    jobs = [(replace(sc, weeks=weeks), cfg, seed + i, "all") for sc in scenarios for i in range(runs)]
    res = pmap(jobs)
    return {sc.name: stack(res[j * runs:(j + 1) * runs]) for j, sc in enumerate(scenarios)}


def summarize(name: str, d: dict) -> dict:
    T = d["floor"].shape[1]
    ss = slice(min(STEADY, T - 1), T)
    caught = d["caught"]
    kind = (d["kindled"] > 0) & (caught > 0)
    fin = d["final"]
    y1 = min(51, T - 1)
    q = lambda a: np.percentile(a, [10, 50, 90])  # noqa: E731
    return {
        "scenario": name,
        "catch_rate": float(caught.mean()),
        "catch_rate_ss": float(caught[:, ss].mean()),
        "catch_rate_ss_p10": float(np.percentile(caught[:, ss].mean(1), 10)),
        "catch_rate_ss_p90": float(np.percentile(caught[:, ss].mean(1), 90)),
        "fire0_catch": float(caught[:, 0].mean()),
        "rescue_rate": float(kind.mean()),
        "kindles_per_run": float(np.mean([f["kindles"] for f in fin])),
        "good_burned_m": float(d["kindle_burned"][:, -1].mean() / 1e6),
        "burn_pct_supply": float(np.mean(d["kindle_burned"][:, -1] / np.maximum(1, d["supply"][:, -1] + d["kindle_burned"][:, -1])) * 100),
        "floor_x_1y": q(d["floor"][:, y1] / F0),
        "floor_x_end": q(d["floor"][:, -1] / F0),
        "floor_growth_after_fire0": q(d["floor"][:, -1] / d["floor"][:, 0]),
        "max_supply_end_m": q(d["max_supply"][:, -1] / 1e6),
        "supply_end_m": q(d["supply"][:, -1] / 1e6),
        "to_causes_end": q(d["to_causes"][:, -1]),
        "hearth_end": q(d["H"][:, -1]),
        "refunded_end": q(d["refunded"][:, -1]),
        "founder_value_1y": q(d["founder_value"][:, y1]),
        "founder_value_end": q(d["founder_value"][:, -1]),
        "givers_ss": float(d["givers"][:, ss].mean()),
        "goal_ss": float(d["base_goal"][:, ss].mean()),
        "allow_bind_frac": float(d["allow_bind"].sum() / max(1, caught.sum())),
        "bind_y1": float(d["allow_bind"][:, :52].sum() / max(1, caught[:, :52].sum())),
        "bind_last": float(d["allow_bind"][:, -52:].sum() / max(1, caught[:, -52:].sum())),
        "founder_value_0": float(np.median(d["founder_value"][:, 0])),
        "bounty_share_pct": float(100 * d["bounty_share"][caught > 0].mean()) if caught.any() else 0.0,
        "max_streak": float(d["streak"].max(1).mean()),
        "whale_share": float(np.mean([f["whale_share"] for f in fin])),
        "pump_fakes": float(np.mean([f["pump_fakes"] for f in fin])),
        "closed_good_m": float(np.mean([f["closed_good"] for f in fin]) / 1e6),
    }


def pump_effect(res: dict) -> dict:
    """Common-random-number comparison of the goal-pump scenario against base."""
    b, p = res["base"], res["pump"]
    on, off = slice(104, 156), slice(156, 208)
    return {
        "fake_givers_per_run": float(np.mean([f["pump_fakes"] for f in p["final"]])),
        "fake_cost_sigma_near": float(np.mean([f["pump_cost"] for f in p["final"]])),
        "goal_peak_base": float(b["base_goal"][:, on].max(1).mean()),
        "goal_peak_pump": float(p["base_goal"][:, on].max(1).mean()),
        "smothers_after_base": float((1 - b["caught"][:, off]).sum(1).mean()),
        "smothers_after_pump": float((1 - p["caught"][:, off]).sum(1).mean()),
        "max_supply_end_base_m": float(b["max_supply"][:, -1].mean() / 1e6),
        "max_supply_end_pump_m": float(p["max_supply"][:, -1].mean() / 1e6),
        "to_causes_base": float(b["to_causes"][:, -1].mean()),
        "to_causes_pump": float(p["to_causes"][:, -1].mean()),
    }


def cold_start(seed: int, runs: int, g0s=(4, 6, 8, 10, 12, 14, 16, 20)) -> list[dict]:
    sc = replace(BASE, name="cold", founders=8, weeks=1)
    jobs = []
    for g in g0s:
        cfg = cfg_with(G0=g, Gmin=min(5, g), Gmax=min(10_000, 700 * g))  # SPEC: |e| <= 70
        jobs += [(sc, cfg, seed + i, ("caught", "givers")) for i in range(runs)]
    res = pmap(jobs)
    out = []
    for j, g in enumerate(g0s):
        chunk = res[j * runs:(j + 1) * runs]
        out.append({"G0": g, "p_catch": float(np.mean([r["caught"][0] for r in chunk])),
                    "givers_med": float(np.median([r["givers"][0] for r in chunk]))})
    return out


GOAL_G0 = (5, 10, 20, 40, 80)
GOAL_BOUNDS = ((2, 200), (5, 1000), (5, 10_000), (10, 10_000), (20, 10_000))
PHI = (500, 1000, 1500, 2000)
BETA = (1000, 2500, 5000, 10000)
KAPPA = (0.0, 0.01, 0.05, 0.2)
DISP = (2.0, 10.0, 100.0)
ALPHA = (10, 25, 50, 100)


def valid_bounds(g0: int, gmin: int, gmax: int) -> bool:
    """SPEC §3.1 caps |e| <= 70, i.e. Gmax/G0 <= 1.1^70 (~789) and G0/Gmin likewise."""
    try:
        e_bounds(g0, gmin, gmax)
        return True
    except AssertionError:
        return False


def sweeps(seed: int, runs: int, weeks: int = 156) -> dict:
    sc = replace(BASE, weeks=weeks)
    keep = ("caught", "floor", "to_causes", "kindled", "max_supply", "supply", "allow_bind")
    cells = []
    for g0 in GOAL_G0:
        for gmin, gmax in GOAL_BOUNDS:
            if gmin <= g0 <= gmax and valid_bounds(g0, gmin, gmax):
                cells.append(("goal", (g0, gmin, gmax), sc, cfg_with(G0=g0, Gmin=gmin, Gmax=gmax)))
    for phi in PHI:
        for beta in BETA:
            cells.append(("fee", (phi, beta), sc, cfg_with(fee_bps=phi, markup_bps=beta)))
    for kap in KAPPA:
        cells.append(("kappa", (kap,), replace(sc, kappa=kap), PROD))
    for k in DISP:
        for mode in ("rational", "max"):
            cells.append(("disp", (k, mode), replace(sc, k_disp=k, kindle_mode=mode), PROD))
    for k in DISP:
        for step in (1, 2):
            cells.append(("ratchet", (k, step), replace(sc, k_disp=k), cfg_with(smother_step=step)))
    for al in ALPHA:
        cells.append(("alpha", (al,), sc, cfg_with(allowance_bps=al)))
    jobs = [(s, c, seed + i, keep) for _, _, s, c in cells for i in range(runs)]
    res = pmap(jobs)
    out = {"goal": {}, "fee": {}, "kappa": {}, "disp": {}, "ratchet": {}, "alpha": {}}
    for j, (kind, key, _, _) in enumerate(cells):
        chunk = stack(res[j * runs:(j + 1) * runs])
        out[kind][key] = {
            "catch": float(chunk["caught"].mean()),
            "catch_ss": float(chunk["caught"][:, STEADY:].mean()),
            "floor_x": float(np.median(chunk["floor"][:, -1] / F0)),
            "floor_growth": float(np.median(chunk["floor"][:, -1] / chunk["floor"][:, 0])),
            "to_causes": float(np.median(chunk["to_causes"][:, -1])),
            "rescues": float(((chunk["kindled"] > 0) & (chunk["caught"] > 0)).mean()),
            "max_supply_m": float(np.median(chunk["max_supply"][:, -1]) / 1e6),
            "supply_m": float(np.median(chunk["supply"][:, -1]) / 1e6),
            "bind": float(chunk["allow_bind"].sum() / max(1, chunk["caught"].sum())),
        }
    return out


__all__ = ["run_scenarios", "summarize", "pump_effect", "cold_start", "sweeps", "SERIES", "Scenario"]
