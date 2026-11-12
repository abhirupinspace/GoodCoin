"""SPEC rules on the exact integer model (goodsim.protocol)."""
import random
from dataclasses import replace

import pytest

from goodsim.protocol import (BPS, CAUGHT, CARRIED, NEAR, PAID, SENDING, SMOTHERED, Config, Protocol,
                              Revert, base_goal, e_bounds)
from goodsim.trace import DEMO

W = DEMO.W
MG = DEMO.min_gift
RF = DEMO.record_fee
G = MG + RF  # minimal first gift


def mk(**kw) -> Protocol:
    return Protocol(replace(DEMO, **kw))


def fill(p, week, n, prefix="g", amount=G, start=0, t=None):
    t = week * W + 1 if t is None else t
    for i in range(start, start + n):
        p.give(t, f"{prefix}{week}_{i}", week, p.pin_cause, amount)


def settle(p, week):
    return p.settle((week + 1) * W)


# ------------------------------------------------------------------ goal / ratchet
def test_base_goal_exact_rounding():
    assert [base_goal(4, e) for e in (0, 1, 2, 3)] == [4, 5, 5, 6]   # 4.4, 4.84, 5.324 rounded up
    assert [base_goal(4, e) for e in (-1, -2, -7)] == [4, 4, 3]      # 3.63, 3.30, 2.05 rounded up
    assert base_goal(20, 10) == -(-20 * 11**10 // 10**10)


def test_e_bounds():
    assert e_bounds(4, 2, 100) == (-7, 33)
    assert e_bounds(20, 5, 10_000) == (-14, 65)
    for g0, gmin, gmax in ((4, 2, 100), (20, 5, 10_000), (10, 5, 5000)):
        lo, hi = e_bounds(g0, gmin, gmax)
        assert g0 * 11**hi <= gmax * 10**hi
        assert g0 * 11 ** (hi + 1) > gmax * 10 ** (hi + 1)
        assert g0 * 10 ** (-lo) >= gmin * 11 ** (-lo) and g0 * 10 ** (1 - lo) < gmin * 11 ** (1 - lo)
    with pytest.raises(AssertionError):  # SPEC |e| <= 70
        e_bounds(4, 2, 10_000)


def test_ratchet_catch_then_smother_returns():
    p = mk()
    fill(p, 0, 4)
    settle(p, 0)
    assert p.e == 1 and p.pin_base_goal == 5
    settle(p, 1)  # empty week smothers
    assert p.e == 0 and p.pin_base_goal == 4


def test_ratchet_lower_bound_noop():
    p = mk()
    for n in range(12):
        settle(p, n)
        assert p.e == max(-(n + 1), -7)
    assert p.pin_base_goal == 3  # ceil(4 * (10/11)^7) = 3 >= Gmin 2


def test_ratchet_upper_bound_noop():
    p = mk(G0=4, Gmin=2, Gmax=5)  # 4*1.1^2 = 4.84 <= 5 < 5.324: e_max = 2
    assert p.e_max == 2
    for n in range(4):
        fill(p, n, p.pin_base_goal)
        settle(p, n)
        assert p.e == min(n + 1, 2)
    assert p.pin_base_goal == 5


def test_kindled_catch_keeps_e():
    p = _holder_after_fire0()
    settle(p, 1)  # smother: e=0, goal 4
    fill(p, 2, 3)
    p.kindle(3 * W - W // 10, "rich", 2)
    assert settle(p, 2) == [CAUGHT]
    assert p.e == 0 and p.streak == 1


# ------------------------------------------------------------------ give / record fee / min gift
def test_record_fee_first_gift_only_and_min_gift():
    p = mk()
    t = 1
    with pytest.raises(Revert, match="BELOW_MIN_GIFT"):
        p.give(t, "a", 0, 0, G - 1)
    r = p.give(t, "a", 0, 0, G)
    assert r["g"] == MG
    r = p.give(t, "a", 0, 0, 7)  # top-up: no record fee, any amount
    assert r["g"] == 7
    assert p.fires[0].gifts["a"] == MG + 7 and p.storage == RF


def test_give_preconditions_and_atomic_revert():
    p = mk()
    snap = p.snapshot()
    for args, code in (((1, "a", 1, 0, G), "WRONG_WEEK"), ((1, "a", 0, 1, G), "WRONG_CAUSE"),
                       ((1, "c0.near", 0, 0, G), "BAD_GIVER"), ((1, DEMO.contract_id, 0, 0, G), "BAD_GIVER"),
                       ((1, "a", 0, 0, RF), "TOO_SMALL")):
        with pytest.raises(Revert, match=code):
            p.give(*args)
        assert p.snapshot() == snap
    # a revert after lazy settlement rolls the settlement back too
    with pytest.raises(Revert, match="WRONG_CAUSE"):
        p.give(W + 1, "a", 1, 0, G)
    assert p.next_to_settle == 0


# ------------------------------------------------------------------ catch math
def test_catch_fee_and_mint_rounding():
    p = mk()
    odd = MG + 12345
    for i in range(4):
        p.give(1, f"a{i}", 0, 0, odd + RF)
    H, B, A = p.H, p.B, p.pin_A
    settle(p, 0)
    f = p.fires[0]
    X = 4 * odd
    fee = X * 1000 // BPS
    assert (f.fee, f.pay) == (fee, X - fee)
    assert f.M == min(A, fee * B * BPS // (H * (BPS + 2500)))
    assert p.H == H + fee and p.B == B + f.M and p.earmarked == f.M
    for i in range(4):
        p.claim(W, f"a{i}", [0])
    assert p.earmarked == f.M - 4 * (f.M * odd // X) and p.B == B + f.M  # claim leaves B unchanged


def test_allowance_binds():
    p = mk(allowance_bps=1)
    A = p.pin_A
    assert A == p.cfg.max_supply // BPS
    p.give(1, "whale", 0, 0, 10**6 * NEAR)
    for i in range(3):
        p.give(1, f"a{i}", 0, 0, G)
    settle(p, 0)
    assert p.fires[0].M == A


def test_allowance_pinned_at_previous_settle():
    p = mk()
    assert p.pin_A == 25 * 10**33 // BPS
    fill(p, 0, 4)
    settle(p, 0)
    M = p.fires[0].M
    assert p.pin_A == 25 * (10**33 - M) // BPS
    A1 = p.pin_A
    settle(p, 1)  # smother destroys exactly A1
    assert p.max_supply == 10**33 - A1
    assert p.pin_A == 25 * (p.max_supply - M) // BPS


# ------------------------------------------------------------------ spark bounty
def test_bounty_zero_sum_and_cap():
    p = mk()
    p.give(1, "a", 0, 0, 10 * NEAR)
    r = p.give(2, "b", 0, 0, 10 * NEAR, "a")  # g = 10 - 0.005, capped at 1.5 min_gift
    assert r["bounty"] == 2500 * (MG * 3 // 2) // BPS
    f = p.fires[0]
    assert f.weights["a"] == 10 * NEAR - RF + r["bounty"]
    assert f.weights["b"] == 10 * NEAR - RF - r["bounty"]
    assert f.wsum == f.X == sum(f.weights.values())
    r2 = p.give(3, "c", 0, 0, G, "b")  # uncapped: 25% of 0.1
    assert r2["bounty"] == 2500 * MG // BPS


@pytest.mark.parametrize("case", ["self", "absent", "not_newcomer", "earlier_fire", "topup"])
def test_bounty_conditions(case):
    p = mk()
    if case == "self":
        assert p.give(1, "a", 0, 0, G, "a")["bounty"] == 0
    elif case == "absent":
        assert p.give(1, "a", 0, 0, G, "nobody")["bounty"] == 0
    elif case == "not_newcomer" or case == "earlier_fire":
        fill(p, 0, 4)
        p.give(1, "x", 0, 0, G)
        settle(p, 0)
        # x is no longer a newcomer; g0_0 gave in fire 0 only (not in this fire)
        p.give(W + 1, "y", 1, 1, G)
        who, spark = ("x", "y") if case == "not_newcomer" else ("z", "g0_0")
        assert p.give(W + 2, who, 1, 1, G, spark)["bounty"] == 0
    else:
        p.give(1, "s", 0, 0, G)
        p.give(2, "a", 0, 0, G)
        assert p.give(3, "a", 0, 0, G, "s")["bounty"] == 0  # top-up, not first-ever


def test_newcomer_status_used_up_even_if_smothered():
    p = mk()
    p.give(1, "s", 0, 0, G)
    assert p.give(2, "n", 0, 0, G, "s")["bounty"] > 0
    settle(p, 0)  # 2 < 4: smother
    p.give(W + 1, "s", 1, 1, G)
    assert p.give(W + 2, "n", 1, 1, G, "s")["bounty"] == 0


def test_bounty_shares_sum_to_mint():
    p = mk()
    p.give(1, "s", 0, 0, 3 * NEAR)
    for i in range(5):
        p.give(2, f"n{i}", 0, 0, G + i, "s")
    settle(p, 0)
    f = p.fires[0]
    total = sum(p.claim(W, a, [0])["good"] for a in list(f.weights))
    assert total <= f.M and f.M - total < len(f.weights)


# ------------------------------------------------------------------ smother / refunds
def test_smother_refunds_gift_not_record_fee():
    p = mk()
    p.give(1, "a", 0, 0, G + 5)
    assert settle(p, 0) == [SMOTHERED]
    assert p.refunds_owed == MG + 5 and p.streak == 0
    assert p.claim(W, "a", [0])["near"] == MG + 5
    assert p.claim(W, "a", [0])["near"] == 0
    assert p.refunds_owed == 0 and p.storage == RF


def test_failed_refund_reopens():
    p = mk()
    p.give(1, "a", 0, 0, G)
    settle(p, 0)
    assert p.claim(W, "a", [0], ok=False)["near"] == 0
    assert p.refunds_owed == MG
    assert p.claim(W, "a", [0])["near"] == MG


# ------------------------------------------------------------------ kindle
def _holder_after_fire0():
    p = mk()
    p.give(1, "rich", 0, 0, 5 * NEAR)
    fill(p, 0, 3)
    settle(p, 0)
    p.payout(0, True)
    p.claim(W, "rich", [0])
    return p


def test_kindle_preconditions():
    p = _holder_after_fire0()
    settle(p, 1)  # week 1 smothers -> e 0, goal 4
    week, end = 2, 3 * W
    fill(p, week, 2)
    win = end - W // 10
    with pytest.raises(Revert, match="NOT_RESCUE_WINDOW"):
        p.kindle(win - 1, "rich", week)
    with pytest.raises(Revert, match="WRONG_WEEK"):
        p.kindle(win, "rich", 1)
    with pytest.raises(Revert, match="NOT_CLOSE"):  # short 2 > max(1, 4//4)
        p.kindle(win, "rich", week)
    fill(p, week, 1, start=2)
    with pytest.raises(Revert, match="INSUFFICIENT_GOOD"):
        p.kindle(win, "g0_0", week)
    cost = p.kindle_cost(0)
    good, B, H = p.good["rich"], p.B, p.H
    assert p.kindle(win, "rich", week) == cost
    assert cost == -(-(1 * 1000 * MG * B) // (BPS * H))
    assert p.good["rich"] == good - cost and p.B == B - cost and p.goal() == 3
    with pytest.raises(Revert, match="NOT_CLOSE"):  # goal met
        p.kindle(win, "rich", week)


def test_kindle_cost_doubles_and_limits():
    p = mk(G0=100, Gmin=2, Gmax=100)  # big goal: reach is 25 givers
    p.give(1, "rich", 0, 0, 10**6 * NEAR)  # allowance binds: rich owns most of B
    fill(p, 0, 99)
    settle(p, 0)
    p.claim(W, "rich", [0])
    week = 1
    fill(p, week, 100 - 17 - 1)  # e is at e_max: goal stays 100; short 18 <= 25
    win = 2 * W - W // 10
    costs = []
    for j in range(17):
        B, H = p.B, p.H
        costs.append(p.kindle(win, "rich", week))
        assert costs[-1] == -(-(2**j * 1000 * MG * B) // (BPS * H))
    assert all(costs[j + 1] > 1.9 * costs[j] for j in range(16))
    with pytest.raises(Revert, match="KINDLE_MAX"):  # j = 17 > 16
        p.kindle(win, "rich", week)


def test_kindle_goal_min():
    # with G_min >= 2 the NOT_CLOSE rule already prevents goal 1 -> 0; G_min = 1 reaches GOAL_MIN
    p = mk(G0=1, Gmin=1, Gmax=100)
    p.give(1, "rich", 0, 0, 5 * NEAR)
    settle(p, 0)
    p.claim(W, "rich", [0])
    settle(p, 1)  # smother: goal back to 1
    assert p.pin_base_goal == 1
    with pytest.raises(Revert, match="GOAL_MIN"):  # 0 givers, short 1, goal would hit 0
        p.kindle(3 * W - W // 10, "rich", 2)


def test_kindle_floor_rises():
    p = _holder_after_fire0()
    settle(p, 1)
    fill(p, 2, 3)
    H, B = p.H, p.B
    p.kindle(3 * W - W // 10, "rich", 2)
    assert p.H * B > H * p.B


# ------------------------------------------------------------------ redeem
def test_redeem_rounding_and_failure():
    p = _holder_after_fire0()
    H, B = p.H, p.B
    a = 12_345_678_901
    near = p.redeem("rich", a)
    assert near == a * H // B and p.H == H - near and p.B == B - a
    H2, B2 = p.H, p.B
    assert p.redeem("rich", 10**27, ok=False) == 10**27 * H2 // B2
    assert p.H == H2 and p.B == B2 - 10**27  # NEAR added back: floor rises
    with pytest.raises(Revert):
        p.redeem("rich", p.good["rich"] + 1)


# ------------------------------------------------------------------ payout / carry / causes
def test_payout_fail_carry_rotation():
    p = mk(causes=("c0.near", "c1.near", "c2.near"))
    fill(p, 0, 4)
    settle(p, 0)
    assert p.pin_cause == 1
    assert p.payout(0, False) == CARRIED
    assert p.dead == [True, False, False] and p.carry_total == p.fires[0].pay
    fill(p, 1, 5)
    settle(p, 1)
    assert p.pin_cause == 2
    assert p.payout_start(1) == SENDING
    assert p.payouts_owed == p.fires[1].pay + p.fires[0].pay and p.carry_total == 0
    assert p.payout_callback(1, False) == CARRIED  # c1 dies: both slices re-queued under own weeks
    assert p.carry == {0: p.fires[0].pay, 1: p.fires[1].pay}
    settle(p, 2)  # empty smother; next live after c2 wraps to c2
    assert p.pin_cause == 2
    with pytest.raises(Revert, match="NOT_DUE"):
        p.payout(0, True)


def test_payout_to_dead_cause_goes_to_carry_then_drains():
    p = mk()
    fill(p, 0, 4)
    settle(p, 0)  # pins fire 1 cause c1
    p.payout(0, False)  # c0 dead
    fill(p, 1, 5)
    settle(p, 1)
    assert p.pin_cause == 1  # only live cause: itself
    paid = p.balance
    assert p.payout(1, True) == PAID
    assert p.carry_total == 0 and paid - p.balance == p.fires[0].pay + p.fires[1].pay


def test_extinguished():
    p = mk()
    for i in range(4):
        p.give(1, f"a{i}", 0, 0, G * (i + 1))
    settle(p, 0)
    p.payout_start(0)
    fill(p, 1, 5, t=W + 1)
    p.payout_callback(0, False)  # c0 dead
    settle(p, 1)
    assert p.fires[1].status == CAUGHT
    assert p.payout(1, False) == CARRIED
    assert p.extinguished
    with pytest.raises(Revert, match="EXTINGUISHED"):
        p.give(2 * W + 1, "z", 2, 0, G)
    # carry slices refundable pro-rata by gift to their own week's givers
    f0 = p.fires[0]
    slice0 = p.carry[0]
    got = p.claim(2 * W, "a3", [0])
    assert got["near"] == slice0 * f0.gifts["a3"] // f0.X and got["good"] > 0  # keeps GOOD too
    assert p.claim(2 * W, "a3", [0])["near"] == 0
    # every fire settled from now on smothers, even if it had enough givers
    settle(p, 5)
    assert p.stats.smothers == 4


def test_extinguished_due_payout_goes_to_carry():
    p = mk(causes=("c0.near",))
    fill(p, 0, 4)
    settle(p, 0)
    p.payout(0, False)
    assert p.extinguished
    fill_ok = p.fires.get(1)
    assert fill_ok is None
    assert p.carry_total == p.fires[0].pay


def test_lazy_settle_triggers_one_payout_and_settle_first():
    p = mk()
    fill(p, 0, 4)
    p.give(W + 1, "late", 1, 1, G)  # lazily settles fire 0 and triggers its Due payout
    assert p.next_to_settle == 1 and p.fires[0].payout == PAID
    with pytest.raises(Revert, match="SETTLE_FIRST"):
        p.give(19 * W, "x", 19, 0, G)  # 18 ended unsettled > 16
    assert p.settle(19 * W) == [SMOTHERED] * 16
    assert p.settle(19 * W) == [SMOTHERED] * 2
    assert p.settle(19 * W) == []


# ------------------------------------------------------------------ close
def test_close():
    p = mk()
    fill(p, 0, 4)
    settle(p, 0)
    p.claim(W, "g0_0", [0])
    t = W + 52 * W
    while p.settle(t):
        pass
    with pytest.raises(Revert, match="TOO_EARLY"):
        p.close(t - 1, 0)
    H, B, ms, earm = p.H, p.B, p.max_supply, p.earmarked
    x = p.close(t, 0)
    assert x == earm and p.earmarked == 0 and p.max_supply == ms - x and p.B == B - x
    assert p.H * B > H * p.B  # floor rises
    assert p.claim(t, "g0_1", [0])["good"] == 0  # claims ended
    with pytest.raises(Revert, match="CLOSED"):
        p.close(t, 0)
    with pytest.raises(Revert, match="NOT_CAUGHT"):
        p.close(t, 1)


# ------------------------------------------------------------------ floor monotonic property
@pytest.mark.parametrize("seed", range(25))
def test_floor_monotonic_random_ops(seed):
    rng = random.Random(seed)
    p = mk(causes=("c0.near", "c1.near", "c2.near"))
    accts = [f"u{i}" for i in range(12)]
    now = 0
    for _ in range(400):
        now += rng.randrange(0, W // 3)
        o = rng.random()
        try:
            if o < 0.55:
                a = rng.choice(accts)
                amt = rng.choice([G, G + rng.randrange(10**24), 3 * NEAR, rng.randrange(1, 10**22)])
                p.give(now, a, now // W, p.pin_cause, amt, rng.choice(accts + [None]))
            elif o < 0.65:
                p.settle(now)
            elif o < 0.72 and p.due:
                p.payout(min(p.due), rng.random() < 0.85)
            elif o < 0.85:
                p.claim(now, rng.choice(accts), rng.sample(range(max(1, now // W + 1)), 1))
            elif o < 0.93:
                holders = [a for a, v in p.good.items() if v]
                if holders:  # jump into this week's rescue window
                    now = max(now, (now // W + 1) * W - W // 10 + rng.randrange(W // 10))
                    p.kindle(now, max(holders, key=p.good.get), now // W)
            else:
                holders = [a for a, v in p.good.items() if v]
                if holders:
                    a = rng.choice(holders)
                    p.redeem(a, rng.randrange(1, p.good[a] + 1), ok=rng.random() < 0.9)
        except Revert:
            pass
        p.check_full()  # includes H*B_star >= H_star*B
    assert p.H * p.B_star >= p.H_star * p.B
    assert p.stats.catches + p.stats.smothers > 3  # the sequence really exercised settlement
