"use client";
// Live panels for /tokenomics. Every figure comes from a contract view; derived figures say what they are derived from.
import { useQuery } from "@tanstack/react-query";
import { Notice, Skeleton, Stamp, Stat, Term } from "@/components/ui";
import { compact, floorFmt, nearFmt, units } from "@/lib/format";
import { kindleCost } from "@/lib/protocol";
import { view } from "@/lib/rpc";
import { useConfig, useCurrentFire, useHearth, useInvariants, useStats, useSupply } from "@/lib/useQueries";
import type { FireView } from "@/types/contract";
import { hearthFee, useAllFires } from "./useAllFires";

/** Genesis cap from SPEC §2 (not exposed by a view). */
export const GENESIS_MAX = 1_000_000_000n * 10n ** 24n;

interface FtMetadata { spec: string; name: string; symbol: string; decimals: number }

export function TokenFacts() {
  const meta = useQuery({ queryKey: ["ft_metadata"], queryFn: () => view<FtMetadata>("ft_metadata"), staleTime: Infinity });
  if (meta.error) return <Notice tone="error" title="Token metadata unavailable">{String(meta.error)}</Notice>;
  if (!meta.data) return <Skeleton className="h-40 w-full" />;
  const m = meta.data;
  return (
    <dl className="grid grid-cols-2 gap-6">
      <Stat label="Name" value={m.name} />
      <Stat label="Symbol" value={m.symbol} />
      <Stat label="Standard" value={`NEP-141`} hint={`ft_metadata spec: ${m.spec}`} />
      <Stat label="Decimals" value={m.decimals} />
    </dl>
  );
}

export function SupplyNumbers() {
  const s = useSupply();
  if (s.error) return <Notice tone="error" title="Supply unavailable">{String(s.error)}</Notice>;
  if (!s.data) return <Skeleton className="h-40 w-full" />;
  const d = s.data;
  return (
    <div>
      <p className="eyebrow text-ink/60">Maximum supply, live</p>
      <p className="display num mt-1 break-all text-5xl sm:text-6xl">{units(d.max_supply, 0)}</p>
      <p className="mt-1 text-sm text-ink/60">GOOD · started at 1,000,000,000 · it can only decrease</p>
      <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3">
        <Stat label="Circulating" value={compact(d.circulating)} hint="minted − burned" />
        <Stat label={<Term def="GOOD set aside for givers of caught fires who haven't claimed yet. It already counts as backed.">Earmarked</Term>} value={compact(d.earmarked)} />
        <Stat label={<Term def="An internal counter created with the 1 NEAR seed at launch. Not a balance; nobody owns it; it can't be moved or redeemed.">Locked seed</Term>} value={compact(d.seed)} />
        <Stat label="Ever minted" value={compact(d.total_minted)} />
        <Stat label="Burned" value={compact(d.total_burned)} hint="kindles and redemptions" />
        <Stat label="Headroom" value={compact(d.headroom)} hint="max − minted − earmarked" />
      </div>
    </div>
  );
}

/** Supply destroyed so far, itemised as far as the views allow. */
export function SupplyReductions() {
  const s = useSupply();
  const all = useAllFires();
  if (s.error || all.error) return <Notice tone="error" title="Supply history unavailable">{String(s.error ?? all.error)}</Notice>;
  if (!s.data || !all.data) return <Skeleton className="h-40 w-full" />;
  const total = GENESIS_MAX - BigInt(s.data.max_supply);
  const smothered = all.data.filter((f) => f.outcome === "Smothered");
  const recorded = smothered.reduce((a, f) => a + BigInt(f.allowance), 0n);
  const withGivers = smothered.filter((f) => f.givers > 0).length;
  const rest = total - recorded;
  return (
    <div className="frame bg-paper p-5 font-sans sm:p-6">
      <p className="eyebrow text-burnt">Supply reductions, to date</p>
      <dl className="mt-3 divide-y divide-ink/20 border-y-2 border-ink text-sm">
        <Row k="Total removed from the cap" v={`${units(total, 0)} GOOD`} note="1,000,000,000 (genesis, SPEC §2) − live max_supply" strong />
        <Row k={`Allowances of smothered fires with gifts (${withGivers})`} v={`${units(recorded, 0)} GOOD`} note="Σ allowance over list_fires where outcome = Smothered" />
        <Row k="Idle weeks and closed weeks" v={`${units(rest < 0n ? 0n : rest, 0)} GOOD`} note="the remainder: weeks nobody gave in keep no record, and close() cancellations aren't itemised by a view" />
        <Row k="Smothered fires (all, incl. idle)" v={String(smothered.length)} note="list_fires" />
      </dl>
    </div>
  );
}

function Row({ k, v, note, strong = false }: { k: string; v: string; note: string; strong?: boolean }) {
  return (
    <div className="grid gap-1 py-2.5 sm:grid-cols-[1fr_auto] sm:gap-6">
      <dt>{k}<span className="block text-xs text-ink/50">{note}</span></dt>
      <dd className={`num ${strong ? "display text-2xl" : "font-semibold"} sm:text-right`}>{v}</dd>
    </div>
  );
}

const INV_LABELS: [keyof import("@/types/contract").Invariants, string][] = [
  ["floor_never_decreased", "The floor has never decreased"],
  ["within_cap", "Minted + earmarked ≤ max supply"],
  ["supply_equation", "Token supply = minted − burned"],
  ["solvent", "Contract holds everything it owes"],
];

/** The live protocol statistics panel. */
export function ProtocolStats() {
  const stats = useStats();
  const supply = useSupply();
  const hearth = useHearth();
  const inv = useInvariants();
  const err = stats.error ?? supply.error ?? hearth.error;
  if (err) return <Notice tone="error" title="Live statistics unavailable">{String(err)}</Notice>;
  if (!stats.data || !supply.data || !hearth.data) return <Skeleton className="h-72 w-full" />;
  const st = stats.data, h = hearth.data;
  return (
    <div className="font-sans text-paper">
      <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
        <Stat light label="NEAR in the Hearth" value={nearFmt(h.hearth, 3)} />
        <Stat light label="Backed GOOD" value={compact(h.backed)} />
        <Stat light label="Backing floor" value={floorFmt(h.floor_yocto_per_good)} hint="NEAR per GOOD" />
        <Stat light label="Max supply" value={compact(supply.data.max_supply)} hint="GOOD" />
        <Stat light label="Current fire" value={`№${st.current_week}`} hint={st.label === "demo" ? "demo deployment" : st.label} />
        <Stat light label="Streak" value={st.streak} hint={`longest ${st.longest_streak}`} />
        <Stat light label="Open escrow" value={nearFmt(st.escrow_open, 2)} />
        <Stat light label="Refunds owed" value={nearFmt(st.refunds_owed, 2)} />
      </div>
      <div className="mt-8 border-t border-paper/20 pt-5">
        <p className="eyebrow text-mustard">check_invariants(), live</p>
        {inv.error ? <p className="mt-2 text-sm text-ember">Invariants unavailable: {String(inv.error)}</p> : !inv.data ? <Skeleton className="mt-2 h-10 w-full bg-paper/10" /> : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {INV_LABELS.map(([k, label]) => (
              <li key={k} className="flex items-center justify-between gap-3 border border-paper/20 p-3">
                <span className="text-sm">{label}</span>
                {inv.data[k] ? <Stamp tone="forest" className="bg-paper">Holds</Stamp> : <Stamp tone="red" className="bg-paper">Fails</Stamp>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Live kindle prices for the first few kindles of a fire. */
export function KindleTable() {
  const cfg = useConfig();
  const hq = useHearth();
  const fire = useCurrentFire();
  if (cfg.error || hq.error) return <Notice tone="error" title="Kindle prices unavailable">{String(cfg.error ?? hq.error)}</Notice>;
  if (!cfg.data || !hq.data) return <Skeleton className="h-48 w-full" />;
  const H = BigInt(hq.data.hearth), B = BigInt(hq.data.backed);
  const reach = fire.data ? Math.min(Math.max(1, Math.floor(fire.data.base_goal / 4)), 17) : null;
  return (
    <div className="frame bg-paper p-5 font-sans sm:p-6">
      <table className="w-full border-collapse text-sm">
        <caption className="eyebrow mb-3 text-left text-burnt">GOOD burned per kindle, at today&apos;s floor</caption>
        <thead><tr className="border-b-2 border-ink text-left"><th scope="col" className="py-2">Kindle in a fire</th><th scope="col" className="py-2 text-right">GOOD burned</th><th scope="col" className="py-2 text-right">≈ NEAR at floor</th></tr></thead>
        <tbody className="divide-y divide-ink/20">
          {[0, 1, 2, 3, 4].map((j) => {
            const cost = kindleCost(j, BigInt(cfg.data!.fee_bps), BigInt(cfg.data!.min_gift), B, H);
            return (
              <tr key={j}>
                <td className="py-2">{["1st", "2nd", "3rd", "4th", "5th"][j]}</td>
                <td className="num py-2 text-right font-semibold">{units(cost, 0)}</td>
                <td className="num py-2 text-right">{units((cost * H) / B, 4)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-ink/60">From get_hearth and get_config via the protocol&apos;s exact rounding (rounded up, in the Hearth&apos;s favour). {reach !== null && <>This week up to {reach} kindle{reach > 1 ? "s" : ""} can apply, and only if the fire is that close.</>}</p>
    </div>
  );
}

/* ---------------------------------------------------------------- print-style charts */

function BarChart({ title, source, rows, unit, color }: { title: string; source: string; rows: { label: string; value: bigint }[]; unit: string; color: string }) {
  const W = 640, Hh = 220, pad = { l: 8, r: 8, t: 16, b: 28 };
  const max = rows.reduce((a, r) => (r.value > a ? r.value : a), 0n);
  const bw = (W - pad.l - pad.r) / Math.max(rows.length, 1);
  const scale = (v: bigint) => (max === 0n ? 0 : Number((v * 10_000n) / max) / 10_000) * (Hh - pad.t - pad.b);
  const fmt = (v: bigint) => (unit === "NEAR" ? units(v, 3) : compact(v));
  const every = Math.ceil(rows.length / 12);
  return (
    <figure className="frame bg-paper p-5 font-sans sm:p-6">
      <figcaption>
        <p className="display text-3xl">{title}</p>
        <p className="mt-1 text-xs text-ink/60">Derived from {source}. Peak: {fmt(max)} {unit}.</p>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${Hh}`} className="mt-4 h-auto w-full" role="img" aria-label={`${title}: ${rows.map((r) => `${r.label} ${fmt(r.value)} ${unit}`).join(", ")}`}>
        <defs>
          <pattern id={`hatch-${color}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill={color} /><path d="M0 0 L0 6" stroke="#e8d9b9" strokeWidth="1.2" opacity="0.5" />
          </pattern>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <line key={g} x1={pad.l} x2={W - pad.r} y1={Hh - pad.b - g * (Hh - pad.t - pad.b)} y2={Hh - pad.b - g * (Hh - pad.t - pad.b)} stroke="#24221e" strokeOpacity="0.15" strokeDasharray="3 4" />
        ))}
        {rows.map((r, i) => {
          const h = scale(r.value);
          const x = pad.l + i * bw + bw * 0.15;
          return (
            <g key={r.label}>
              <rect x={x + 3} y={Hh - pad.b - h + 3} width={bw * 0.7} height={h} fill="#24221e" />
              <rect x={x} y={Hh - pad.b - h} width={bw * 0.7} height={h} fill={`url(#hatch-${color})`} stroke="#24221e" strokeWidth="1.5" />
              {i % every === 0 && <text x={x + bw * 0.35} y={Hh - 8} textAnchor="middle" fontSize="12" fill="#24221e" fontFamily="var(--font-archivo), sans-serif">{r.label}</text>}
            </g>
          );
        })}
        <line x1={pad.l} x2={W - pad.r} y1={Hh - pad.b} y2={Hh - pad.b} stroke="#24221e" strokeWidth="3" />
      </svg>
    </figure>
  );
}

export function FireCharts() {
  const all = useAllFires();
  const cfg = useConfig();
  if (all.error || cfg.error) return <Notice tone="error" title="Charts unavailable">{String(all.error ?? cfg.error)}</Notice>;
  if (!all.data || !cfg.data) return <div className="grid gap-8 lg:grid-cols-2"><Skeleton className="h-72 w-full" /><Skeleton className="h-72 w-full" /></div>;
  const caught: FireView[] = all.data.filter((f) => f.outcome === "Caught");
  if (!caught.length) return <Notice tone="empty" title="No fire has caught yet">The charts fill in as soon as the first fire catches.</Notice>;
  const shown = caught.slice(-40);
  const note = caught.length > shown.length ? ` (latest ${shown.length} of ${caught.length})` : "";
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <BarChart title={`Hearth fee per caught fire${note}`} source="list_fires: ⌊total × fee_bps ÷ 10,000⌋ for each caught fire (exact)" unit="NEAR" color="#d66a32"
        rows={shown.map((f) => ({ label: `№${f.week}`, value: hearthFee(f.total, cfg.data!.fee_bps) }))} />
      <BarChart title={`GOOD issued per caught fire${note}`} source="list_fires: the minted field of each caught fire" unit="GOOD" color="#46543d"
        rows={shown.map((f) => ({ label: `№${f.week}`, value: BigInt(f.minted) }))} />
    </div>
  );
}
