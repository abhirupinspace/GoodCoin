"use client";
import { HearthArt } from "@/components/art";
import { HearthNumbers } from "@/components/hearth/HearthNumbers";
import { Notice, Stat, Term } from "@/components/ui";
import { BarChart, StepChart, type Point } from "@/components/app/charts";
import { Card, ContractLabel, Loading, PageHeader, Pill, QueryError } from "@/components/app/shell";
import { useAllFires } from "@/components/app/data";
import { compact, floorFmt, goodFmt, nearFmt, units } from "@/lib/format";
import { allowance as allowanceOf, fee as feeOf } from "@/lib/protocol";
import { useConfig, useHearth, useInvariants, useStats, useSupply } from "@/lib/useQueries";
import type { Config, FireView, SupplyView } from "@/types/contract";

/** Genesis max supply (contract/src/types.rs MAX_SUPPLY; SPEC §2). */
const GENESIS_MAX = 1_000_000_000n * 10n ** 24n;
const toNum = (v: bigint) => Number(v / 10n ** 18n) / 1e6; // plotting only

function SupplyPanel() {
  const { data: s, error } = useSupply();
  if (error) return <QueryError what="Supply" error={error} />;
  if (!s) return <Loading rows={3} />;
  const rows: [string, string, string][] = [
    ["Max supply", s.max_supply, "Starts at 1,000,000,000 and only ever shrinks: smothered fires and close() remove GOOD that never existed."],
    ["Total minted", s.total_minted, "GOOD claimed into wallets so far."],
    ["Earmarked", s.earmarked, "GOOD set aside for givers of caught fires who haven't claimed yet."],
    ["Burned", s.total_burned, "Redeemed or kindled GOOD. Burns never free headroom."],
    ["Circulating", s.circulating, "Minted minus burned."],
    ["Seed", s.seed, "Locked counter from the 1 NEAR genesis Hearth. Nobody owns it; it can't be redeemed."],
    ["Headroom", s.headroom, "Max supply − minted − earmarked. Each fire may create at most 0.25% of it."],
  ];
  return (
    <dl className="divide-y divide-line">
      {rows.map(([k, v, d]) => (
        <div key={k} className="grid gap-1 py-2.5 sm:grid-cols-[10rem_1fr_auto] sm:items-baseline sm:gap-4">
          <dt className="eyebrow text-ink/70">{k}</dt>
          <dd className="text-sm text-ink/70 sm:order-3 sm:max-w-sm sm:text-right">{d}</dd>
          <dd className="display num text-2xl sm:order-2">{units(v, 0)}</dd>
        </div>
      ))}
    </dl>
  );
}

function Invariants() {
  const { data, error } = useInvariants();
  if (error) return <QueryError what="Invariants" error={error} />;
  if (!data) return <Loading rows={2} />;
  const list: [keyof typeof data, string][] = [
    ["within_cap", "Minted + earmarked never exceed max supply"],
    ["supply_equation", "Backed GOOD = supply + earmarked + seed"],
    ["floor_never_decreased", "The floor has never gone down"],
    ["solvent", "The contract holds every NEAR it owes"],
  ];
  return (
    <ul className="space-y-2">
      {list.map(([k, label]) => (
        <li key={k} className="flex items-center justify-between gap-3 border-b border-line pb-2">
          <span className="text-sm">{label}</span>
          {data[k] ? <Pill tone="forest">Holds ✓</Pill> : <Pill tone="red">Broken ✗</Pill>}
        </li>
      ))}
    </ul>
  );
}

interface Derived { week: string; fire: FireView; maxSupply: bigint; allowance: bigint; fee: bigint }

/**
 * Replays settlement from genesis using list_fires only (fire.rs settle_one):
 * A_n = ⌊α·headroom⌋ pinned at the previous settle (A_0 = ⌊α·MAX⌋); a catch earmarks M (headroom −= M);
 * a smother destroys A_n (max_supply −= A_n). close() is invisible here but leaves headroom unchanged,
 * so headroom stays exact and the max-supply gap equals GOOD cancelled by close().
 */
function derive(fires: FireView[], nextToSettle: number, config: Config) {
  const alpha = BigInt(config.allowance_bps);
  let max = GENESIS_MAX;
  let headroom = GENESIS_MAX;
  let a = allowanceOf(GENESIS_MAX, alpha);
  let mismatch = false;
  const out: Derived[] = [];
  for (const f of fires) {
    if (Number(f.week) >= nextToSettle) break;
    const recorded = BigInt(f.allowance);
    if (recorded !== 0n && recorded !== a) mismatch = true; // weeks without a record report 0
    let fee = 0n;
    if (f.outcome === "Caught") {
      headroom -= BigInt(f.minted);
      fee = feeOf(BigInt(f.total), BigInt(config.fee_bps));
    } else {
      max -= a;
      headroom -= a;
    }
    out.push({ week: f.week, fire: f, maxSupply: max, allowance: a, fee });
    a = allowanceOf(headroom, alpha);
  }
  return { rows: out, headroom, max, mismatch };
}

function History() {
  const fires = useAllFires();
  const stats = useStats();
  const config = useConfig();
  const supply = useSupply();
  const err = fires.error ?? stats.error ?? config.error ?? supply.error;
  if (err) return <QueryError what="Fire history" error={err} />;
  if (!fires.data || !stats.data || !config.data || !supply.data) return <Loading rows={5} />;
  const { rows, headroom, max, mismatch } = derive(fires.data, Number(stats.data.next_to_settle), config.data);
  if (rows.length === 0) return <Notice tone="empty" title="No settled fires yet">Charts appear once the first fire settles.</Notice>;
  return <Charts rows={rows} headroom={headroom} max={max} mismatch={mismatch} supply={supply.data} config={config.data} />;
}

const SHOWN = 60;

function Charts({ rows: all, headroom, max, mismatch, supply, config }: { rows: Derived[]; headroom: bigint; max: bigint; mismatch: boolean; supply: SupplyView; config: Config }) {
  const rows = all.slice(-SHOWN);
  const closed = max - BigInt(supply.max_supply);
  const headroomOk = headroom === BigInt(supply.headroom);
  const supplyPts: Point[] = [
    ...(all.length <= SHOWN ? [{ x: "start", y: toNum(GENESIS_MAX), label: units(GENESIS_MAX, 0) }] : []),
    ...rows.map((r) => ({ x: `№${r.week}`, y: toNum(r.maxSupply), tone: r.fire.outcome === "Smothered" ? ("red" as const) : undefined, label: `${units(r.maxSupply, 0)}${r.fire.outcome === "Smothered" ? ` (−${units(r.allowance, 0)} smothered)` : ""}` })),
  ];
  const caught = all.filter((r) => r.fire.outcome === "Caught");
  const totalFees = caught.reduce((a, r) => a + r.fee, 0n);
  const inflow: Point[] = rows.map((r) => ({ x: `№${r.week}`, y: toNum(r.fee), tone: r.fire.outcome === "Caught" ? "ember" : "ink", label: r.fire.outcome === "Caught" ? nearFmt(r.fee, 4) : "smothered: 0" }));
  const givers: Point[] = rows.map((r) => ({ x: `№${r.week}`, y: r.fire.givers, tone: r.fire.outcome === "Caught" ? "forest" : "red", label: `${r.fire.givers} of ${r.fire.goal}${r.fire.kindled ? ` (${r.fire.kindled} kindled)` : ""}` }));
  const minMax = rows.reduce((m, r) => (r.maxSupply < m ? r.maxSupply : m), GENESIS_MAX);
  const maxMax = all.length <= SHOWN ? GENESIS_MAX : rows.reduce((m, r) => (r.maxSupply > m ? r.maxSupply : m), 0n);
  return (
    <div className="space-y-10">
      {all.length > SHOWN && <p className="text-sm text-ink/70">Charts show the latest {SHOWN} of {all.length} settled fires; totals and checks cover all of them.</p>}
      <div>
        <h3 className="display text-3xl">Max supply after each fire</h3>
        <p className="mb-3 text-sm text-ink/70">Every smothered fire permanently destroys that week&apos;s allowance ({config.allowance_bps / 100}% of headroom). Red marks are smothers. The axis is zoomed to the data&apos;s range.</p>
        <StepChart title="Max supply after each fire" summary={`${all.filter((r) => r.fire.outcome === "Smothered").length} smothers over ${all.length} settled fires; max supply now ${compact(BigInt(supply.max_supply))} GOOD.`} points={supplyPts} xHead="After fire" yHead="Max supply (GOOD)" yMaxLabel={compact(maxMax)} yMinLabel={compact(minMax)} />
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Pill tone={headroomOk ? "forest" : "red"}>{headroomOk ? "Derived headroom matches get_supply ✓" : "Derived headroom differs from get_supply"}</Pill>
          {closed > 0n && <Pill tone="ink">{goodFmt(closed, 0)} also removed by close()</Pill>}
          {mismatch && <Pill tone="red">A recorded allowance differs from the replay</Pill>}
        </div>
      </div>
      <div>
        <h3 className="display text-3xl">Hearth inflow per fire</h3>
        <p className="mb-3 text-sm text-ink/70">A caught fire sends ⌊total × {config.fee_bps / 100}%⌋ to the Hearth. Smothered fires send nothing. Total inflow from fees: <strong className="num">{nearFmt(totalFees, 3)}</strong> (before redemptions).</p>
        <BarChart title="Hearth inflow per fire" summary={`${caught.length} caught fires fed the Hearth.`} points={inflow} xHead="Fire" yHead="NEAR to the Hearth" />
      </div>
      <div>
        <h3 className="display text-3xl">Givers per fire</h3>
        <p className="mb-3 text-sm text-ink/70">Green caught, red smothered.</p>
        <BarChart title="Givers per fire" summary="Distinct givers in each settled fire." points={givers} xHead="Fire" yHead="Givers of goal" />
      </div>
      <ContractLabel>Replayed from list_fires + get_config; checked against get_supply</ContractLabel>
    </div>
  );
}

export function HearthPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Public · no wallet needed"
        title="The Hearth"
        intro={<>The NEAR that backs every GOOD. It grows only through fees of fires that catch, and its <Term def="Hearth ÷ backed GOOD, in NEAR. Redemption pays exactly this, rounded down, so it never lowers the floor.">floor</Term> has never gone down.</>}
        aside={<HearthArt className="hidden h-28 w-40 md:block" />}
      />
      <div className="space-y-8">
        <section className="frame-ember paper-dark p-5 sm:p-8" aria-label="Hearth numbers">
          <HearthNumbers light />
        </section>
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <Card eyebrow="get_supply" title="Supply"><SupplyPanel /></Card>
          <div className="space-y-8">
            <Card eyebrow="check_invariants" title="Invariants">
              <Invariants />
              <p className="mt-3 text-xs text-ink/60">Evaluated by the contract on every read. They are also asserted after every state change.</p>
            </Card>
            <Card eyebrow="Floor history" title="Floor over time">
              <Notice tone="empty" title="Floor history requires the event indexer">
                The floor at each catch is in the <code>fire_caught</code> event (floor_h, floor_b), which needs an event indexer that doesn&apos;t exist yet. Contract state only holds today&apos;s floor and its high-water mark, so no line is drawn rather than an invented one.
              </Notice>
              <HighWater />
            </Card>
          </div>
        </div>
        <Card eyebrow="Derived exactly from contract state" title="History"><History /></Card>
      </div>
    </div>
  );
}

function HighWater() {
  const { data: h } = useHearth();
  if (!h || BigInt(h.high_water_b) === 0n) return null;
  const hw = (BigInt(h.high_water_h) * 10n ** 24n) / BigInt(h.high_water_b);
  return (
    <div className="mt-4 grid grid-cols-2 gap-4">
      <Stat label="Floor now" value={floorFmt(h.floor_yocto_per_good)} hint="NEAR per GOOD" />
      <Stat label="High-water mark" value={floorFmt(hw.toString())} hint="H* ÷ B*, stored by the contract" />
    </div>
  );
}
