"""PNG charts. One idea per chart; Monte Carlo P10-P90 band + deterministic mean path."""
from __future__ import annotations

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from matplotlib.ticker import FuncFormatter  # noqa: E402

from .scenarios import SPEC_NAMES  # noqa: E402

# validated default categorical palette (fixed order)
COLORS = {"optimistic": "#2a78d6", "base": "#eb6834", "pessimistic": "#1baf7a"}
POLICY_COLORS = {"A": "#2a78d6", "B": "#eb6834", "C": "#1baf7a", "burned": "#52514e"}
INK, MUTED, GRID = "#0b0b0b", "#52514e", "#e4e3df"

plt.rcParams.update({
    "figure.dpi": 110, "savefig.dpi": 140, "font.size": 10, "axes.edgecolor": MUTED,
    "axes.labelcolor": INK, "xtick.color": MUTED, "ytick.color": MUTED, "axes.grid": True,
    "grid.color": GRID, "grid.linewidth": 0.8, "axes.spines.top": False, "axes.spines.right": False,
    "figure.facecolor": "#fcfcfb", "axes.facecolor": "#fcfcfb", "legend.frameon": False,
    "svg.hashsalt": "goodsim",
})
SAVE_KW = {"metadata": {"Software": None}}
comma = FuncFormatter(lambda v, _: f"{v:,.0f}")


def _band(ax, results, key, scale=1.0, label_fmt="{}"):
    days = np.arange(next(iter(results.values()))["B"]["daily"][key].shape[1])
    for name in SPEC_NAMES:
        r = results[name]["B"]
        mc = r["daily"][key] / scale
        lo, hi = np.percentile(mc, 10, axis=0), np.percentile(mc, 90, axis=0)
        ax.fill_between(days, lo, hi, color=COLORS[name], alpha=0.18, linewidth=0,
                        step="post", label=f"{name} MC P10–P90")
        ax.step(days, r["mean_daily"][key] / scale, where="post", color=COLORS[name], lw=2,
                label=f"{name} mean path")
    ax.set_xlabel("day since genesis")
    ax.set_xlim(0, days[-1])
    return days


def _settle_marks(ax, p, horizon):
    for n in range(p.epochs_settled_by(horizon)):
        ax.axvline(p.settle_day(n), color=GRID, lw=0.8, zorder=0)


def supply(results, p, horizon, path):
    fig, ax = plt.subplots(figsize=(8, 4.5))
    _settle_marks(ax, p, horizon)
    _band(ax, results, "supply_mechanic", 1e6)
    ax.set_ylabel("total supply, mechanic-only (M GOOD)")
    ax.set_title("Daily total supply excl. vesting — policy B (2,000 MC runs)", loc="left")
    ax.legend(ncol=2, fontsize=8, loc="lower left")
    fig.text(0.01, 0.01, "Grey verticals = settlement days 7(N+1)+1. Optimistic and base mean paths overlap at ~250.0M. "
             "Pessimistic band = its mean path. Vesting excluded (see results.md).", fontsize=7, color=MUTED)
    fig.tight_layout(rect=(0, 0.03, 1, 1))
    fig.savefig(path, **SAVE_KW)
    plt.close(fig)


def treasury(results, p, horizon, path):
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(8, 6), sharex=True,
                                   gridspec_kw={"height_ratios": [3, 1.4]})
    for ax in (ax1, ax2):
        _settle_marks(ax, p, horizon)
    _band(ax1, results, "treasury", 1e6)
    ax1.set_ylabel("treasury held, locked+spendable (M GOOD)")
    ax1.set_xlabel("")
    ax1.set_title("Public-goods treasury balance — policy B", loc="left")
    ax1.legend(ncol=2, fontsize=8, loc="lower left")
    _band(ax2, results, "spendable", 1.0)
    ax2.set_ylabel("spendable (GOOD)")
    ax2.yaxis.set_major_formatter(comma)
    fig.text(0.01, 0.01, f"spend_rate={p.spend_rate}: proposals pay out that fraction of spendable "
             "at each settlement (leaves treasury, supply unchanged).", fontsize=7, color=MUTED)
    fig.tight_layout(rect=(0, 0.03, 1, 1))
    fig.savefig(path, **SAVE_KW)
    plt.close(fig)


def reserve(results, p, horizon, path):
    fig, ax = plt.subplots(figsize=(8, 4.5))
    _settle_marks(ax, p, horizon)
    _band(ax, results, "reserve_remaining", 1.0)
    ax.yaxis.set_major_formatter(comma)
    ax.set_ylabel("reserve remaining (GOOD, unminted)")
    ax.set_title("Reward reserve remaining (of 400,000,000) — policy B", loc="left")
    ax.legend(ncol=2, fontsize=8, loc="lower left")
    fig.tight_layout()
    fig.savefig(path, **SAVE_KW)
    plt.close(fig)


def streak(results, p, horizon, path):
    fig, ax = plt.subplots(figsize=(8, 4))
    styles = {"optimistic": "-", "base": "--", "pessimistic": "-"}
    for name in SPEC_NAMES:
        d = results[name]["B"]["mean_daily"]["streak"]
        ax.step(np.arange(d.size), d, where="post", color=COLORS[name], lw=2, ls=styles[name],
                label=name + (" (identical to optimistic)" if name == "base" else ""))
    ax.set_xlabel("day since genesis")
    ax.set_ylabel("current streak (epochs)")
    ax.set_xlim(0, horizon)
    ax.set_title("Community streak — deterministic mean path (exact weekly means)", loc="left")
    ax.legend(fontsize=8, loc="upper left")
    fig.tight_layout()
    fig.savefig(path, **SAVE_KW)
    plt.close(fig)


def policy_comparison(results, path):
    fig, ax = plt.subplots(figsize=(8, 4.8))
    groups = list(SPEC_NAMES)
    series = [("A", "minted A spec-literal"), ("B", "minted B streak-multiplier"),
              ("C", "minted C reserve-share"), ("burned", "burned (all policies)")]
    w = 0.2
    x = np.arange(len(groups))
    for i, (key, label) in enumerate(series):
        vals = []
        for g in groups:
            pol = "B" if key == "burned" else key
            mc = results[g][pol]["mc"]
            vals.append(np.mean([s["burned" if key == "burned" else "rewards_minted"] for s in mc]))
        vals = np.array(vals)
        bars = ax.bar(x + (i - 1.5) * w, np.maximum(vals, 1), w * 0.9, color=POLICY_COLORS[key],
                      label=label)
        for b, v in zip(bars, vals):
            ax.text(b.get_x() + b.get_width() / 2, max(v, 1) * 1.15, f"{v:,.0f}", ha="center",
                    va="bottom", fontsize=7, color=INK, rotation=90)
    ax.set_yscale("log")
    ax.set_ylim(1, 3e7)
    ax.set_xticks(x, groups)
    ax.set_ylabel("GOOD over 60 days (MC mean, log scale)")
    ax.set_title("Cumulative rewards minted vs treasury burned, by policy", loc="left")
    ax.legend(fontsize=8, loc="upper left", ncol=2)
    fig.tight_layout()
    fig.savefig(path, **SAVE_KW)
    plt.close(fig)


def make_all(results, p, horizon, outdir):
    supply(results, p, horizon, outdir / "1_supply.png")
    treasury(results, p, horizon, outdir / "2_treasury.png")
    reserve(results, p, horizon, outdir / "3_reserve.png")
    streak(results, p, horizon, outdir / "4_streak.png")
    policy_comparison(results, outdir / "5_policy_comparison.png")
