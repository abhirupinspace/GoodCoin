"""State machine mirroring the GOODCOIN contract's economic rules (floats, not 24-dec ints)."""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum

from .params import Params

EPS = 1e-6  # absolute GOOD tolerance for float invariants


class Status(str, Enum):
    SUCCEEDED = "Succeeded"
    SUCCEEDED_NO_RESERVE = "SucceededNoReserve"
    FAILED = "Failed"


# ---- reward policies: (participants, streak_before, reserve_remaining, params) -> total pool ----

def reward_spec_literal(participants: int, streak_before: int, reserve: float, p: Params) -> float:
    """A: flat base reward per participant."""
    return participants * p.base_reward * p.reward_multiplier


def streak_multiplier(streak_before: int, p: Params) -> float:
    return 1.0 + p.streak_step * min(streak_before, p.streak_cap)


def reward_streak(participants: int, streak_before: int, reserve: float, p: Params) -> float:
    """B (default): base * (1 + 12.5% * min(streak_before, 8)) per participant."""
    return participants * p.base_reward * p.reward_multiplier * streak_multiplier(streak_before, p)


def reward_reserve_share(participants: int, streak_before: int, reserve: float, p: Params) -> float:
    """C: pool = reserve_share_bps of reserve_remaining, split equally."""
    return reserve * p.reserve_share_bps / 10_000 * p.reward_multiplier


POLICIES = {
    "A": ("spec-literal", reward_spec_literal),
    "B": ("streak-multiplier", reward_streak),
    "C": ("reserve-share", reward_reserve_share),
}


@dataclass
class EpochRecord:
    epoch: int
    approved_deeds: float
    participants: float
    status: Status
    streak_before: int
    reward_earmarked: float
    reward_per_participant: float
    burned: float
    unlocked: float
    spent: float


@dataclass
class Contract:
    p: Params
    policy: str = "B"
    locked: list = field(default_factory=list)
    spendable: list = field(default_factory=list)
    reserve_remaining: float = 0.0
    earmarked_total: float = 0.0
    rewards_minted: float = 0.0  # claimed rewards (circulating)
    vested_minted: float = 0.0
    minted_total: float = 0.0
    burned_total: float = 0.0
    distributed: float = 0.0  # treasury paid to proposal beneficiaries (circulating)
    unlocked_total: float = 0.0
    streak: int = 0
    longest: int = 0
    epochs: list = field(default_factory=list)

    def __post_init__(self):
        p = self.p
        self.locked = [p.treasury_genesis * s for s in p.treasury_split]
        self.spendable = [0.0] * len(p.treasury_split)
        self.reserve_remaining = p.reserve
        self._mint(p.treasury_genesis)
        self.check()

    # -- token core --
    def _mint(self, amount: float) -> None:
        if amount < 0:
            raise ValueError("negative mint")
        if self.minted_total + amount > self.p.max_supply * (1 + 1e-12):
            raise ValueError("cap exceeded")
        self.minted_total += amount

    def _burn(self, amount: float) -> None:
        self.burned_total += amount

    @property
    def treasury(self) -> float:
        return sum(self.locked) + sum(self.spendable)

    @property
    def total_supply(self) -> float:
        """Sum of balances: contract-held treasury + claimed rewards + vested + paid-out treasury."""
        return self.treasury + self.rewards_minted + self.vested_minted + self.distributed

    @property
    def supply_mechanic(self) -> float:
        return self.total_supply - self.vested_minted

    @property
    def earmarked_unclaimed(self) -> float:
        return self.earmarked_total - self.rewards_minted

    # -- vesting --
    def claim_vested(self, day: float) -> float:
        due = sum(v.vested(day) for v in self.p.vesting) - self.vested_minted
        if due > 0:
            self._mint(due)
            self.vested_minted += due
        return max(due, 0.0)

    # -- settlement --
    def settle(self, approved_deeds: float, participants: float) -> EpochRecord:
        p = self.p
        n = len(self.epochs)
        streak_before = self.streak
        earmark = rpp = burned = unlocked = 0.0
        success = approved_deeds >= p.deeds_target and participants >= p.participants_target
        if success:
            total = POLICIES[self.policy][1](participants, streak_before, self.reserve_remaining, p)
            if total <= self.reserve_remaining:  # all-or-nothing
                status = Status.SUCCEEDED
                earmark = total
                rpp = total / participants
                self.reserve_remaining -= total
                self.earmarked_total += total
                claimed = total * p.claim_rate
                self._mint(claimed)
                self.rewards_minted += claimed
            else:
                status = Status.SUCCEEDED_NO_RESERVE
            for i, s in enumerate(p.treasury_split):
                u = min(self.locked[i], p.unlock_per_success * s)
                self.locked[i] -= u
                self.spendable[i] += u
                unlocked += u
            self.unlocked_total += unlocked
            self.streak += 1
            self.longest = max(self.longest, self.streak)
        else:
            status = Status.FAILED
            self.streak = 0
            for i in range(len(self.locked)):
                b = self.locked[i] * p.burn_bps / 10_000
                self.locked[i] -= b
                burned += b
            self._burn(burned)
        # governance: proposals execute against spendable
        spent = 0.0
        for i in range(len(self.spendable)):
            s = self.spendable[i] * p.spend_rate
            self.spendable[i] -= s
            spent += s
        self.distributed += spent
        rec = EpochRecord(n, approved_deeds, participants, status, streak_before,
                          earmark, rpp, burned, unlocked, spent)
        self.epochs.append(rec)
        self.check()
        return rec

    # -- invariants --
    def check(self) -> None:
        tol = 1e-12 * max(1.0, self.minted_total) + EPS  # float64 rounding headroom (~1e-3 GOOD at 1e9)
        assert abs(self.total_supply - (self.minted_total - self.burned_total)) <= tol, "supply"
        assert self.minted_total <= self.p.max_supply + tol, "cap"
        assert abs(self.p.reserve - (self.reserve_remaining + self.earmarked_total)) <= tol, "reserve"
        vals = [*self.locked, *self.spendable, self.reserve_remaining, self.earmarked_unclaimed + tol,
                self.rewards_minted, self.vested_minted, self.burned_total, self.distributed]
        assert all(v >= -tol for v in vals), "negative balance"
