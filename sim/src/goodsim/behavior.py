"""Weekly participation model.

participants  ~ NegBin(mean mu_p, dispersion k)   (k = inf -> Poisson; Var = mu + mu^2/k)
deeds/person  = 1 + Poisson(mu_d/mu_p - 1)         (a participant has >= 1 deed by definition)
approval      : each deed approved w.p. `approval`; a person counts iff >= 1 approved deed.
With approval = 1 (default; spec numbers are already APPROVED deeds) E[deeds | P] = P * mu_d/mu_p.
"""
from __future__ import annotations

import numpy as np


def negbin(rng: np.random.Generator, mu: np.ndarray, k: float, size) -> np.ndarray:
    mu = np.broadcast_to(np.asarray(mu, dtype=float), size)
    out = np.zeros(size, dtype=np.int64)
    pos = mu > 0
    if not np.isfinite(k):
        out[pos] = rng.poisson(mu[pos])
    else:
        out[pos] = rng.negative_binomial(k, k / (k + mu[pos]))
    return out


def sample(rng: np.random.Generator, mu_d: np.ndarray, mu_p: np.ndarray, runs: int, k: float,
           approval: float = 1.0) -> tuple[np.ndarray, np.ndarray]:
    """Return (approved_deeds, participants), each shape (runs, n_epochs)."""
    mu_d = np.asarray(mu_d, dtype=float)
    mu_p = np.asarray(mu_p, dtype=float)
    size = (runs, mu_p.size)
    ratio = np.divide(mu_d, mu_p, out=np.ones_like(mu_p), where=mu_p > 0)
    if np.any(ratio < 1):
        raise ValueError("deeds/participant mean must be >= 1")
    submitters = negbin(rng, mu_p, k, size)
    extra = rng.poisson(submitters * (ratio - 1.0))
    deeds = submitters + extra
    if approval >= 1.0:
        return deeds, submitters
    # exact per-person thinning (only used for approval < 1)
    appr_d = np.zeros(size, dtype=np.int64)
    appr_p = np.zeros(size, dtype=np.int64)
    for idx in np.ndindex(*size):
        n = submitters[idx]
        if n == 0:
            continue
        per = 1 + rng.poisson(ratio[idx[1]] - 1.0, n)
        ok = rng.binomial(per, approval)
        appr_d[idx] = ok.sum()
        appr_p[idx] = (ok > 0).sum()
    return appr_d, appr_p
