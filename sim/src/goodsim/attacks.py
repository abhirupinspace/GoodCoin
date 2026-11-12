"""Exact attack pricing (SECURITY §3: A6, A7, A13, A29) on the integer protocol model."""
from __future__ import annotations

from .params import PROD
from .protocol import BPS, NEAR, Protocol

W = PROD.W
F = 1e24


def _honest_fire(p: Protocol, n: int, givers: int, gift: int, extra: dict | None = None) -> None:
    t = n * W + 1
    for i in range(givers):
        p.give(t, f"h{n}_{i}", n, p.pin_cause, gift + PROD.record_fee)
    for a, amt in (extra or {}).items():
        p.give(t, a, n, p.pin_cause, amt + PROD.record_fee)


def _close_week(p: Protocol, n: int) -> None:
    p.settle((n + 1) * W)
    f = p.fires[n]
    if f.status != "caught":
        return
    if p.payout_start(n) == "Sending":
        p.payout_callback(n, True)
    for a in list(f.weights):
        p.claim((n + 1) * W, a, [n])


def collusion(q: float, weeks: int = 8, honest: int = 60) -> dict:
    """Colluder contributes fraction q of every honest fire, then fakes one catch with insiders."""
    p = Protocol(PROD, atomic=False)
    gift = 2 * NEAR
    for n in range(weeks):
        hx = honest * gift
        extra = {"col": int(hx * q / (1 - q))} if q > 0 else {}
        if extra and extra["col"] < PROD.min_gift:
            extra["col"] = PROD.min_gift
        _honest_fire(p, n, honest, gift, extra)
        _close_week(p, n)
    n = weeks
    bal0 = p.good.get("col", 0)
    s = bal0 / p.B
    v0 = bal0 * p.H / p.B
    goal = p.goal()
    t = n * W + 1
    for i in range(goal):
        p.give(t, f"ins{i}", n, p.pin_cause, PROD.min_gift + PROD.record_fee)
    p.settle((n + 1) * W)
    f = p.fires[n]
    assert f.status == "caught"
    for i in range(goal):
        p.claim((n + 1) * W, f"ins{i}", [n])
    minted = sum(p.good.get(f"ins{i}", 0) for i in range(goal))
    v1 = (bal0 + minted) * p.H / p.B
    spent = goal * (PROD.min_gift + PROD.record_fee)
    returned = f.pay  # the cause hands the 90% back off-chain
    cost = spent - returned - (v1 - v0)
    beta = PROD.markup_bps / (BPS + PROD.markup_bps)
    formula = beta * f.fee * (1 - s) + goal * PROD.record_fee
    return {"q": q, "s": s, "goal": goal, "X": f.X / NEAR, "cost": cost / NEAR,
            "cost_pct": 100 * cost / f.X, "formula": formula / NEAR,
            "formula_pct": 100 * formula / f.X}


def sybil(G: int) -> dict:
    """An outsider buys G counted givers in a fire (no collusion with the cause)."""
    p = Protocol(PROD, atomic=False)
    for n in range(3):
        _honest_fire(p, n, 40, 2 * NEAR)
        _close_week(p, n)
    n = 3
    G = min(G, p.goal())
    _honest_fire(p, n, p.goal() - G, 2 * NEAR)
    t = n * W + 1
    for i in range(G):
        p.give(t, f"syb{i}", n, p.pin_cause, PROD.min_gift + PROD.record_fee)
    _close_week(p, n)
    assert p.fires[n].status == "caught"
    good = sum(p.good.get(f"syb{i}", 0) for i in range(G))
    spent = G * (PROD.min_gift + PROD.record_fee)
    value = good * p.H / p.B
    cause = G * PROD.min_gift * (BPS - PROD.fee_bps) // BPS
    return {"G": G, "spent": spent / NEAR, "to_cause": cause / NEAR,
            "good_value": value / NEAR, "net_cost": (spent - value) / NEAR,
            "cause_share_pct": 100 * cause / spent}


def self_spark(n_accounts: int, total_net: int = 10 * NEAR) -> dict:
    """Same net NEAR, given by one account or split into n self-sparked newcomer accounts."""
    p = Protocol(PROD, atomic=False)
    t = 1
    for i in range(30):
        p.give(t, f"h{i}", 0, 0, 2 * NEAR + PROD.record_fee)
    part = total_net // n_accounts
    for k in range(n_accounts):
        amt = part if k < n_accounts - 1 else total_net - part * (n_accounts - 1)
        p.give(t, f"me{k}", 0, 0, amt + PROD.record_fee, "me0" if k else None)
    _close_week(p, 0)
    mine = sum(p.good.get(f"me{k}", 0) for k in range(n_accounts))
    others = sum(p.good.get(f"h{i}", 0) for i in range(30))
    return {"n": n_accounts, "good": mine, "others": others,
            "bounty_moved": p.stats.bounty_weight / NEAR,
            "record_fees": n_accounts * PROD.record_fee / NEAR}


def kindle_prices(max_j: int = 16) -> list[dict]:
    """Kindle j costs 2^j * phi * min_gift NEAR at the floor (exact GOOD at a reference state)."""
    p = Protocol(PROD, atomic=False)
    _honest_fire(p, 0, 40, 2 * NEAR)
    _close_week(p, 0)
    rows, cum = [], 0
    for j in range(max_j + 1):
        c = p.kindle_cost(j)
        near = c * p.H / p.B / NEAR
        cum += near
        rows.append({"j": j, "good": c / F, "near_at_floor": near, "cum_near": cum})
    return rows


def run_all() -> dict:
    sp = [self_spark(n) for n in (1, 2, 5, 10)]
    for r in sp:
        r["gain_yocto"] = r["good"] - sp[0]["good"]
        r["others_delta"] = r["others"] - sp[0]["others"]
    return {
        "collusion": [collusion(q) for q in (0.0, 0.1, 0.25, 0.5, 0.75, 0.9)],
        "sybil": [sybil(G) for G in (1, 5, 10, 27)],
        "self_spark": sp,
        "kindle": kindle_prices(),
    }
