"use client";
// Interactive money-flow example. Exact protocol math (lib/protocol.ts) over the live Hearth, supply and
// this week's pinned allowance. It assumes equal gifts and no spark bounties (bounties move weight between
// givers but never change the totals).
import { useId, useMemo, useState } from "react";
import { Notice, Skeleton, Stamp } from "@/components/ui";
import { floorFmt, parseNear, units } from "@/lib/format";
import { allowance as allowanceOf, fee as feeOf, mintable, share as shareOf } from "@/lib/protocol";
import { useConfig, useCurrentFire, useHearth, useSupply } from "@/lib/useQueries";
import { trimUnits } from "./LiveFacts";

const ONE = 10n ** 24n;
const perGood = (H: bigint, B: bigint) => ((H * ONE) / B).toString();

export function MoneyFlow() {
  const cfg = useConfig();
  const hearth = useHearth();
  const supply = useSupply();
  const fire = useCurrentFire();
  const [giversIn, setGiversIn] = useState<string | null>(null);
  const [giftIn, setGiftIn] = useState<string | null>(null);
  const gid = useId();
  const fid = useId();

  const error = cfg.error ?? hearth.error ?? supply.error ?? fire.error;
  const ready = cfg.data && hearth.data && supply.data && fire.data;

  const defaults = ready ? { givers: String(fire.data!.goal), gift: trimUnits(cfg.data!.min_gift) } : null;
  const giversStr = giversIn ?? defaults?.givers ?? "";
  const giftStr = giftIn ?? defaults?.gift ?? "";
  const edited = (giversIn !== null && giversIn !== defaults?.givers) || (giftIn !== null && giftIn !== defaults?.gift);

  const result = useMemo(() => {
    if (!ready) return null;
    const c = cfg.data!, h = hearth.data!, s = supply.data!, f = fire.data!;
    const n = Number(giversStr);
    if (!Number.isInteger(n) || n < 1 || n > 5000) return { err: "Enter a whole number of givers between 1 and 5,000." } as const;
    const g = parseNear(giftStr);
    if (g === null) return { err: "Enter a gift in NEAR, e.g. 1 or 0.25." } as const;
    const gift = BigInt(g);
    const min = BigInt(c.min_gift);
    if (gift < min) return { err: `Each giver's total gift must reach the minimum gift of ${trimUnits(min)} NEAR.` } as const;
    if (gift > 1_000_000n * ONE) return { err: "Keep the gift under 1,000,000 NEAR for this example." } as const;

    const H = BigInt(h.hearth), B = BigInt(h.backed);
    const A = BigInt(f.allowance) > 0n ? BigInt(f.allowance) : allowanceOf(BigInt(s.headroom), BigInt(c.allowance_bps));
    const X = gift * BigInt(n);
    const fee = feeOf(X, BigInt(c.fee_bps));
    const pay = X - fee;
    const M = mintable(fee, B, H, BigInt(c.markup_bps), A);
    const each = shareOf(M, gift, X);
    const H2 = H + fee, B2 = B + M;
    const eachNear = (each * H2) / B2; // what one share redeems for right after the catch
    const pct = Number((eachNear * 1_000_000n) / gift) / 10_000;
    return {
      err: null, n, gift, X, fee, pay, M, each, A, eachNear, pct,
      catches: n >= f.goal, goal: f.goal, record: BigInt(c.record_fee),
      oldFloor: perGood(H, B), newFloor: perGood(H2, B2), capped: M === A,
      feePct: c.fee_bps / 100, markup: 1 + c.markup_bps / 10_000,
    } as const;
  }, [ready, cfg.data, hearth.data, supply.data, fire.data, giversStr, giftStr]);

  if (error) return <Notice tone="error" title="The example can't load live values">{String(error)}</Notice>;
  if (!ready || !result) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="frame bg-paper p-5 font-sans text-ink sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-burnt">Work it out yourself</p>
          <p className="display mt-1 text-4xl">A fire, on paper</p>
        </div>
        {edited ? <Stamp tone="ink">Illustrative example</Stamp> : <Stamp tone="forest">Live defaults</Stamp>}
      </div>
      <p className="mt-2 text-sm text-ink/70">
        {edited
          ? "Illustrative example with your inputs, priced against the Hearth as it stands right now. Not a forecast."
          : "Starts from this week's live goal, the minimum gift and the Hearth as it stands right now. Change the inputs to try your own."}
      </p>

      <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor={gid} className="block">
          <span className="eyebrow text-ink/70">Number of givers</span>
          <input id={gid} inputMode="numeric" value={giversStr} onChange={(e) => setGiversIn(e.target.value)}
            className="num mt-1 h-12 w-full border-2 border-line bg-paper px-3 text-xl focus:bg-white/40" />
        </label>
        <label htmlFor={fid} className="block">
          <span className="eyebrow text-ink/70">Gift per giver (NEAR)</span>
          <input id={fid} inputMode="decimal" value={giftStr} onChange={(e) => setGiftIn(e.target.value)}
            className="num mt-1 h-12 w-full border-2 border-line bg-paper px-3 text-xl focus:bg-white/40" />
        </label>
      </form>
      {edited && (
        <button type="button" className="eyebrow mt-3 underline underline-offset-4 hover:text-burnt" onClick={() => { setGiversIn(null); setGiftIn(null); }}>
          Reset to live values
        </button>
      )}

      {result.err ? (
        <p role="alert" className="mt-5 border-2 border-red p-3 text-sm text-red">{result.err}</p>
      ) : (
        <div aria-live="polite">
          <p className="mt-6 text-sm">
            {result.catches
              ? <>With <b>{result.n}</b> givers against this week&apos;s goal of <b>{result.goal}</b>, the fire <b className="text-forest">catches</b>.</>
              : <>With <b>{result.n}</b> givers against this week&apos;s goal of <b>{result.goal}</b>, the fire would be <b className="text-red">smothered</b>. The numbers below show what happens <i>if</i> it catches.</>}
          </p>

          {/* the split, drawn as a print bar */}
          <div className="mt-4" role="img" aria-label={`${result.feePct}% to the Hearth, ${100 - result.feePct}% to the cause`}>
            <div className="flex h-10 border-2 border-line">
              <div className="flex items-center bg-forest px-3 text-ink" style={{ width: `${100 - result.feePct}%` }}><span className="eyebrow">{100 - result.feePct}% to the cause</span></div>
              <div className="halftone-ember flex items-center justify-center bg-ember text-charcoal" style={{ width: `${result.feePct}%` }}><span className="eyebrow">{result.feePct}%</span></div>
            </div>
          </div>

          <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <Out label="All gifts" value={`${trimUnits(result.X, 4)} NEAR`} hint="Record fees are separate: each giver pays one on their first gift of the week." />
            <Out label="To the cause" value={`${trimUnits(result.pay, 4)} NEAR`} hint="Sent to the cause's DAO treasury by a permissionless payout." />
            <Out label="To the Hearth" value={`${trimUnits(result.fee, 4)} NEAR`} hint="Stays in the contract and backs every GOOD." />
            <Out label="GOOD issued" value={`${units(result.M, 0)} GOOD`} hint={result.capped ? "Capped by this week's allowance." : `Paid for at ${result.markup}× today's floor out of the Hearth's share.`} />
            <Out label="One giver's share" value={`${units(result.each, 0)} GOOD`} hint={`Redeemable for about ${trimUnits(result.eachNear, 4)} NEAR right after the catch, about ${result.pct.toFixed(1)}% of the gift.`} />
            <div>
              <dt className="eyebrow text-ink/60">Backing floor (NEAR per GOOD)</dt>
              <dd className="mt-1 font-sans">
                <span className="num block text-sm text-ink/60 line-through decoration-red/70">{floorFmt(result.oldFloor)} before</span>
                <span className="display num block text-3xl">{floorFmt(result.newFloor)} after</span>
              </dd>
              <p className="mt-1 text-xs text-ink/60">It rises because new GOOD is paid for above the floor.</p>
            </div>
          </dl>

          <div className="mt-6 border-t-2 border-dashed border-line pt-4 text-sm text-ink/75">
            <p><b>If it is smothered instead:</b> every giver can claim back {trimUnits(result.gift, 4)} NEAR (the {trimUnits(result.record, 4)} NEAR record fee is kept), and this week&apos;s allowance of {units(result.A, 0)} GOOD is destroyed: the maximum supply shrinks by that much, forever.</p>
            <p className="mt-2 text-xs text-ink/60">Assumes equal gifts, no spark bounties and no other gifts in the fire. A bounty only moves GOOD between two givers; the totals above don&apos;t change. Later fires and redemptions change the live Hearth, so a real fire settles against the Hearth at the moment it ends.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Out({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className="eyebrow text-ink/60">{label}</dt>
      <dd className="display num mt-1 text-3xl">{value}</dd>
      {hint && <p className="mt-1 text-xs text-ink/60">{hint}</p>}
    </div>
  );
}
