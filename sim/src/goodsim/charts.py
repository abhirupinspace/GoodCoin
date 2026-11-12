"""Charts into sim/out/*.png (matplotlib, Agg). Fixed categorical order, one y-axis per panel."""
from __future__ import annotations

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402

from .analysis import BETA, F0, GOAL_BOUNDS, GOAL_G0, PHI  # noqa: E402
from .scenarios import SCENARIOS  # noqa: E402

PALETTE = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"]
COLOR = {sc.name: PALETTE[i] for i, sc in enumerate(SCENARIOS)}
LABEL = {sc.name: sc.label for sc in SCENARIOS}
INK, INK2, GRID, SURF = "#0b0b0b", "#52514e", "#e6e5e0", "#fcfcfb"
SEQ = "Blues"

plt.rcParams.update({
    "figure.facecolor": SURF, "axes.facecolor": SURF, "axes.edgecolor": INK2, "axes.labelcolor": INK,
    "text.color": INK, "xtick.color": INK2, "ytick.color": INK2, "axes.grid": True,
    "grid.color": GRID, "grid.linewidth": 0.6, "axes.spines.top": False, "axes.spines.right": False,
    "lines.linewidth": 2.0, "font.size": 9, "axes.titlesize": 10, "legend.frameon": False,
})


def _band(ax, x, arr, color, label=None):
    p10, p50, p90 = np.percentile(arr, [10, 50, 90], axis=0)
    ax.fill_between(x, p10, p90, color=color, alpha=0.18, linewidth=0)
    ax.plot(x, p50, color=color, label=label)


def floor_chart(res, out: Path):
    names = [n for n in COLOR if n in res]
    fig, axes = plt.subplots(2, 4, figsize=(13, 6), sharex=True, sharey=True)
    for ax, n in zip(axes.flat, names):
        d = res[n]
        x = np.arange(d["floor"].shape[1])
        _band(ax, x, d["floor"] / F0, COLOR[n])
        ax.set_yscale("log")
        ax.set_title(LABEL[n], color=INK)
    for ax in axes[1]:
        ax.set_xlabel("week")
    for ax in axes[:, 0]:
        ax.set_ylabel("floor ÷ genesis floor (log)")
    fig.suptitle("Floor H/B per scenario: median and P10–P90 (monotone in every run, asserted)")
    fig.tight_layout()
    fig.savefig(out / "1_floor.png", dpi=130)
    plt.close(fig)


def supply_chart(res, out: Path):
    fig, axes = plt.subplots(1, 3, figsize=(13, 4), sharey=True)
    for ax, n in zip(axes, ("base", "viral", "decline")):
        d = res[n]
        x = np.arange(d["floor"].shape[1])
        for key, c, lab in (("max_supply", PALETTE[0], "max supply"), ("supply", PALETTE[1], "circulating"),
                            ("earmarked", PALETTE[2], "earmarked")):
            _band(ax, x, d[key] / 1e6, c, lab)
        ax.set_yscale("log")
        ax.set_title(LABEL[n])
        ax.set_xlabel("week")
    axes[0].set_ylabel("million GOOD (log)")
    axes[0].legend(loc="lower right")
    fig.tight_layout()
    fig.savefig(out / "2_supply.png", dpi=130)
    plt.close(fig)


def funding_chart(res, out: Path):
    fig, axes = plt.subplots(1, 3, figsize=(13, 4), sharey=True)
    for ax, n in zip(axes, ("base", "viral", "decline")):
        d = res[n]
        x = np.arange(d["floor"].shape[1])
        for key, c, lab in (("to_causes", PALETTE[0], "to causes"), ("H", PALETTE[1], "Hearth"),
                            ("refunded", PALETTE[2], "refunded")):
            _band(ax, x, d[key] / 1e3, c, lab)
        ax.set_title(LABEL[n])
        ax.set_xlabel("week")
    axes[0].set_ylabel("cumulative thousand NEAR")
    axes[0].legend(loc="upper left")
    fig.tight_layout()
    fig.savefig(out / "3_funding.png", dpi=130)
    plt.close(fig)


def goal_chart(res, out: Path):
    fig, axes = plt.subplots(2, 1, figsize=(12, 6), sharex=True)
    d = res["base"]
    x = np.arange(d["floor"].shape[1])
    r = 0
    ax = axes[0]
    ax.plot(x, d["givers"][r], color=PALETTE[0], label="givers")
    ax.step(x, d["base_goal"][r], where="mid", color=PALETTE[1], label="base goal ⌈Ĝ⌉")
    c = d["caught"][r] > 0
    k = (d["kindled"][r] > 0) & c
    ax.scatter(x[c & ~k], d["givers"][r][c & ~k], s=10, color=PALETTE[2], label="catch", zorder=3)
    ax.scatter(x[k], d["givers"][r][k], s=22, marker="D", color=PALETTE[3], label="kindled catch", zorder=3)
    ax.scatter(x[~c], d["givers"][r][~c], s=10, color=PALETTE[7], label="smother", zorder=3)
    ax.set_ylabel("accounts")
    ax.set_title("Base scenario, one path: givers vs ratchet goal")
    ax.legend(ncol=5, loc="upper left")
    ax = axes[1]
    _band(ax, x, d["streak"], PALETTE[0], "streak")
    ax.set_ylabel("streak (median, P10–P90)")
    ax.set_xlabel("week")
    fig.tight_layout()
    fig.savefig(out / "4_goal_streak.png", dpi=130)
    plt.close(fig)


def holder_yield_chart(res, out: Path):
    fig, axes = plt.subplots(1, 2, figsize=(12, 4))
    for n in ("base", "viral", "cold", "decline", "whale"):
        d = res[n]
        x = np.arange(d["floor"].shape[1])
        axes[0].plot(x, np.median(d["founder_value"], 0), color=COLOR[n], label=LABEL[n])
        axes[1].plot(np.median(d["cum_givers"], 0), np.median(d["founder_value"], 0), color=COLOR[n])
    axes[0].set_xlabel("week")
    axes[0].set_ylabel("floor value ÷ NEAR given (median)")
    axes[0].set_title("First caught fire's GOOD, valued at the floor")
    axes[0].legend()
    axes[1].set_xscale("log")
    axes[1].set_xlabel("cumulative distinct givers (log)")
    axes[1].set_title("…against community growth")
    fig.tight_layout()
    fig.savefig(out / "5_holder_yield.png", dpi=130)
    plt.close(fig)


def attack_chart(att, out: Path):
    fig, axes = plt.subplots(1, 2, figsize=(12, 4))
    rows = att["collusion"]
    s = [r["s"] for r in rows]
    axes[0].plot(s, [r["cost_pct"] for r in rows], marker="o", color=PALETTE[0], label="exact model")
    axes[0].plot(s, [r["formula_pct"] for r in rows], marker="s", ls="--", color=PALETTE[1],
                 label="β/(1+β)·fee·(1−s) + σ·n")
    axes[0].set_xlabel("colluders' share s of B")
    axes[0].set_ylabel("cost of one fake catch, % of gifts")
    axes[0].set_title("A6: colluding cause")
    axes[0].legend()
    kr = att["kindle"]
    axes[1].bar([r["j"] for r in kr], [r["near_at_floor"] for r in kr], color=PALETTE[0], width=0.7)
    axes[1].set_yscale("log")
    axes[1].set_xlabel("kindle index j")
    axes[1].set_ylabel("cost, NEAR at the floor (log)")
    axes[1].set_title("A13: kindle j costs 2^j · φ · min_gift")
    fig.tight_layout()
    fig.savefig(out / "6_attacks.png", dpi=130)
    plt.close(fig)


def _heat(ax, M, xt, yt, title, fmt):
    im = ax.imshow(M, cmap=SEQ, aspect="auto", origin="lower")
    ax.set_xticks(range(len(xt)), xt)
    ax.set_yticks(range(len(yt)), yt)
    ax.grid(False)
    ax.set_title(title)
    lo, hi = (np.nanmin(M), np.nanmax(M)) if np.isfinite(M).any() else (0, 1)
    span = (hi - lo) or 1
    for i in range(M.shape[0]):
        for j in range(M.shape[1]):
            v = M[i, j]
            ax.text(j, i, "—" if np.isnan(v) else fmt.format(v), ha="center", va="center",
                    color="white" if (np.isfinite(v) and (v - lo) / span > 0.6) else INK, fontsize=8)
    return im


def sweep_charts(sw, out: Path):
    xt = [f"{a}/{b}" for a, b in GOAL_BOUNDS]
    shape = (len(GOAL_G0), len(GOAL_BOUNDS))
    C, Fg = np.full(shape, np.nan), np.full(shape, np.nan)
    for (g0, gmin, gmax), v in sw["goal"].items():
        i, j = GOAL_G0.index(g0), GOAL_BOUNDS.index((gmin, gmax))
        C[i, j], Fg[i, j] = v["catch_ss"], v["floor_x"]
    fig, axes = plt.subplots(1, 2, figsize=(12, 4))
    _heat(axes[0], C, xt, GOAL_G0, "steady-state catch rate (weeks 104–155)", "{:.2f}")
    _heat(axes[1], Fg, xt, GOAL_G0, "floor at week 155 ÷ genesis (median)", "{:.0f}")
    for ax in axes:
        ax.set_xlabel("G_min / G_max")
        ax.set_ylabel("Ĝ₀")
    fig.tight_layout()
    fig.savefig(out / "7_sweep_goal.png", dpi=130)
    plt.close(fig)

    shape = (len(PHI), len(BETA))
    Fx, Cz = np.full(shape, np.nan), np.full(shape, np.nan)
    for (phi, beta), v in sw["fee"].items():
        i, j = PHI.index(phi), BETA.index(beta)
        Fx[i, j], Cz[i, j] = v["floor_x"], v["to_causes"] / 1e3
    fig, axes = plt.subplots(1, 2, figsize=(12, 4))
    _heat(axes[0], Fx, [f"{b/100:.0f}%" for b in BETA], [f"{p/100:.0f}%" for p in PHI],
          "floor at week 155 ÷ genesis (median)", "{:.0f}")
    _heat(axes[1], Cz, [f"{b/100:.0f}%" for b in BETA], [f"{p/100:.0f}%" for p in PHI],
          "NEAR to causes by week 155, thousands (median)", "{:.0f}")
    for ax in axes:
        ax.set_xlabel("β (markup)")
        ax.set_ylabel("φ (Hearth fee)")
    fig.tight_layout()
    fig.savefig(out / "8_sweep_fee.png", dpi=130)
    plt.close(fig)


def cold_chart(cold, out: Path):
    fig, ax = plt.subplots(figsize=(6, 3.5))
    g = [r["G0"] for r in cold]
    ax.plot(g, [r["p_catch"] for r in cold], marker="o", color=PALETTE[0])
    ax.axhline(0.5, color=INK2, ls="--", lw=1)
    ax.text(g[-1], 0.52, "acceptance: 50%", ha="right", color=INK2)
    ax.set_xlabel("Ĝ₀")
    ax.set_ylabel("P(fire 0 catches)")
    ax.set_title("Cold start: 8 committed founders + their recruits")
    fig.tight_layout()
    fig.savefig(out / "9_cold_start.png", dpi=130)
    plt.close(fig)


def make_all(res, att, sw, cold, out: Path):
    floor_chart(res, out)
    supply_chart(res, out)
    funding_chart(res, out)
    goal_chart(res, out)
    holder_yield_chart(res, out)
    attack_chart(att, out)
    sweep_charts(sw, out)
    cold_chart(cold, out)
