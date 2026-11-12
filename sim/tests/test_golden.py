"""tests/golden/basic.json must equal a fresh replay of the script on the exact model."""
import json

from goodsim import trace
from goodsim.protocol import NEAR


def test_golden_matches_regenerated():
    golden, _ = trace.build()
    on_disk = trace.GOLDEN.read_text()
    assert trace.dumps(golden) == on_disk, "run `uv run python -m goodsim --trace`"
    assert json.loads(on_disk)["expected"][-1]["i"] == 33


def test_golden_highlights():
    golden, res = trace.build()
    ex = {e["i"]: e for e in golden["expected"]}
    # fire 0: X = 1.3 NEAR, fee 0.13, M = 0.13e24 * 1e30 * 1e4 / (1e24 * 12500) = 104,000 GOOD
    assert ex[5]["earmarked"] == str(104_000 * 10**24) and ex[5]["hearth"] == str(113 * NEAR // 100)
    assert [res[i]["good"] for i in range(6, 10)] == [82_000 * 10**24, 6_000 * 10**24, 8_000 * 10**24, 8_000 * 10**24]
    assert res[1]["bounty"] == 25 * NEAR // 1000
    assert res[11] == ["smothered"] and ex[13]["refunds_owed"] == "0"
    assert ex[17]["total_burned"] == str(res[16])
    assert res[18] == "Carried" and ex[19]["carry_total"] == str(27 * NEAR // 100)
    assert res[25] == "Paid" and ex[26]["carry_total"] == "0"
    assert ex[18]["e"] == 0 and ex[25]["e"] == 1 and ex[25]["streak"] == 2
