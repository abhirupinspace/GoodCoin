"""Scenario definitions (per-epoch weekly means) and adaptive attack transforms."""
from __future__ import annotations

import numpy as np

from .params import SCENARIOS_SPEC, Params

N_EPOCHS = 9  # epochs 0..8 overlap the 60-day horizon; only 0..7 settle


def const(mu_d: float, mu_p: float, n: int = N_EPOCHS):
    return np.full(n, mu_d), np.full(n, mu_p)


def spike():
    """Base means, 10x participation (and deeds) in week 4 (epoch index 3)."""
    d, p = const(*SCENARIOS_SPEC["base"])
    d[3] *= 10
    p[3] *= 10
    return d, p


def collapse():
    """Base means for weeks 1-3 (epochs 0-2), zero activity afterwards."""
    d, p = const(*SCENARIOS_SPEC["base"])
    d[3:] = 0
    p[3:] = 0
    return d, p


# name -> (mu_d per epoch, mu_p per epoch, attack transform or None, description)
SCENARIOS = {
    "optimistic": (*const(*SCENARIOS_SPEC["optimistic"]), None, "spec: 180 deeds / 90 people per week"),
    "base": (*const(*SCENARIOS_SPEC["base"]), None, "spec: 110 deeds / 55 people per week"),
    "pessimistic": (*const(*SCENARIOS_SPEC["pessimistic"]), None, "spec: 45 deeds / 25 people per week"),
    "spike": (*spike(), None, "base, 10x participation in week 4"),
    "collapse": (*collapse(), None, "base for weeks 1-3, then 0"),
    "repeated_failures": (*const(0.0, 0.0), None, "no activity: all 8 epochs fail"),
    "pessimistic_ring": (*const(*SCENARIOS_SPEC["pessimistic"]), "ring",
                         "pessimistic + collusion ring tops up every failing epoch with sock-puppets"),
}
SPEC_NAMES = ("optimistic", "base", "pessimistic")


def ring_topup(deeds: np.ndarray, parts: np.ndarray, p: Params):
    """Minimal Sybil top-up to make an epoch succeed.

    Each sock-puppet needs >= 1 approved (fake) deed to count as a participant.
    puppets = max(0, P_target - P); fakes = max(puppets, D_target - D).
    Returns (deeds', participants', puppets, fakes).
    """
    puppets = np.maximum(0, p.participants_target - parts)
    fakes = np.maximum(puppets, p.deeds_target - deeds)
    fakes = np.maximum(fakes, 0)
    return deeds + fakes, parts + puppets, puppets, fakes
