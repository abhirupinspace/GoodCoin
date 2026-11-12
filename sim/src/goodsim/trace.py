"""Golden trace tests/golden/basic.json (SIMULATION.md §5): replayed by the contract test `golden_trace`."""
from __future__ import annotations

import json
from pathlib import Path

from .protocol import GOOD, NEAR, Config, Protocol

S = 1_000_000_000  # ns per second
GOLDEN = Path(__file__).resolve().parents[3] / "tests" / "golden" / "basic.json"

DEMO = Config(
    W=360 * S, min_gift=NEAR // 10, record_fee=5 * NEAR // 1000, G0=4, Gmin=2, Gmax=100,
    causes=("c0.near", "c1.near"),
)

G105 = 105 * NEAR // 1000  # 0.105 NEAR = min_gift + record fee


def script() -> list[dict]:
    st: list[dict] = []

    def add(**kw):
        st.append({"i": len(st) + 1, **kw})

    def give(t, acct, week, cause, attached, spark=None):
        add(op="give", t_ns=t * S, account=acct, week=week, cause=cause, attached=attached,
            sparked_by=spark)

    give(10, "alice", 0, 0, 1005 * NEAR // 1000)
    give(20, "bob", 0, 0, G105, "alice")
    give(30, "carol", 0, 0, G105)
    give(40, "dave", 0, 0, G105)
    add(op="settle", t_ns=361 * S)
    add(op="payout", week=0, result="ok")
    for a in ("alice", "bob", "carol", "dave"):
        add(op="claim", account=a, weeks=[0])
    give(400, "erin", 1, 1, G105)
    add(op="settle", t_ns=721 * S)
    add(op="claim", account="erin", weeks=[1])
    for a in ("frank", "gina", "hank"):
        give(800, a, 2, 0, G105)
    add(op="kindle", t_ns=1050 * S, account="alice", week=2)
    add(op="settle", t_ns=1081 * S)
    add(op="payout", week=2, result="fail")
    add(op="redeem", t_ns=1100 * S, account="alice", amount=10_000 * GOOD)
    for a in ("ivan", "jane", "kate", "leo"):
        give(1200, a, 3, 1, G105)
    add(op="settle", t_ns=1441 * S)
    add(op="payout", week=3, result="ok")
    for a in ("frank", "gina", "hank"):
        add(op="claim", account=a, weeks=[2])
    for a in ("ivan", "jane", "kate", "leo"):
        add(op="claim", account=a, weeks=[3])
    return st


def apply(p: Protocol, step: dict, now: int):
    o = step["op"]
    if o == "give":
        return p.give(now, step["account"], step["week"], step["cause"], step["attached"],
                      step["sparked_by"])
    if o == "settle":
        return p.settle(now)
    if o == "payout":
        return p.payout(step["week"], step["result"] == "ok")
    if o == "claim":
        return p.claim(now, step["account"], step["weeks"])
    if o == "kindle":
        return p.kindle(now, step["account"], step["week"])
    if o == "redeem":
        return p.redeem(step["account"], step["amount"])
    raise ValueError(o)


def _jsonify(step: dict) -> dict:
    out = {}
    for k, v in step.items():
        out[k] = str(v) if k in ("t_ns", "attached", "amount") else v
    return out


def build() -> tuple[dict, list]:
    """Replay the script on the exact model. Returns (golden json, per-step op results)."""
    p = Protocol(DEMO)
    now = 0
    expected, results = [], []
    steps = script()
    for s in steps:
        now = s.get("t_ns", now)
        results.append(apply(p, s, now))
        p.check_full()
        expected.append({"i": s["i"], **p.snapshot()})
    golden = {"config": DEMO.to_json(), "steps": [_jsonify(s) for s in steps], "expected": expected}
    return golden, results


def dumps(golden: dict) -> str:
    return json.dumps(golden, indent=1) + "\n"


def write(path: Path = GOLDEN) -> Path:
    golden, _ = build()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(dumps(golden))
    return path
