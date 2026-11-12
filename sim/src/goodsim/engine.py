"""One Monte Carlo path: sampled behaviour (numpy) driving the exact integer protocol model.

Every state transition goes through `protocol.Protocol`, which asserts the floor high-water mark
(H*B_star >= H_star*B) and the other SPEC §8 invariants after every op.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from .protocol import BPS, CAUGHT, NEAR, Config, Protocol, Revert

UNIT = 10**20  # gift granularity: 0.0001 NEAR


@dataclass(frozen=True)
class Scenario:
    name: str
    label: str
    weeks: int = 260
    founders: int = 30
    lam: tuple = ((0, 1.1),)        # (from_week, lambda) schedule
    rho: float = 0.6                # retention
    K: float = 1500.0               # community carrying capacity (logistic damping of new givers)
    inflow: float = 1.0             # baseline new givers / week
    k_disp: float = 2.0             # NegBin dispersion of new givers
    gift_median: float = 2.0        # NEAR (untruncated lognormal median)
    gift_sigma: float = 1.0
    p_spark: float = 0.5
    kindle_mode: str = "rational"   # rational | max | none
    kappa: float = 0.01             # holder's value of a catch per NEAR reaching the cause
    redeem_threshold: float = 0.02  # redeem when market premium over floor below this
    redeem_prob: float = 0.10       # ... each holder with this prob (full balance)
    premium0: float = 0.10
    premium_vol: float = 0.05
    unclaimed: float = 0.03         # givers who never claim (closed after 52 weeks)
    whale: bool = False             # one giver = 50% of every gift total
    pump: tuple | None = None       # (from_week, to_week, cause_idx): colluding cause pads its weeks

    def lam_at(self, n: int) -> float:
        v = self.lam[0][1]
        for w, l in self.lam:
            if n >= w:
                v = l
        return v


SERIES = ("floor", "H", "B", "max_supply", "supply", "earmarked", "base_goal", "givers", "caught",
          "kindled", "streak", "X", "M", "allow_bind", "to_causes", "refunded", "kindle_burned",
          "redeemed", "founder_value", "cum_givers", "bounty_share")


def _gifts(rng, n: int, sc: Scenario, min_gift: float) -> np.ndarray:
    mu = np.log(sc.gift_median)
    x = np.exp(mu + sc.gift_sigma * rng.standard_normal(n))
    bad = x < min_gift
    while bad.any():
        x[bad] = np.exp(mu + sc.gift_sigma * rng.standard_normal(bad.sum()))
        bad = x < min_gift
    return x


def _negbin(rng, mean: float, k: float) -> int:
    if mean <= 0:
        return 0
    return int(rng.negative_binomial(k, k / (k + mean)))


def run(sc: Scenario, cfg: Config, seed: int) -> dict:
    p = Protocol(cfg, atomic=False)
    rng_g = np.random.default_rng([seed, 1])   # givers
    rng_m = np.random.default_rng([seed, 2])   # market / holders
    W = cfg.W
    mg = cfg.min_gift / NEAR
    beta_frac = cfg.markup_bps / (BPS + cfg.markup_bps)
    T = sc.weeks
    out = {k: np.zeros(T) for k in SERIES}
    next_id = 0
    prev: list[int] = []
    premium = sc.premium0
    founder_gpn = None                     # GOOD per NEAR of the first caught fire
    unclaimed_weeks: dict[int, list] = {}
    pump_cost = 0.0
    pump_fakes = 0
    seen = 0

    for n in range(T):
        t0 = n * W + 1
        lam = sc.lam_at(n)
        if n == 0:
            ret = list(range(sc.founders))
            next_id = sc.founders
            m_new = max(lam - sc.rho, 0.0) * sc.founders
        else:
            k_ret = rng_g.binomial(len(prev), sc.rho)
            ret = list(rng_g.choice(prev, k_ret, replace=False)) if k_ret else []
            x = len(prev)
            m_new = max(lam - sc.rho, 0.0) * x * max(0.0, 1.0 - x / sc.K) + sc.inflow
        n_new = _negbin(rng_g, m_new, sc.k_disp)
        new = list(range(next_id, next_id + n_new))
        next_id += n_new
        seen += n_new + (sc.founders if n == 0 else 0)
        sizes = _gifts(rng_g, len(ret) + n_new, sc, mg)
        spark_draw = rng_g.random(n_new)
        cause = p.pin_cause
        bw0 = p.stats.bounty_weight
        given: list[int] = []
        for i, a in enumerate(ret + new):
            g = int(sizes[i] * 10_000) * UNIT
            spark = None
            if i >= len(ret) and given and spark_draw[i - len(ret)] < sc.p_spark:
                spark = given[int(rng_g.integers(len(given)))]
            p.give(t0, a, n, cause, g + cfg.record_fee, spark)
            given.append(a)
        if sc.whale and given:
            f = p.fires[n]
            p.give(t0, -1, n, cause, f.X + cfg.record_fee, None)
        if sc.pump and sc.pump[0] <= n < sc.pump[1] and cause == sc.pump[2]:
            need = p.goal() - p.givers(n)
            for _ in range(max(0, need)):
                pump_fakes += 1
                p.give(t0, -(10**6) - pump_fakes, n, cause, cfg.min_gift + cfg.record_fee, None)
                pump_cost += cfg.record_fee / NEAR
        # ---- rescue window: holders may kindle
        tk = (n + 1) * W - W // 10
        kindled = _kindle(p, sc, tk, n, beta_frac) if sc.kindle_mode != "none" else 0
        # ---- settle + payout
        bg = p.pin_base_goal
        A = p.pin_A
        res = p.settle((n + 1) * W)
        t1 = (n + 1) * W
        f = p.fires.get(n)
        caught = res == [CAUGHT]
        if caught:
            p.payout(n, True)
            if founder_gpn is None:
                founder_gpn = (f.M / 1e24) / (f.X / 1e24)
            nc = []
            u = rng_m.random(len(f.weights))
            for a, ui in zip(list(f.weights), u):
                if ui < sc.unclaimed:
                    nc.append(a)
                else:
                    p.claim(t1, a, [n])
            unclaimed_weeks[n] = nc
        elif f is not None:
            for a in list(f.gifts):
                p.claim(t1, a, [n])
        w_close = n - cfg.close_after_weeks
        if w_close in unclaimed_weeks:
            del unclaimed_weeks[w_close]
            p.close(t1, w_close)
        # ---- market premium + redemptions
        premium = abs(premium + sc.premium_vol * rng_m.standard_normal())
        if premium < sc.redeem_threshold and p.good:
            holders = [a for a, v in p.good.items() if v > 0]
            pick = rng_m.random(len(holders)) < sc.redeem_prob
            for a, yes in zip(holders, pick):
                if yes:
                    p.redeem(a, p.good[a])
        # ---- record
        B = p.B
        out["floor"][n] = p.H / B
        out["H"][n] = p.H / NEAR
        out["B"][n] = B / 1e24
        out["max_supply"][n] = p.max_supply / 1e24
        out["supply"][n] = (p.total_minted - p.total_burned) / 1e24
        out["earmarked"][n] = p.earmarked / 1e24
        out["base_goal"][n] = bg
        out["givers"][n] = p.givers(n)
        out["caught"][n] = caught
        out["kindled"][n] = kindled
        out["streak"][n] = p.streak
        out["X"][n] = (f.X if f else 0) / NEAR
        out["M"][n] = (f.M if (f and caught) else 0) / 1e24
        out["allow_bind"][n] = bool(caught and f.M == A)
        out["to_causes"][n] = p.stats.to_causes / NEAR
        out["refunded"][n] = p.stats.refunded / NEAR
        out["kindle_burned"][n] = p.stats.kindle_burned / 1e24
        out["redeemed"][n] = p.stats.redeemed_near / NEAR
        out["founder_value"][n] = (founder_gpn or 0.0) * out["floor"][n]
        out["cum_givers"][n] = seen
        out["bounty_share"][n] = ((p.stats.bounty_weight - bw0) / f.wsum) if (f and f.wsum) else 0.0
        prev = given

    p.check_full()
    out["final"] = {
        "kindles": p.stats.kindles, "catches": p.stats.catches, "smothers": p.stats.smothers,
        "kindled_catches": p.stats.kindled_catches, "pump_fakes": pump_fakes,
        "pump_cost": pump_cost, "closed_good": p.stats.closed_good / 1e24,
        "record_fees": p.stats.record_fees / NEAR,
        "whale_share": (p.good.get(-1, 0) / max(1, p.total_minted - p.total_burned)) if sc.whale else 0.0,
    }
    return out


def _kindle(p: Protocol, sc: Scenario, t: int, n: int, beta_frac: float) -> int:
    f = p.fires.get(n)
    if f is None or not p.good:
        return 0
    cfg = p.cfg
    bg = p.pin_base_goal
    goal = bg - f.kindled
    short = goal - len(f.gifts)
    if not (0 < short <= max(1, bg // 4)) or f.kindled + short - 1 > cfg.max_kindle_j or goal - short < 1:
        return 0
    # exact cost of `short` kindles (B shrinks after each burn)
    H, B = p.H, p.B
    costs = []
    for j in range(f.kindled, f.kindled + short):
        c = -(-(2**j * cfg.fee_bps * cfg.min_gift * B) // (BPS * H))
        if c >= B:  # cannot burn more than the backed supply: unaffordable for anyone
            return 0
        costs.append(c)
        B -= c
    total = sum(costs)
    if sc.kindle_mode == "max":
        done = 0
        holders = sorted(p.good.items(), key=lambda kv: -kv[1])
        for c in costs:
            for a, _ in holders:
                if p.good[a] >= c:
                    p.kindle(t, a, n)
                    done += 1
                    break
            else:
                break
        return done
    acct, bal = max(p.good.items(), key=lambda kv: kv[1])
    if bal < total:
        return 0
    B0 = p.B
    s = bal / B0
    floor = H / B0
    fee = f.X * cfg.fee_bps / BPS
    value = s * beta_frac * fee + sc.kappa * (f.X - fee)
    cost = (1 - s) * total * floor
    if cost > value:  # both in yocto NEAR
        return 0
    for _ in costs:
        p.kindle(t, acct, n)
    return short
