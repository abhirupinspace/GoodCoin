"""Exact integer reference model of docs/SPEC.md.

All amounts are Python ints in base units (NEAR and GOOD both 1e24). Every rounding matches the
contract. Times are ns offsets from genesis. This is the reference the Rust contract is tested
against (tests/golden/*.json), so keep it boring and literal.

Every public op is atomic (a `Revert` restores the pre-call state, like a NEAR panic) when
`atomic=True`, and every op ends with `check()` (SPEC §8), which asserts the floor high-water mark.
"""
from __future__ import annotations

import copy
import functools
from dataclasses import dataclass, field

NEAR = 10**24
GOOD = 10**24
BPS = 10_000

OPEN, CAUGHT, SMOTHERED = "open", "caught", "smothered"
DUE, SENDING, PAID, CARRIED = "Due", "Sending", "Paid", "Carried"


class Revert(Exception):
    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def require(cond: bool, code: str) -> None:
    if not cond:
        raise Revert(code)


def ceil_div(a: int, b: int) -> int:
    return -(-a // b)


@dataclass(frozen=True)
class Config:
    W: int                      # week length, ns
    min_gift: int
    record_fee: int
    G0: int
    Gmin: int
    Gmax: int
    causes: tuple = ("c0.near",)
    fee_bps: int = 1000         # phi
    markup_bps: int = 2500      # beta
    bounty_bps: int = 2500      # gamma
    allowance_bps: int = 25     # alpha
    seed: int = 10**30          # 1,000,000 GOOD, counted only in B
    H0: int = 10**24            # 1 NEAR
    max_supply: int = 10**33    # 1e9 GOOD
    contract_id: str = "goodcoin.near"
    max_settle: int = 16
    max_claim_weeks: int = 52
    close_after_weeks: int = 52
    max_kindle_j: int = 16
    smother_step: int = 1       # NOT SPEC: what-if knob for the report (SPEC is 1)

    def __post_init__(self):
        assert 1 <= len(self.causes) <= 16 and len(set(self.causes)) == len(self.causes)
        assert 1 <= self.Gmin <= self.G0 <= self.Gmax
        assert self.record_fee < self.min_gift + self.record_fee and self.W >= 10

    def to_json(self) -> dict:
        return {
            "W_ns": str(self.W), "min_gift": str(self.min_gift), "record_fee": str(self.record_fee),
            "fee_bps": self.fee_bps, "markup_bps": self.markup_bps, "bounty_bps": self.bounty_bps,
            "allowance_bps": self.allowance_bps, "G0": self.G0, "Gmin": self.Gmin, "Gmax": self.Gmax,
            "seed": str(self.seed), "H0": str(self.H0), "max_supply": str(self.max_supply),
            "causes": list(self.causes),
        }


def e_bounds(G0: int, Gmin: int, Gmax: int) -> tuple[int, int]:
    """e_max = largest e>=0 with G0*11^e <= Gmax*10^e; e_min = smallest e<=0 with G0*10^k >= Gmin*11^k."""
    e_max = 0
    while G0 * 11 ** (e_max + 1) <= Gmax * 10 ** (e_max + 1):
        e_max += 1
    k = 0
    while G0 * 10 ** (k + 1) >= Gmin * 11 ** (k + 1):
        k += 1
    assert e_max <= 70 and k <= 70
    return -k, e_max


def base_goal(G0: int, e: int) -> int:
    """ceil(G0 * 1.1^e), exact rational."""
    if e >= 0:
        return ceil_div(G0 * 11**e, 10**e)
    k = -e
    return ceil_div(G0 * 10**k, 11**k)


class Fire:
    __slots__ = ("week", "gifts", "weights", "X", "wsum", "kindled", "status", "A", "cause", "e",
                 "base_goal", "fee", "pay", "M", "claimed_good", "claimed_total", "refunded",
                 "carry_claimed", "closed", "payout", "sending")

    def __init__(self, week: int):
        self.week = week
        self.gifts: dict = {}       # account -> total net gift g
        self.weights: dict = {}     # account -> weight (gift adjusted by bounties)
        self.X = 0
        self.wsum = 0
        self.kindled = 0
        self.status = OPEN
        self.A = self.cause = self.e = self.base_goal = None
        self.fee = self.pay = self.M = 0
        self.claimed_good: set = set()
        self.claimed_total = 0
        self.refunded: set = set()
        self.carry_claimed: set = set()
        self.closed = False
        self.payout = None          # Due / Sending / Paid / Carried
        self.sending = None         # (amount, [(week, slice)...]) while Sending


def op(fn):
    """Atomic public op: snapshot, run, restore on Revert, then assert invariants."""
    @functools.wraps(fn)
    def wrapper(self, *a, **k):
        snap = self._snapshot() if self.atomic else None
        try:
            r = fn(self, *a, **k)
        except Revert:
            if snap is not None:
                self.__dict__.update(snap)
            raise
        self.check()
        return r
    return wrapper


@dataclass
class Stats:
    to_causes: int = 0
    refunded: int = 0
    record_fees: int = 0
    kindles: int = 0
    kindle_burned: int = 0
    redeemed_good: int = 0
    redeemed_near: int = 0
    closed_good: int = 0
    catches: int = 0
    kindled_catches: int = 0
    smothers: int = 0
    bounty_weight: int = 0
    supply_destroyed: int = 0


class Protocol:
    def __init__(self, cfg: Config, atomic: bool = True):
        self.cfg = cfg
        self.atomic = atomic
        self.e_min, self.e_max = e_bounds(cfg.G0, cfg.Gmin, cfg.Gmax)
        self.H = cfg.H0
        self.max_supply = cfg.max_supply
        self.total_minted = 0
        self.total_burned = 0
        self.earmarked = 0
        self.e = 0
        self.streak = 0
        self.next_to_settle = 0
        self.extinguished = False
        self.dead = [False] * len(cfg.causes)
        self.fires: dict[int, Fire] = {}
        self.good: dict = {}
        self.ever_gave: set = set()
        self.carry: dict[int, int] = {}       # source week -> slice amount (insertion ordered)
        self.carry_paid: dict[int, int] = {}  # extinguished refunds already paid per slice
        self.carry_total = 0
        self.refunds_owed = 0
        self.payouts_owed = 0
        self.escrow = 0
        self.storage = 0
        self.balance = cfg.H0                 # contract NEAR (excluding its own account storage)
        self.due: set = set()                 # weeks whose payout is Due
        self.transfer_fails: set = set()      # oracle for transfers to deleted accounts
        self.stats = Stats()
        # pinned for fire `next_to_settle` (fire 0: at genesis)
        self.pin_cause = 0
        self.pin_A = self._allowance()
        self.pin_base_goal = base_goal(cfg.G0, 0)
        self._last_max_supply = self.max_supply
        self.H_star, self.B_star = self.H, self.B

    # ---------------------------------------------------------------- views
    @property
    def B(self) -> int:
        return self.total_minted - self.total_burned + self.earmarked + self.cfg.seed

    def _allowance(self) -> int:
        return self.cfg.allowance_bps * (self.max_supply - self.total_minted - self.earmarked) // BPS

    def week_of(self, now: int) -> int:
        return now // self.cfg.W

    def end_of(self, week: int) -> int:
        return (week + 1) * self.cfg.W

    def unsettled(self, now: int) -> int:
        return max(0, self.week_of(now) - self.next_to_settle)

    def goal(self) -> int:
        f = self.fires.get(self.next_to_settle)
        return self.pin_base_goal - (f.kindled if f else 0)

    def givers(self, week: int) -> int:
        f = self.fires.get(week)
        return len(f.gifts) if f else 0

    def floor(self) -> float:
        return self.H / self.B

    def kindle_cost(self, j: int) -> int:
        c = self.cfg
        return ceil_div(2**j * c.fee_bps * c.min_gift * self.B, BPS * self.H)

    def snapshot(self) -> dict:
        return {
            "hearth": str(self.H), "B": str(self.B), "max_supply": str(self.max_supply),
            "total_minted": str(self.total_minted), "total_burned": str(self.total_burned),
            "earmarked": str(self.earmarked), "e": self.e, "streak": self.streak,
            "next_to_settle": self.next_to_settle, "carry_total": str(self.carry_total),
            "extinguished": self.extinguished,
            "good": {a: str(v) for a, v in sorted(self.good.items()) if v},
            "refunds_owed": str(self.refunds_owed), "payouts_owed": str(self.payouts_owed),
        }

    # ---------------------------------------------------------------- invariants (SPEC §8)
    def check(self) -> None:
        B = self.B
        assert self.max_supply <= self._last_max_supply, "max_supply increased"
        self._last_max_supply = self.max_supply
        assert 0 <= self.earmarked and self.total_minted + self.earmarked <= self.max_supply
        assert self.total_burned <= self.total_minted and B > 0 and self.H > 0
        # floor never decreases: H*B_star >= H_star*B
        lhs, rhs = self.H * self.B_star, self.H_star * B
        assert lhs >= rhs, f"floor decreased: H={self.H} B={B} H*={self.H_star} B*={self.B_star}"
        if lhs > rhs:
            self.H_star, self.B_star = self.H, B
        owed = (self.H + self.escrow + self.payouts_owed + self.refunds_owed + self.carry_total
                + self.storage)
        assert self.balance >= owed, f"insolvent: {self.balance} < {owed}"

    def check_full(self) -> None:
        """O(state) checks for tests."""
        self.check()
        assert sum(self.good.values()) == self.total_minted - self.total_burned
        for f in self.fires.values():
            assert f.claimed_total <= f.M <= (f.A or 0)
            assert sum(f.weights.values()) == f.wsum and sum(f.gifts.values()) == f.X

    def _snapshot(self) -> dict:
        d = dict(self.__dict__)
        cfg = d.pop("cfg")
        d = copy.deepcopy(d)
        d["cfg"] = cfg
        return d

    # ---------------------------------------------------------------- settlement (§3.1, §3.4)
    def _settle_one(self) -> str:
        c = self.cfg
        n = self.next_to_settle
        f = self.fires.get(n)
        givers = len(f.gifts) if f else 0
        kindled = f.kindled if f else 0
        goal = self.pin_base_goal - kindled
        A = self.pin_A
        if f:
            f.A, f.cause, f.e, f.base_goal = A, self.pin_cause, self.e, self.pin_base_goal
        if not self.extinguished and givers >= goal and givers >= 1:
            X = f.X
            fee = X * c.fee_bps // BPS
            pay = X - fee
            M = min(A, (fee * self.B * BPS) // (self.H * (BPS + c.markup_bps)))
            self.escrow -= X
            self.H += fee
            self.earmarked += M
            f.fee, f.pay, f.M, f.status, f.payout = fee, pay, M, CAUGHT, DUE
            self.due.add(n)
            self.payouts_owed += pay
            self.streak += 1
            if kindled == 0:
                self.e = min(self.e + 1, self.e_max)
            else:
                self.stats.kindled_catches += 1
            self.stats.catches += 1
            result = CAUGHT
        else:
            self.max_supply -= A
            self.e = max(self.e - self.cfg.smother_step, self.e_min)
            self.streak = 0
            if f:
                f.status = SMOTHERED
                self.escrow -= f.X
                self.refunds_owed += f.X
            self.stats.smothers += 1
            self.stats.supply_destroyed += A
            result = SMOTHERED
        self.next_to_settle = n + 1
        # pin fire n+1
        self.pin_A = self._allowance()
        self.pin_base_goal = base_goal(c.G0, self.e)
        self.pin_cause = self._next_live(self.pin_cause)
        return result

    def _next_live(self, prev: int | None) -> int | None:
        k = len(self.cfg.causes)
        start = 0 if prev is None else prev + 1
        for i in range(k):
            idx = (start + i) % k
            if not self.dead[idx]:
                return idx
        return None

    def _settle_due(self, now: int) -> None:
        cnt = self.unsettled(now)
        require(cnt <= self.cfg.max_settle, "SETTLE_FIRST")
        for _ in range(cnt):
            self._settle_one()
        if self.due:
            self._payout(min(self.due), None)

    @op
    def settle(self, now: int) -> list[str]:
        cnt = min(self.unsettled(now), self.cfg.max_settle)
        return [self._settle_one() for _ in range(cnt)]

    # ---------------------------------------------------------------- give (§3.2, §3.3)
    @op
    def give(self, now: int, account, week: int, cause: int, attached: int, sparked_by=None) -> dict:
        c = self.cfg
        self._settle_due(now)
        require(not self.extinguished, "EXTINGUISHED")
        require(week == self.week_of(now), "WRONG_WEEK")
        require(cause == self.pin_cause, "WRONG_CAUSE")
        require(account not in c.causes and account != c.contract_id, "BAD_GIVER")
        f = self.fires.get(week)
        if f is None:
            f = self.fires[week] = Fire(week)
        first = account not in f.gifts
        g = attached - c.record_fee if first else attached
        require(g > 0, "TOO_SMALL")
        require(f.gifts.get(account, 0) + g >= c.min_gift, "BELOW_MIN_GIFT")
        bounty = 0
        newcomer = account not in self.ever_gave
        if first:
            self.storage += c.record_fee
            self.stats.record_fees += c.record_fee
        f.gifts[account] = f.gifts.get(account, 0) + g
        f.weights[account] = f.weights.get(account, 0) + g
        f.X += g
        f.wsum += g
        if newcomer:
            self.ever_gave.add(account)
            if sparked_by is not None and sparked_by != account and sparked_by in f.gifts:
                bounty = c.bounty_bps * min(g, c.min_gift * 3 // 2) // BPS
                f.weights[account] -= bounty
                f.weights[sparked_by] += bounty
                self.stats.bounty_weight += bounty
        self.escrow += g
        self.balance += attached
        return {"g": g, "bounty": bounty}

    # ---------------------------------------------------------------- payout (§3.6)
    def _payout_start(self, week: int) -> str:
        f = self.fires.get(week)
        require(f is not None and f.payout == DUE, "NOT_DUE")
        self.due.discard(week)
        if self.extinguished or self.dead[f.cause]:
            f.payout = CARRIED
            self.payouts_owed -= f.pay
            self._carry_add(week, f.pay)
            return CARRIED
        slices = list(self.carry.items())
        self.carry.clear()
        self.carry_total = 0
        amount = f.pay + sum(s for _, s in slices)
        f.payout = SENDING
        f.sending = (amount, slices)
        self.payouts_owed += amount - f.pay
        return SENDING

    def _payout(self, week: int, ok: bool | None) -> str:
        if self._payout_start(week) == CARRIED:
            return CARRIED
        if ok is None:
            ok = self.cfg.causes[self.fires[week].cause] not in self.transfer_fails
        return self._payout_callback(week, ok)

    def _carry_add(self, week: int, amount: int) -> None:
        self.carry[week] = self.carry.get(week, 0) + amount
        self.carry_total += amount

    def _payout_callback(self, week: int, ok: bool) -> str:
        f = self.fires[week]
        require(f.payout == SENDING, "NOT_SENDING")
        amount, slices = f.sending
        f.sending = None
        self.payouts_owed -= amount
        if ok:
            f.payout = PAID
            self.balance -= amount
            self.stats.to_causes += amount
            return PAID
        self.dead[f.cause] = True
        f.payout = CARRIED
        for w, s in slices:
            self._carry_add(w, s)
        self._carry_add(week, f.pay)
        if all(self.dead):
            self.extinguished = True
        return CARRIED

    @op
    def payout(self, week: int, result: bool | None = None) -> str:
        """Start + callback in one step. result None -> oracle (transfer_fails)."""
        return self._payout(week, result)

    @op
    def payout_start(self, week: int) -> str:
        return self._payout_start(week)

    @op
    def payout_callback(self, week: int, ok: bool) -> str:
        return self._payout_callback(week, ok)

    # ---------------------------------------------------------------- claims (§3.7)
    @op
    def claim(self, now: int, account, weeks: list[int], ok: bool = True) -> dict:
        self._settle_due(now)
        require(len(weeks) <= self.cfg.max_claim_weeks, "TOO_MANY_WEEKS")
        good = near = 0
        for w in weeks:
            f = self.fires.get(w)
            if f is None or f.status == OPEN:
                continue
            if f.status == CAUGHT:
                if not f.closed and account in f.weights and account not in f.claimed_good:
                    share = f.M * f.weights[account] // f.wsum
                    f.claimed_good.add(account)
                    f.claimed_total += share
                    self.earmarked -= share
                    self.total_minted += share
                    self.good[account] = self.good.get(account, 0) + share
                    good += share
                if (self.extinguished and w in self.carry and account in f.gifts
                        and account not in f.carry_claimed):
                    amt = self.carry[w] * f.gifts[account] // f.X
                    if ok:
                        f.carry_claimed.add(account)
                        self.carry_total -= amt
                        self.carry_paid[w] = self.carry_paid.get(w, 0) + amt
                        self.balance -= amt
                        self.stats.refunded += amt
                        near += amt
            elif f.status == SMOTHERED and account in f.gifts and account not in f.refunded:
                amt = f.gifts[account]
                if ok:  # a failed refund is re-opened by its callback
                    f.refunded.add(account)
                    self.refunds_owed -= amt
                    self.balance -= amt
                    self.stats.refunded += amt
                    near += amt
        return {"good": good, "near": near}

    @op
    def close(self, now: int, week: int) -> int:
        self._settle_due(now)
        f = self.fires.get(week)
        require(f is not None and f.status == CAUGHT, "NOT_CAUGHT")
        require(not f.closed, "CLOSED")
        require(now >= self.end_of(week) + self.cfg.close_after_weeks * self.cfg.W, "TOO_EARLY")
        x = f.M - f.claimed_total
        f.closed = True
        self.earmarked -= x
        self.max_supply -= x
        self.stats.closed_good += x
        return x

    # ---------------------------------------------------------------- kindle (§5)
    @op
    def kindle(self, now: int, account, week: int) -> int:
        c = self.cfg
        self._settle_due(now)
        require(not self.extinguished, "EXTINGUISHED")
        require(week == self.week_of(now), "WRONG_WEEK")
        require(now >= self.end_of(week) - c.W // 10, "NOT_RESCUE_WINDOW")
        f = self.fires.get(week)
        givers = len(f.gifts) if f else 0
        j = f.kindled if f else 0
        bg = self.pin_base_goal
        goal = bg - j
        short = goal - givers
        require(0 < short <= max(1, bg // 4), "NOT_CLOSE")
        require(j <= c.max_kindle_j, "KINDLE_MAX")
        require(goal - 1 >= 1, "GOAL_MIN")
        cost = self.kindle_cost(j)
        require(self.good.get(account, 0) >= cost, "INSUFFICIENT_GOOD")
        if f is None:
            f = self.fires[week] = Fire(week)
        self.good[account] -= cost
        self.total_burned += cost
        f.kindled += 1
        self.stats.kindles += 1
        self.stats.kindle_burned += cost
        return cost

    # ---------------------------------------------------------------- redeem (§4)
    @op
    def redeem(self, account, amount: int, ok: bool = True) -> int:
        require(amount > 0 and self.good.get(account, 0) >= amount, "INSUFFICIENT_GOOD")
        near = amount * self.H // self.B
        self.good[account] -= amount
        self.total_burned += amount
        self.H -= near
        self.stats.redeemed_good += amount
        if ok:
            self.balance -= near
            self.stats.redeemed_near += near
        else:  # failed transfer: callback adds the NEAR back to H (floor rises)
            self.H += near
        return near
