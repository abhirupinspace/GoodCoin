"""`uv run python -m goodsim` — regenerate sim/out/ deterministically."""
from __future__ import annotations

import argparse
from pathlib import Path

from . import analysis, charts, report
from .params import DISPERSION_K, HORIZON_DAYS, MC_RUNS, SEED, SPEC


def main() -> None:
    ap = argparse.ArgumentParser(prog="goodsim")
    ap.add_argument("--runs", type=int, default=MC_RUNS)
    ap.add_argument("--seed", type=int, default=SEED)
    ap.add_argument("--k", type=float, default=DISPERSION_K)
    ap.add_argument("--out", type=Path, default=Path(__file__).resolve().parents[2] / "out")
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=True)
    p = SPEC
    cfg = {"seed": a.seed, "runs": a.runs, "k": a.k, "horizon": HORIZON_DAYS}

    results = analysis.run_all(p, a.runs, a.k, a.seed, HORIZON_DAYS)
    ks = analysis.k_sensitivity(p, a.runs, a.seed)
    flood = analysis.duplicate_flood(p)
    ring = analysis.ring_analysis(p, results)
    exhaust = {pol: analysis.reserve_exhaustion(p, pol) for pol in ("A", "B")}
    depletion = analysis.treasury_depletion(p)

    charts.make_all(results, p, HORIZON_DAYS, a.out)
    report.write_csv(results, a.out / "results.csv")
    report.write_md(results, ks, flood, ring, exhaust, depletion, p, cfg, a.out / "results.md")
    print(f"wrote {a.out}/results.md, results.csv, 1-5 *.png")


if __name__ == "__main__":
    main()
