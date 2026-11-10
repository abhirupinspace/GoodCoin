"""Immutable parameters. Values mirror the contract `Config` (DESIGN.md §3-5, DECISIONS.md)."""
from __future__ import annotations

from dataclasses import dataclass, field, replace

BUCKETS = ("community", "environment", "education")


@dataclass(frozen=True)
class Vesting:
    name: str
    amount: float
    cliff_days: int
    duration_days: int

    def vested(self, day: float) -> float:
        """Cumulative vested at `day` (linear from genesis; nothing before cliff)."""
        if day < self.cliff_days:
            return 0.0
        return self.amount * min(day, self.duration_days) / self.duration_days


VESTING = (
    Vesting("liquidity", 150e6, 0, 365),
    Vesting("ecosystem", 100e6, 0, 730),
    Vesting("contributors", 50e6, 182, 730),
    Vesting("security", 50e6, 0, 730),
)


@dataclass(frozen=True)
class Params:
    max_supply: float = 1e9
    treasury_genesis: float = 250e6
    treasury_split: tuple = (0.5, 0.3, 0.2)
    reserve: float = 400e6
    vesting: tuple = field(default=VESTING)
    epoch_days: int = 7
    dispute_days: int = 1
    deeds_target: int = 100
    participants_target: int = 50
    base_reward: float = 25.0
    streak_step: float = 0.125  # +12.5% per streak epoch (policy B)
    streak_cap: int = 8  # max multiplier 1 + 0.125*8 = 2.0
    reward_multiplier: float = 1.0  # stress-test knob only (1.0 = spec)
    unlock_per_success: float = 1_000.0
    burn_bps: int = 10  # 0.1% of locked treasury per failed epoch
    reserve_share_bps: float = 1.0  # policy C: 0.01% of reserve_remaining per success
    spend_rate: float = 0.5  # fraction of spendable paid out by proposals at each settlement
    claim_rate: float = 1.0  # fraction of earmarked rewards claimed (minted) at settlement

    def settle_day(self, epoch: int) -> int:
        """Day on which epoch N can first be settled: end of epoch + dispute window."""
        return self.epoch_days * (epoch + 1) + self.dispute_days

    def epochs_settled_by(self, day: int) -> int:
        """Number of epochs settled on or before `day`."""
        n = 0
        while self.settle_day(n) <= day:
            n += 1
        return n

    def with_(self, **kw) -> "Params":
        return replace(self, **kw)


SPEC = Params()
HORIZON_DAYS = 60
MC_RUNS = 2_000
SEED = 20261111
DISPERSION_K = 10.0  # NegBin dispersion; assumption, see SIMULATION.md (sensitivity reported)

# Weekly means given by spec (approved deeds, unique participants).
SCENARIOS_SPEC = {
    "optimistic": (180.0, 90.0),
    "base": (110.0, 55.0),
    "pessimistic": (45.0, 25.0),
}
SPEC_STATED_SUCCESSES = {"optimistic": 8, "base": 6, "pessimistic": 2}
