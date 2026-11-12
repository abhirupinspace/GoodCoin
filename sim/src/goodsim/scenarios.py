"""SIMULATION.md §3 scenarios (behavioural assumptions; protocol is always the exact model)."""
from __future__ import annotations

from .engine import Scenario

BASE = Scenario("base", "Base (λ=1.1, ρ=0.6)")

SCENARIOS = [
    BASE,
    Scenario("viral", "Viral (λ=1.6 ×8w, then 0.9)", lam=((0, 1.6), (8, 0.9))),
    Scenario("cold", "Cold start (8 founders)", founders=8),
    Scenario("decline", "Decline (λ=0.7 from week 104)", lam=((0, 1.1), (104, 0.7))),
    Scenario("whale", "Whale (50% of every fire)", whale=True),
    Scenario("kindle_war", "Kindling war (A13: kindle max)", kindle_mode="max"),
    Scenario("pump", "Goal pump (A6: weeks 104–155)", pump=(104, 156, 0)),
    Scenario("no_kindle", "No kindling (reference)", kindle_mode="none"),
]

STEADY = 104  # steady-state window starts here (weeks)
