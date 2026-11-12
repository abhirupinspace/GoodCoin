"""Protocol presets (SPEC §9) and Monte Carlo settings."""
from __future__ import annotations

from dataclasses import replace

from .protocol import NEAR, Config

DAY_NS = 86_400 * 10**9

PROD = Config(
    W=7 * DAY_NS, min_gift=NEAR, record_fee=5 * NEAR // 1000, G0=20, Gmin=5, Gmax=10_000,
    causes=("c0.near", "c1.near", "c2.near", "c3.near"),
)


def cfg_with(base: Config = PROD, **kw) -> Config:
    return replace(base, **kw)


SEED = 20261113
RUNS = 48            # Monte Carlo paths per scenario
SWEEP_RUNS = 8       # paths per sweep cell
COLD_RUNS = 2000     # fire-0 trials per G0 value
HORIZON = 260        # weeks (5 years)

# Recommended by this simulator (see sim/out/REPORT.md): G0 lowered for cold start, Gmax so |e| <= 70.
REC = cfg_with(G0=10, Gmin=5, Gmax=5_000)
