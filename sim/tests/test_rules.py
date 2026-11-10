import math

import numpy as np
import pytest

from goodsim import behavior
from goodsim.analysis import reserve_exhaustion, treasury_depletion
from goodsim.contract import Contract, Status, streak_multiplier
from goodsim.engine import run_path
from goodsim.params import SPEC, VESTING
from goodsim.scenarios import ring_topup

P = SPEC


def test_genesis_state():
    c = Contract(P)
    assert c.total_supply == pytest.approx(250e6)
    assert c.locked == pytest.approx([125e6, 75e6, 50e6])
    assert c.spendable == [0.0, 0.0, 0.0]
    assert c.reserve_remaining == 400e6
    assert c.minted_total == 250e6


@pytest.mark.parametrize("deeds,parts,ok", [
    (100, 50, True), (99, 50, False), (100, 49, False), (1000, 10, False), (10, 1000, False), (0, 0, False),
])
def test_success_needs_both_targets(deeds, parts, ok):
    c = Contract(P)
    rec = c.settle(deeds, parts)
    assert (rec.status != Status.FAILED) == ok


def test_multiplier_values_and_cap():
    assert [streak_multiplier(s, P) for s in range(11)] == pytest.approx(
        [1, 1.125, 1.25, 1.375, 1.5, 1.625, 1.75, 1.875, 2, 2, 2])
    c = Contract(P, "B")
    rpps = [c.settle(100, 50).reward_per_participant for _ in range(12)]
    assert rpps[:3] == pytest.approx([25, 28.125, 31.25])
    assert max(rpps) == pytest.approx(50)
    assert rpps[8:] == pytest.approx([50] * 4)


def test_policy_a_flat_and_c_share():
    a = Contract(P, "A")
    assert [a.settle(100, 50).reward_per_participant for _ in range(10)] == pytest.approx([25] * 10)
    cc = Contract(P, "C")
    r = cc.settle(100, 50)
    assert r.reward_earmarked == pytest.approx(400e6 * 1e-4)
    assert r.reward_per_participant == pytest.approx(40e3 / 50)


def test_reserve_all_or_nothing():
    p = P.with_(reserve=1_000.0)  # less than 50 * 25 = 1250
    c = Contract(p, "A")
    rec = c.settle(100, 50)
    assert rec.status == Status.SUCCEEDED_NO_RESERVE
    assert rec.reward_earmarked == 0 and c.rewards_minted == 0
    assert c.reserve_remaining == 1_000.0
    assert c.streak == 1  # D16: streak still +1
    assert rec.unlocked == pytest.approx(1_000)  # unlock still happens
    # exactly sufficient -> paid in full
    c2 = Contract(P.with_(reserve=1_250.0), "A")
    assert c2.settle(100, 50).status == Status.SUCCEEDED and c2.reserve_remaining == pytest.approx(0)


def test_unlock_split_and_insufficient_locked():
    c = Contract(P)
    c.settle(100, 50)
    # 1000 unlocked 500/300/200, then spend_rate 0.5 paid out
    assert c.unlocked_total == pytest.approx(1_000)
    assert c.spendable == pytest.approx([250, 150, 100])
    assert c.distributed == pytest.approx(500)
    tiny = Contract(P.with_(treasury_genesis=600.0))
    rec = tiny.settle(100, 50)
    assert rec.unlocked == pytest.approx(600)  # only what remains
    assert sum(tiny.locked) == pytest.approx(0)


def test_burn_math():
    c = Contract(P)
    rec = c.settle(0, 0)
    assert rec.burned == pytest.approx(250_000)
    assert c.locked == pytest.approx([125e6 * 0.999, 75e6 * 0.999, 50e6 * 0.999])
    for _ in range(7):
        c.settle(0, 0)
    assert c.burned_total == pytest.approx(250e6 * (1 - 0.999 ** 8))
    assert c.total_supply == pytest.approx(250e6 * 0.999 ** 8)


def test_burn_only_locked_spendable_untouched():
    c = Contract(P.with_(spend_rate=0.0))
    c.settle(100, 50)
    before = list(c.spendable)
    c.settle(0, 0)
    assert c.spendable == pytest.approx(before)


def test_streak_reset_and_longest():
    c = Contract(P)
    for _ in range(3):
        c.settle(100, 50)
    assert c.streak == 3
    c.settle(100, 49)
    assert c.streak == 0 and c.longest == 3
    rec = c.settle(100, 50)
    assert rec.streak_before == 0 and rec.reward_per_participant == pytest.approx(25)


def test_claim_rate_keeps_earmark_unminted():
    c = Contract(P.with_(claim_rate=0.4), "A")
    c.settle(100, 50)
    assert c.reserve_remaining == pytest.approx(400e6 - 1250)
    assert c.rewards_minted == pytest.approx(500)
    assert c.earmarked_unclaimed == pytest.approx(750)
    c.check()


def test_cap_enforced():
    c = Contract(P)
    with pytest.raises(ValueError):
        c._mint(1e9)


def test_vesting_schedule():
    liq, eco, con, sec = VESTING
    assert liq.vested(0) == 0 and liq.vested(365) == 150e6 and liq.vested(1000) == 150e6
    assert eco.vested(365) == pytest.approx(50e6)
    assert con.vested(181) == 0
    assert con.vested(182) == pytest.approx(50e6 * 182 / 730)
    assert con.vested(730) == pytest.approx(50e6)
    c = Contract(P)
    c.claim_vested(10_000)
    assert c.minted_total == pytest.approx(600e6)  # treasury + all vesting; reserve unminted
    c.check()


def test_epoch_timing():
    assert [P.settle_day(n) for n in range(9)] == [8, 15, 22, 29, 36, 43, 50, 57, 64]
    assert P.epochs_settled_by(60) == 8


def test_invariants_hold_every_day_random_paths():
    rng = np.random.default_rng(0)
    for pol in "ABC":
        for _ in range(50):
            d = rng.integers(0, 300, 9)
            n = rng.integers(0, 150, 9)
            res = run_path(d, n, pol, P, 60)
            c = res.contract
            assert c.minted_total <= 1e9
            assert c.total_supply == pytest.approx(c.minted_total - c.burned_total)
            assert c.treasury == pytest.approx(sum(c.locked) + sum(c.spendable))
            assert np.all(np.diff(res.daily["reserve_remaining"]) <= 0)
            assert np.all(res.daily["supply_mechanic"] > 0)


def test_mean_path_counts():
    base = run_path([110] * 9, [55] * 9, "B", P, 60).contract
    pess = run_path([45] * 9, [25] * 9, "B", P, 60).contract
    assert sum(e.status == Status.SUCCEEDED for e in base.epochs) == 8
    assert sum(e.status == Status.FAILED for e in pess.epochs) == 8


def test_behaviour_means():
    rng = np.random.default_rng(1)
    d, n = behavior.sample(rng, [110.0], [55.0], 50_000, 10.0)
    assert n.mean() == pytest.approx(55, rel=0.01)
    assert d.mean() == pytest.approx(110, rel=0.01)
    assert n.var() == pytest.approx(55 + 55 ** 2 / 10, rel=0.05)
    assert np.all(d >= n)


def test_ring_topup_minimal():
    d, n, pup, fake = ring_topup(np.array([45, 120]), np.array([25, 60]), P)
    assert list(pup) == [25, 0] and list(fake) == [55, 0]
    assert list(d) == [100, 120] and list(n) == [50, 60]


def test_treasury_halving():
    t = treasury_depletion(P)
    assert t["epochs_analytic"] == pytest.approx(math.log(0.5) / math.log(0.999))
    assert t["epochs_simulated"] == math.ceil(t["epochs_analytic"])


def test_reserve_exhaustion_matches_closed_form():
    ex = reserve_exhaustion(P, "B")
    assert ex["60 days"]["X"] == pytest.approx(ex["60 days"]["X_analytic"], rel=1e-6)
