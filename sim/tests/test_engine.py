"""MC engine smoke tests: the exact model drives every path; floor asserted inside Protocol."""
from dataclasses import replace

import numpy as np

from goodsim import attacks, engine
from goodsim.params import PROD
from goodsim.scenarios import SCENARIOS


def test_short_paths_all_scenarios():
    for sc in SCENARIOS:
        o = engine.run(replace(sc, weeks=30, K=300), PROD, 7)
        assert np.all(np.diff(o["floor"]) >= -1e-18)
        assert np.all(np.diff(o["max_supply"]) <= 0)


def test_deterministic():
    sc = replace(SCENARIOS[0], weeks=20)
    a, b = engine.run(sc, PROD, 3), engine.run(sc, PROD, 3)
    assert all(np.array_equal(a[k], b[k]) for k in engine.SERIES)


def test_attack_prices():
    c = attacks.collusion(0.0)
    assert c["cost_pct"] >= 2.0
    assert abs(attacks.kindle_prices(2)[0]["near_at_floor"] - 0.1) < 1e-9
    sp = [attacks.self_spark(n) for n in (1, 5)]
    assert sp[1]["good"] <= sp[0]["good"] and sp[1]["others"] == sp[0]["others"]
