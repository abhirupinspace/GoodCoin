"""results.csv, results.md (tables) and REPORT.md (methods, interpretation, acceptance, params)."""
from __future__ import annotations

import csv
from pathlib import Path

from .analysis import F0
from .params import PROD, REC
from .scenarios import SCENARIOS

LABEL = {sc.name: sc.label for sc in SCENARIOS}
NEAR_ = 1e24


def _p(x, fmt="{:.2f}"):
    """P10/P50/P90 triple → 'median (P10–P90)'."""
    return f"{fmt.format(x[1])} ({fmt.format(x[0])}–{fmt.format(x[2])})"


def write_csv(summ: list[dict], path: Path) -> None:
    cols = list(summ[0])
    with path.open("w", newline="") as fh:
        w = csv.writer(fh)
        head = []
        for c in cols:
            head += [f"{c}_p10", f"{c}_p50", f"{c}_p90"] if hasattr(summ[0][c], "__len__") and not isinstance(summ[0][c], str) else [c]
        w.writerow(head)
        for s in summ:
            row = []
            for c in cols:
                v = s[c]
                row += [f"{x:.6g}" for x in v] if hasattr(v, "__len__") and not isinstance(v, str) else [v if isinstance(v, str) else f"{v:.6g}"]
            w.writerow(row)


def _label(name: str) -> str:
    base, _, rec = name.partition("@")
    return LABEL.get(base, base) + (" — recommended params" if rec else "")


def tables(summ, summ_rec, pump, cold, sw, att, cfg) -> list[str]:
    L = []
    L.append(f"Runs: {cfg['runs']} paths × {cfg['weeks']} weeks per scenario; sweeps {cfg['sweep_runs']} paths × 156 weeks "
             f"per cell; cold start {cfg['cold_runs']} fire-0 trials per Ĝ₀; seed {cfg['seed']}; "
             f"wall time {cfg['seconds']} s. Every state transition is the exact integer model; the floor "
             "high-water mark was asserted after every op of every run.\n")
    L.append("### Scenarios (SPEC §9 production params unless marked)\n")
    L.append("| Scenario | catch rate (all) | steady catch rate (wk ≥104, P10–P90 of paths) | P(fire 0) | rescued fires | GOOD burned by kindles | floor ÷ genesis, 1 y | floor ÷ genesis, 5 y | max supply 5 y (M) | circulating 5 y (M) | NEAR to causes 5 y | week-0 GOOD value ÷ gift, 5 y |")
    L.append("|---|---|---|---|---|---|---|---|---|---|---|---|")
    for s in summ + summ_rec:
        L.append(f"| {_label(s['scenario'])} | {s['catch_rate']:.1%} | {s['catch_rate_ss']:.1%} ({s['catch_rate_ss_p10']:.0%}–{s['catch_rate_ss_p90']:.0%}) | "
                 f"{s['fire0_catch']:.0%} | {s['rescue_rate']:.1%} | {s['good_burned_m']:.2f} M ({s['burn_pct_supply']:.2f}% of supply) | "
                 f"{_p(s['floor_x_1y'], '{:.0f}')} | {_p(s['floor_x_end'], '{:.0f}')} | {_p(s['max_supply_end_m'], '{:.0f}')} | "
                 f"{_p(s['supply_end_m'], '{:.0f}')} | {_p(s['to_causes_end'], '{:,.0f}')} | {_p(s['founder_value_end'])} |")
    L.append("")
    L.append("| Scenario | givers / week (steady) | base goal (steady) | allowance binds (share of catches) | bounty weight (% of fire weight) | mean max streak | whale GOOD share | GOOD cancelled by `close` (M) |")
    L.append("|---|---|---|---|---|---|---|---|")
    for s in summ + summ_rec:
        L.append(f"| {_label(s['scenario'])} | {s['givers_ss']:.0f} | {s['goal_ss']:.0f} | {s['allow_bind_frac']:.0%} | "
                 f"{s['bounty_share_pct']:.2f}% | {s['max_streak']:.1f} | {s['whale_share']:.0%} | {s['closed_good_m']:.2f} |")
    L.append("")
    L.append("### Cold start: P(fire 0 catches) with 8 committed founders\n")
    L.append("| Ĝ₀ | " + " | ".join(str(r["G0"]) for r in cold) + " |")
    L.append("|---|" + "---|" * len(cold))
    L.append("| P(catch) | " + " | ".join(f"{r['p_catch']:.0%}" for r in cold) + " |")
    L.append(f"\nMedian fire-0 givers: {cold[0]['givers_med']:.0f} (8 founders + NegBin recruits, mean (λ−ρ)·8 = 4).\n")
    L.append("### A6 colluding cause: cost of one fake catch (exact model)\n")
    L.append("| colluders' share s of B | goal (accounts) | gifts X (NEAR) | cost (NEAR) | cost % of X | formula β/(1+β)·fee·(1−s)+σ·n |")
    L.append("|---|---|---|---|---|---|")
    for r in att["collusion"]:
        L.append(f"| {r['s']:.2f} | {r['goal']} | {r['X']:.0f} | {r['cost']:.3f} | {r['cost_pct']:.2f}% | {r['formula']:.3f} ({r['formula_pct']:.2f}%) |")
    L.append("\nCost = NEAR in − 90% returned off-chain − change in the floor value of the colluders' GOOD.\n")
    L.append("### A7 Sybil givers (outsider, no collusion)\n")
    L.append("| fake givers G | NEAR spent | reaches cause | GOOD received, floor value | net cost | cause share of spend |")
    L.append("|---|---|---|---|---|---|")
    for r in att["sybil"]:
        L.append(f"| {r['G']} | {r['spent']:.3f} | {r['to_cause']:.3f} | {r['good_value']:.3f} | {r['net_cost']:.3f} | {r['cause_share_pct']:.1f}% |")
    L.append("\n### A29 self-spark / account splitting (10 NEAR net, 30 honest givers)\n")
    L.append("| accounts | bounty weight moved (NEAR) | GOOD gain vs 1 account (yocto) | others' GOOD change (yocto) | extra record fees (NEAR) |")
    L.append("|---|---|---|---|---|")
    for r in att["self_spark"]:
        L.append(f"| {r['n']} | {r['bounty_moved']:.3f} | {r['gain_yocto']} | {r['others_delta']} | {r['record_fees'] - 0.005:.3f} |")
    L.append("\n### A13 kindle price (exact GOOD at a reference state)\n")
    L.append("| j | GOOD burned | NEAR at floor | cumulative NEAR |")
    L.append("|---|---|---|---|")
    for r in att["kindle"]:
        if r["j"] in (0, 1, 2, 3, 4, 5, 8, 12, 16):
            L.append(f"| {r['j']} | {r['good']:,.0f} | {r['near_at_floor']:,.1f} | {r['cum_near']:,.1f} |")
    L.append("\n### Goal pump (A6): colluding cause pads its own weeks 104–155 to force unkindled catches\n")
    L.append("| metric | base | pump |")
    L.append("|---|---|---|")
    L.append(f"| peak base goal, weeks 104–155 | {pump['goal_peak_base']:.0f} | {pump['goal_peak_pump']:.0f} |")
    L.append(f"| smothers in the 52 weeks after | {pump['smothers_after_base']:.1f} | {pump['smothers_after_pump']:.1f} |")
    L.append(f"| max supply at 5 y (M) | {pump['max_supply_end_base_m']:.1f} | {pump['max_supply_end_pump_m']:.1f} |")
    L.append(f"| NEAR to causes at 5 y | {pump['to_causes_base']:,.0f} | {pump['to_causes_pump']:,.0f} |")
    L.append(f"\nFake givers per path: {pump['fake_givers_per_run']:.0f} (≈ {pump['fake_givers_per_run'] * 0.025:.1f} NEAR at ≈2.5% per fake min-gift).\n")
    L.append("### Sweeps (base behaviour, 156 weeks, median of paths)\n")
    L.append("Goal parameters (`—` = invalid: G₀ outside bounds or |e| > 70):\n")
    L.append("| Ĝ₀ | G_min/G_max | catch rate | steady catch rate | floor ÷ genesis | rescued |")
    L.append("|---|---|---|---|---|---|")
    for (g0, gmin, gmax), v in sw["goal"].items():
        L.append(f"| {g0} | {gmin}/{gmax} | {v['catch']:.1%} | {v['catch_ss']:.1%} | {v['floor_x']:.0f} | {v['rescues']:.1%} |")
    L.append("\nHearth fee φ × markup β:\n")
    L.append("| φ | β | floor ÷ genesis | floor growth after fire 0 | NEAR to causes | catch rate |")
    L.append("|---|---|---|---|---|---|")
    for (phi, beta), v in sw["fee"].items():
        L.append(f"| {phi / 100:.0f}% | {beta / 100:.0f}% | {v['floor_x']:.0f} | {v['floor_growth']:.1f}× | {v['to_causes']:,.0f} | {v['catch']:.1%} |")
    L.append("\nAllowance α:\n")
    L.append("| α | allowance binds | max supply (M) | circulating (M) | floor ÷ genesis |")
    L.append("|---|---|---|---|---|")
    for (al,), v in sw["alpha"].items():
        L.append(f"| {al / 100:.2f}% | {v['bind']:.0%} | {v['max_supply_m']:.0f} | {v['supply_m']:.0f} | {v['floor_x']:.0f} |")
    L.append("\nHolder altruism κ (value of a catch per NEAR reaching the cause) and giver-count dispersion k:\n")
    L.append("| sweep | setting | steady catch rate | rescued fires |")
    L.append("|---|---|---|---|")
    for (kap,), v in sw["kappa"].items():
        L.append(f"| κ | {kap} | {v['catch_ss']:.1%} | {v['rescues']:.1%} |")
    for (k, mode), v in sw["disp"].items():
        L.append(f"| NegBin k, kindle={mode} | {k:g} | {v['catch_ss']:.1%} | {v['rescues']:.1%} |")
    L.append("\nWhat-if (NOT SPEC): smother step e −= 2 instead of 1:\n")
    L.append("| NegBin k | smother step | steady catch rate | rescued |")
    L.append("|---|---|---|---|")
    for (k, step), v in sw["ratchet"].items():
        L.append(f"| {k:g} | {step} | {v['catch_ss']:.1%} | {v['rescues']:.1%} |")
    return L


def write_results(summ, summ_rec, pump, cold, sw, att, cfg, path: Path) -> None:
    L = ["# GOODCOIN simulator results", "", "Generated by `uv run python -m goodsim`. Interpretation: [REPORT.md](REPORT.md).", ""]
    L += tables(summ, summ_rec, pump, cold, sw, att, cfg)
    path.write_text("\n".join(L) + "\n")


def acceptance(summ, summ_rec, cold, att):
    S = {s["scenario"]: s for s in summ + summ_rec}
    p20 = S["cold"]["fire0_catch"]
    prec = S["cold@rec"]["fire0_catch"]
    b, br = S["base"]["catch_rate_ss"], S["base@rec"]["catch_rate_ss"]
    c0 = att["collusion"][0]["cost_pct"]
    k0 = att["kindle"][0]["near_at_floor"]
    return [
        ("Cold start: P(fire 0) ≥ 50% with 8 founders",
         f"Ĝ₀=20 (SPEC): {p20:.0%} **FAIL**; Ĝ₀={REC.G0} (recommended): {prec:.0%} **{'PASS' if prec >= 0.5 else 'FAIL'}**"),
        ("Base steady-state catch rate in 55–85%",
         f"SPEC params: {b:.1%} **{'PASS' if 0.55 <= b <= 0.85 else 'FAIL'}**; recommended: {br:.1%} "
         f"**{'PASS' if 0.55 <= br <= 0.85 else 'FAIL'}** (structural, see §4)"),
        ("Fake-catch cost reported vs s; ≥ 2% of gifts at s≈0",
         f"{c0:.2f}% at s=0, falling to {att['collusion'][-1]['cost_pct']:.2f}% at s={att['collusion'][-1]['s']:.2f} **{'PASS' if c0 >= 2 else 'FAIL'}**"),
        ("One kindle costs one gift's Hearth share; rescue frequency and burn reported",
         f"first kindle = {k0:.4f} NEAR at the floor = φ·min_gift **{'PASS' if abs(k0 - 0.1) < 1e-6 else 'FAIL'}**; "
         f"base rescues {S['base']['rescue_rate']:.1%} of fires, burning {S['base']['burn_pct_supply']:.2f}% of supply over 5 y"),
        ("Floor never decreases in any simulated step", "asserted (H·B* ≥ H*·B) after every op of every run **PASS**"),
    ]


def write_report(summ, summ_rec, pump, cold, sw, att, cfg, path: Path) -> None:
    S = {s["scenario"]: s for s in summ + summ_rec}
    b = S["base"]
    acc = acceptance(summ, summ_rec, cold, att)
    g0_ok = max((r["G0"] for r in cold if r["p_catch"] >= 0.5), default=None)
    gmax_bind = sw["goal"].get((20, 2, 200), {}).get("catch_ss", float("nan"))
    rat = sw["ratchet"]
    fee = sw["fee"]
    L = [
        "# GOODCOIN economic simulation — report",
        "",
        "Generated by `uv run python -m goodsim` (deterministic, seed "
        f"{cfg['seed']}, {cfg['seconds']} s). Tables: [results.md](results.md), [results.csv](results.csv). "
        "Protocol: docs/SPEC.md; plan: docs/SIMULATION.md.",
        "",
        "## 1. Method",
        "- **Exact protocol.** Every give, kindle, settle, payout, claim, close and redeem goes through "
        "`goodsim.protocol.Protocol`, the integer reference model (yocto units, SPEC rounding, the same code that "
        "produces `tests/golden/basic.json`). Only behaviour is sampled (numpy). After every op the model asserts "
        "SPEC §8 invariants, including the floor high-water mark `H·B* ≥ H*·B` and solvency "
        "`balance ≥ H + escrow + payouts + refunds + carry + storage`.",
        "- **Givers.** Returning ~ Binomial(previous givers, ρ=0.6). New ~ NegBin(mean = (λ−ρ)·x·(1−x/K) + 1, k=2), "
        "x = previous givers, K = 1500. So E[next] = λ·x while small, saturating at x* = K(λ−1)/(λ−ρ) ≈ 300 for "
        "λ=1.1 (≈200 realised, because new arrivals are over-dispersed). Gift ~ LogNormal(median 2 NEAR, σ=1) "
        "truncated at `min_gift`. A newcomer names an earlier giver of the same fire as spark with p=0.5. "
        "Fire 0: all founders give plus NegBin recruits.",
        "- **Holders.** Kindle (rational): at the rescue window the largest holder bridges the whole shortfall if "
        "allowed by SPEC (≤ max(1,⌊⌈Ĝ⌉/4⌋) short, j ≤ 16, goal ≥ 1), affordable, and "
        "`(1−s)·Σcost·F ≤ s·β/(1+β)·fee + κ·pay` with κ = 1% (altruistic value of the gifts reaching the cause). "
        "`max` mode (kindling war) kindles whenever allowed and affordable by any holder. Market premium over the floor "
        "is a reflected random walk (σ=5%/week); below 2% each holder redeems everything with p=10%. 3% of givers never "
        "claim; a keeper calls `close` 52 weeks later.",
        "- **Horizon** 260 weeks (5 y), 4 causes, payouts always succeed in MC (dead causes/carry are covered by the "
        "golden trace and unit tests). Steady state = weeks 104–259.",
        "- **Interpretation of λ** (ambiguity in SIMULATION §2): \"new ~ NegBin(mean = λ × previous)\" plus ρ=0.6 "
        "retention would grow 1.7×/week even in *Decline*; we read λ as the total growth multiplier, so the "
        "new-giver mean is (λ−ρ)·x, and add logistic saturation so Base has a steady state.",
        "",
        "## 2. Results at a glance (SPEC production params)",
        f"- **Floor.** Base: {b['floor_x_1y'][1]:.0f}× genesis after 1 y and {b['floor_x_end'][1]:.0f}× "
        f"(P10–P90 {b['floor_x_end'][0]:.0f}–{b['floor_x_end'][2]:.0f}) after 5 y; monotone in all runs. "
        f"Decline flattens it, never lowers it ({S['decline']['floor_x_end'][1]:.0f}×).",
        f"- **Holder yield.** GOOD from the first caught fire is worth {b['founder_value_1y'][1]:.2f}× its gift at the "
        f"floor after 1 y and {b['founder_value_end'][1]:.2f}× after 5 y (Base). At claim time it is "
        f"{b['founder_value_0']:.1%} (the allowance binds in fire 0, so below SPEC §10.3's ≈9%).",
        f"- **Causes.** Base sends {b['to_causes_end'][1]:,.0f} NEAR to causes over 5 y "
        f"({b['hearth_end'][1]:,.0f} NEAR in the Hearth, {b['refunded_end'][1]:,.0f} refunded).",
        f"- **Supply.** Max supply ends at {b['max_supply_end_m'][1]:.0f} M (smothers destroyed "
        f"{1000 - b['max_supply_end_m'][1]:.0f} M); circulating {b['supply_end_m'][1]:.0f} M. The allowance binds in "
        f"{b['allow_bind_frac']:.0%} of catches ({b['bind_y1']:.0%} in year 1, {b['bind_last']:.0%} in year 5).",
        f"- **Ratchet.** Steady-state catch rate {b['catch_rate_ss']:.1%}; goal tracks the community "
        f"(mean goal {b['goal_ss']:.0f} vs {b['givers_ss']:.0f} givers).",
        f"- **Kindling.** Base: {b['rescue_rate']:.1%} of fires rescued, {b['good_burned_m']:.2f} M GOOD burned "
        f"({b['burn_pct_supply']:.2f}% of supply). Kindling war: {S['kindle_war']['rescue_rate']:.1%} rescued, "
        f"{S['kindle_war']['good_burned_m']:.2f} M burned; floor {S['kindle_war']['floor_x_end'][1]:.0f}× vs "
        f"{b['floor_x_end'][1]:.0f}× (burns raise it). No kindling: {S['no_kindle']['catch_rate_ss']:.1%} steady catch rate.",
        f"- **Whale** ({S['whale']['whale_share']:.0%} of GOOD): same catch dynamics; the floor rises faster "
        f"({S['whale']['floor_x_end'][1]:.0f}×) because the whale doubles every fee. Within a fire every giver, whale or not, "
        "gets the same GOOD per unit of weight, so concentration changes who holds GOOD, not the floor rule.",
        f"- **Viral** spike then λ=0.9 decays to ~{S['viral']['givers_ss']:.0f} givers/week; ratchet follows down to "
        f"goal ≈{S['viral']['goal_ss']:.0f}; catch rate {S['viral']['catch_rate_ss']:.0%} in steady state.",
        "",
        "## 3. Acceptance criteria (SIMULATION.md §6)",
        "",
        "| Criterion | Result |",
        "|---|---|",
    ]
    L += [f"| {a} | {r} |" for a, r in acc]
    L += [
        "",
        "## 4. Interpretation (honest)",
        "1. **The ratchet's fixed point is 50% unkindled catches.** With ×1.1 on an unkindled catch and ÷1.1 on a "
        "smother, the base goal settles where P(unkindled catch) = P(smother). So steady-state catch rate = "
        "50% + ½·(rescue rate). Ĝ₀, G_min, φ and β cannot move it (sweep: every cell with a non-binding G_max sits "
        "at 47–50% in weeks 104–155). Only "
        f"three things do: (a) a binding G_max (G_max=200 with ~200 givers: {gmax_bind:.0%}, but it caps the goal and "
        "makes catches easy), (b) more rescues, (c) an asymmetric step. Kindle reach is capped at 17 givers and its "
        "price doubles, so with realistically noisy turnout (NegBin k=2: weekly givers swing ±25%) holders rescue only "
        f"~{b['rescue_rate']:.0%} of fires even when they kindle at any price. With calm turnout (k=100) rational rescues "
        f"reach {sw['disp'][(100.0, 'rational')]['rescues']:.0%} and the catch rate {sw['disp'][(100.0, 'rational')]['catch_ss']:.0%}.",
        "   **The 55–85% criterion therefore fails under SPEC as written for our Base behaviour.** If the target matters, "
        f"the cleanest SPEC change is a smother step of e −= 2 (fixed point P(catch) = 2/3): {rat[(2.0, 2)]['catch_ss']:.0%} "
        f"(k=2) and {rat[(10.0, 2)]['catch_ss']:.0%} (k=10) in the what-if sweep. That breaks the \"catch then smother "
        "returns exactly to the start\" property and is a decision for the SPEC owner, not the simulator. We do not apply it.",
        f"2. **Cold start needs a lower Ĝ₀.** 8 founders plus recruits median {cold[0]['givers_med']:.0f} givers; "
        f"P(fire 0) ≥ 50% holds for Ĝ₀ ≤ {g0_ok}. Ĝ₀ = 20 gives {S['cold']['fire0_catch']:.0%}. Fire 0 cannot be "
        "kindled (nobody holds GOOD yet). A lower Ĝ₀ costs nothing later: the ratchet reaches the community size in "
        "a few dozen weeks (sweep: floor and catch rate are flat in Ĝ₀).",
        "3. **SPEC's |e| ≤ 70 bound constrains G_max/Ĝ₀ ≤ 1.1^70 ≈ 789.** SPEC's own 20/10,000 is fine (e_max=65), but "
        f"Ĝ₀ = {REC.G0} with G_max = 10,000 would need e_max = 72. Hence G_max = {REC.Gmax:,} (e_max = 65), still far "
        "above any simulated community.",
        "4. **φ and β trade cause funding against holder yield; catches are unaffected.** Each +5 pp of φ costs causes "
        f"~5.5% of NEAR and raises the floor roughly in proportion to φ (φ=10%,β=25%: floor {fee[(1000, 2500)]['floor_x']:.0f}×, causes "
        f"{fee[(1000, 2500)]['to_causes']:,.0f}; φ=20%: {fee[(2000, 2500)]['floor_x']:.0f}×, {fee[(2000, 2500)]['to_causes']:,.0f}). "
        "β moves value from new givers to existing holders without changing what causes get "
        f"(β=100%: floor {fee[(1000, 10000)]['floor_x']:.0f}×) but makes \"giving is giving\" more extreme for newcomers. "
        "SPEC's 10%/25% is a reasonable middle; no evidence to move it.",
        "5. **Attacks are priced as SPEC says.** A fake catch costs "
        f"{att['collusion'][0]['cost_pct']:.2f}% of gifts for an outside colluder, falling linearly to "
        f"{att['collusion'][-1]['cost_pct']:.2f}% at s = {att['collusion'][-1]['s']:.2f} (formula within 0.1 pp; exact is "
        "slightly cheaper because new GOOD dilutes B). Sybil givers cost min_gift+σ each and 89.6% of the spend "
        "reaches the cause. Self-sparking gains exactly 0 (down to −6 yocto from rounding, minus extra σ). "
        f"The goal pump raises the peak goal {pump['goal_peak_base']:.0f}→{pump['goal_peak_pump']:.0f} and adds "
        f"{pump['smothers_after_pump'] - pump['smothers_after_base']:.1f} smothers in the following year: with 4 rotating "
        "causes a single colluder gets one ratchet step in four weeks and honest weeks undo it.",
        "6. **What we do not claim.** Behaviour parameters (λ, ρ, k, κ, premium) are assumptions, not data. "
        "Floor, supply and funding results are independent of the market premium except through redemptions, which "
        "never lower the floor.",
        "",
        "## 5. Recommended SPEC §9 values",
        "",
        "| Param | SPEC now | Recommended | Why |",
        "|---|---|---|---|",
        "| W | 7 d | 7 d | behaviour is modelled per week; no evidence to change |",
        "| min_gift / σ | 1 / 0.005 NEAR | 1 / 0.005 NEAR | σ = 0.5% of a min gift; it is most of a fake catch's cost floor (σ·n) |",
        "| φ | 10% | 10% | 90% to causes; floor ×~70 in 5 y (Base); φ=20% only buys a higher floor at causes' expense |",
        "| β | 25% | 25% | keeps fake-catch cost ≥ 2% at s=0; higher β shifts value to early holders |",
        "| γ | 25% | 25% | bounty moved ≈2% of fire weight; zero-sum, no attack surface (A29) |",
        f"| α | 0.25% | 0.25% | binds in {b['allow_bind_frac']:.0%} of catches; α=1% triples circulating supply by year 3 and cuts the "
        "floor ~3×, and each smother destroys 4× more cap; α=0.1% doubles the floor but mints <½ the GOOD per gift; no evidence to move |",
        f"| Ĝ₀ | 20 | **{REC.G0}** | cold start P(fire 0) {S['cold@rec']['fire0_catch']:.0%} vs {S['cold']['fire0_catch']:.0%}; later dynamics unchanged |",
        f"| G_min | 5 | {REC.Gmin} | a fire of < 5 accounts is not \"together\"; not binding in Base |",
        f"| G_max | 10,000 | **{REC.Gmax:,}** | SPEC |e| ≤ 70 requires G_max/Ĝ₀ ≤ ~789 |",
        "| Demo Ĝ₀/G_min/G_max | 4/2/100 | 4/2/100 | valid (e ∈ [−7, 33]); golden trace exercises all paths |",
        "",
        "Open SPEC decision (not a parameter): accept a ~51% steady-state catch rate, or change the smother step "
        "(§4.1) to hit the 55–85% target.",
        "",
        "## 6. Charts",
        "",
        "![floor](1_floor.png)", "![supply](2_supply.png)", "![funding](3_funding.png)",
        "![goal](4_goal_streak.png)", "![yield](5_holder_yield.png)", "![attacks](6_attacks.png)",
        "![goal sweep](7_sweep_goal.png)", "![fee sweep](8_sweep_fee.png)", "![cold start](9_cold_start.png)",
        "",
        "## 7. Tables",
        "",
    ]
    L += tables(summ, summ_rec, pump, cold, sw, att, cfg)
    path.write_text("\n".join(L) + "\n")


_ = (PROD, F0, NEAR_)
