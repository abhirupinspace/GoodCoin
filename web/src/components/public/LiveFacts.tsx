"use client";
// Small inline live values for prose: every protocol number on the public pages is read from a view.
import { Skeleton } from "@/components/ui";
import { units } from "@/lib/format";
import { kindleCost } from "@/lib/protocol";
import { useConfig, useCurrentFire, useHearth, useSupply } from "@/lib/useQueries";

const Dash = () => <span title="Unavailable right now">—</span>;
const Wait = () => <Skeleton className="h-[0.9em] w-14 align-middle" />;

/** Trims trailing zeros of a 24-decimal amount: 0.100 → 0.1. */
export function trimUnits(raw: string | bigint, digits = 6): string {
  const s = units(raw, digits);
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}

export function MinGift() {
  const { data, error } = useConfig();
  if (error) return <Dash />;
  if (!data) return <Wait />;
  return <span className="num">{trimUnits(data.min_gift)} NEAR</span>;
}

export function RecordFee() {
  const { data, error } = useConfig();
  if (error) return <Dash />;
  if (!data) return <Wait />;
  return <span className="num">{trimUnits(data.record_fee)} NEAR</span>;
}

/** The most weight a real friend can pass: γ · 1.5 · min_gift. */
export function SparkCap() {
  const { data, error } = useConfig();
  if (error) return <Dash />;
  if (!data) return <Wait />;
  const cap = (BigInt(data.bounty_bps) * ((BigInt(data.min_gift) * 3n) / 2n)) / 10_000n;
  return <span className="num">{trimUnits(cap)} NEAR</span>;
}

export function WeekLength() {
  const { data, error } = useConfig();
  if (error) return <Dash />;
  if (!data) return <Wait />;
  const s = Number(BigInt(data.week_ns) / 1_000_000_000n);
  const label = s % 86400 === 0 ? `${s / 86400} days` : s % 3600 === 0 ? `${s / 3600} hours` : `${Math.round(s / 60)} minutes`;
  return <span className="num">{label}</span>;
}

export function GoalNow() {
  const { data, error } = useCurrentFire();
  if (error) return <Dash />;
  if (!data) return <Wait />;
  return <span className="num">{data.goal} givers</span>;
}

/** max(1, ⌊⌈Ĝ⌉/4⌋) for the current fire. */
export function KindleReach() {
  const { data, error } = useCurrentFire();
  if (error) return <Dash />;
  if (!data) return <Wait />;
  const n = Math.max(1, Math.floor(data.base_goal / 4));
  return <span className="num">{n} giver{n > 1 ? "s" : ""}</span>;
}

/** GOOD burned by the j-th kindle at today's floor (exact protocol rounding). */
export function KindleCostNow({ j = 0 }: { j?: number }) {
  const cfg = useConfig();
  const h = useHearth();
  if (cfg.error || h.error) return <Dash />;
  if (!cfg.data || !h.data) return <Wait />;
  const cost = kindleCost(j, BigInt(cfg.data.fee_bps), BigInt(cfg.data.min_gift), BigInt(h.data.backed), BigInt(h.data.hearth));
  return <span className="num">{units(cost, 0)} GOOD</span>;
}

export function MaxSupplyNow() {
  const { data, error } = useSupply();
  if (error) return <Dash />;
  if (!data) return <Wait />;
  return <span className="num">{units(data.max_supply, 0)} GOOD</span>;
}
