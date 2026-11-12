"""`uv run python -m goodsim` regenerates sim/out/ deterministically; `--trace` writes the golden trace."""
from __future__ import annotations

import argparse
import time
from pathlib import Path

from . import analysis, attacks, charts, report, trace
from .params import COLD_RUNS, HORIZON, REC, RUNS, SEED, SWEEP_RUNS
from .scenarios import BASE, SCENARIOS


def main() -> None:
    ap = argparse.ArgumentParser(prog="goodsim")
    ap.add_argument("--trace", action="store_true", help="write tests/golden/basic.json and exit")
    ap.add_argument("--runs", type=int, default=RUNS)
    ap.add_argument("--sweep-runs", type=int, default=SWEEP_RUNS)
    ap.add_argument("--seed", type=int, default=SEED)
    ap.add_argument("--weeks", type=int, default=HORIZON)
    ap.add_argument("--out", type=Path, default=Path(__file__).resolve().parents[2] / "out")
    a = ap.parse_args()
    if a.trace:
        print(f"wrote {trace.write()}")
        return
    t0 = time.time()
    a.out.mkdir(parents=True, exist_ok=True)
    res = analysis.run_scenarios(a.runs, a.seed, a.weeks)
    rec = analysis.run_scenarios(a.runs, a.seed, a.weeks, cfg=REC,
                                 scenarios=[BASE, next(s for s in SCENARIOS if s.name == "cold")])
    summ = [analysis.summarize(n, d) for n, d in res.items()]
    summ_rec = [analysis.summarize(n + "@rec", d) for n, d in rec.items()]
    pump = analysis.pump_effect(res)
    cold = analysis.cold_start(a.seed, COLD_RUNS)
    sw = analysis.sweeps(a.seed, a.sweep_runs)
    att = attacks.run_all()
    charts.make_all(res, att, sw, cold, a.out)
    cfg = {"runs": a.runs, "sweep_runs": a.sweep_runs, "seed": a.seed, "weeks": a.weeks,
           "cold_runs": COLD_RUNS, "seconds": round(time.time() - t0, 1)}
    report.write_csv(summ + summ_rec, a.out / "results.csv")
    report.write_results(summ, summ_rec, pump, cold, sw, att, cfg, a.out / "results.md")
    report.write_report(summ, summ_rec, pump, cold, sw, att, cfg, a.out / "REPORT.md")
    print(f"wrote {a.out}/REPORT.md, results.md, results.csv, *.png in {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
