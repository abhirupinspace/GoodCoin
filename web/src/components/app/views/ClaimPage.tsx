"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { SettleBar } from "@/components/fire/SettleBar";
import { Button, Notice, OutcomeStamp } from "@/components/ui";
import { useTx } from "@/components/wallet/useTx";
import { Card, Loading, PageHeader, Pill, QueryError, RequireWallet } from "@/components/app/shell";
import { planClaims, useStorageMin, useStorageOf, type ClaimItem } from "@/components/app/data";
import { goodFmt, nearFmt } from "@/lib/format";
import { useConfig, useHistory, useStats } from "@/lib/useQueries";

const MAX_WEEKS = 52;

function Claimer({ accountId }: { accountId: string }) {
  const hist = useHistory(accountId);
  const stats = useStats();
  const config = useConfig();
  const storage = useStorageOf(accountId);
  const storageMin = useStorageMin();
  const { run, busy } = useTx();
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const [last, setLast] = useState<string | null>(null);

  const plan = useMemo(
    () => (hist.data && stats.data && config.data ? planClaims(hist.data.entries, stats.data, config.data) : null),
    [hist.data, stats.data, config.data],
  );
  const err = hist.error ?? stats.error ?? config.error ?? storage.error ?? storageMin.error;
  if (err) return <QueryError what="Your claims" error={err} />;
  if (!plan || storage.isLoading || !storageMin.data) return <Loading rows={4} />;
  const { items, awaiting } = plan;
  // default selection: the first 52 claimable weeks (oldest first)
  const ordered = [...items].sort((a, b) => Number(a.week) - Number(b.week));
  const sel = picked ?? new Set(ordered.slice(0, MAX_WEEKS).map((i) => i.week));
  const chosen = ordered.filter((i) => sel.has(i.week));
  const good = chosen.reduce((a, i) => a + (i.good ?? 0n), 0n);
  const refund = chosen.reduce((a, i) => a + (i.refund ?? 0n), 0n);
  const wantsGood = chosen.some((i) => i.good !== null && i.good > 0n);
  const needsStorage = wantsGood && storage.data === null;
  const deposit = needsStorage ? storageMin.data.min : "0";
  const tooMany = chosen.length > MAX_WEEKS;

  function toggle(w: string) {
    const next = new Set(sel);
    if (next.has(w)) next.delete(w); else next.add(w);
    setPicked(next);
  }

  async function submit() {
    if (chosen.length === 0 || tooMany) return;
    const hash = await run("claim", { weeks: chosen.map((i) => i.week) }, deposit, "Claim");
    if (hash) { setLast(hash); setPicked(null); }
  }

  if (items.length === 0)
    return (
      <div className="space-y-4">
        <Notice tone="empty" title="Nothing to claim">
          Every fire you gave to is either claimed, still burning, or waiting to settle. <Link href="/app/history" className="underline">See your history →</Link>
        </Notice>
        {awaiting.length > 0 && <Awaiting n={awaiting.length} />}
        {last && <p className="text-sm text-forest">Your last claim is final on NEAR.</p>}
      </div>
    );

  return (
    <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
      <Card eyebrow={`${items.length} claimable`} title="Choose fires">
        <fieldset>
          <legend className="sr-only">Fires to claim</legend>
          <div className="mb-3 flex flex-wrap gap-2 text-sm">
            <button type="button" className="eyebrow border-2 border-ink px-3 py-1 hover:bg-parchment" onClick={() => setPicked(new Set(ordered.slice(0, MAX_WEEKS).map((i) => i.week)))}>Select {items.length > MAX_WEEKS ? `first ${MAX_WEEKS}` : "all"}</button>
            <button type="button" className="eyebrow border-2 border-ink px-3 py-1 hover:bg-parchment" onClick={() => setPicked(new Set())}>Clear</button>
          </div>
          <ul className="divide-y divide-ink/15">
            {ordered.map((i) => <ItemRow key={i.week} item={i} checked={sel.has(i.week)} onToggle={() => toggle(i.week)} />)}
          </ul>
        </fieldset>
        {awaiting.length > 0 && <div className="mt-4"><Awaiting n={awaiting.length} /></div>}
      </Card>

      <Card eyebrow="Before you sign" title="What happens" className="h-fit lg:sticky lg:top-24">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-3"><dt>GOOD minted to you</dt><dd className="num font-semibold">{goodFmt(good, 2)}</dd></div>
          <div className="flex justify-between gap-3"><dt>NEAR refunded to you</dt><dd className="num font-semibold">{nearFmt(refund, 4)}{chosen.some((i) => i.maybeCarry) ? " + carry" : ""}</dd></div>
          <div className="flex justify-between gap-3 border-t-2 border-ink pt-3"><dt>Attached deposit</dt><dd className="num font-semibold">{deposit === "0" ? "none" : nearFmt(deposit, 5)}</dd></div>
        </dl>
        <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm text-ink/80">
          <li>One transaction claims up to {MAX_WEEKS} fires. Each fire&apos;s GOOD and refund can be claimed once.</li>
          {needsStorage
            ? <li>Your account isn&apos;t registered for GOOD yet, so the claim attaches the one-time storage deposit. Anything not needed is refunded in the same transaction.</li>
            : wantsGood ? <li>Your account is already registered for GOOD; no deposit is needed.</li> : null}
          <li>Claiming doesn&apos;t move the floor: claimed GOOD was already counted as backed.</li>
          {chosen.some((i) => i.maybeClosed) && <li className="text-red">Some selected fires ended over 52 weeks ago. If anyone has called close() on them, their GOOD can no longer be claimed and that week contributes nothing.</li>}
          {chosen.some((i) => i.maybeCarry) && <li>Carry refunds (after every cause died) are computed by the contract at claim time.</li>}
        </ul>
        {tooMany && <p className="mt-3 text-sm font-semibold text-red" role="alert">Select at most {MAX_WEEKS} fires per claim.</p>}
        <Button size="lg" className="mt-5 w-full" disabled={busy || chosen.length === 0 || tooMany} onClick={submit}>
          {busy ? "Waiting for finality…" : chosen.length === 0 ? "Select a fire" : `Claim ${chosen.length} fire${chosen.length > 1 ? "s" : ""}`}
        </Button>
        {last && <p className="mt-3 text-sm text-forest">Last claim confirmed final. The list above is re-read from the contract.</p>}
      </Card>
    </div>
  );
}

function ItemRow({ item, checked, onToggle }: { item: ClaimItem; checked: boolean; onToggle: () => void }) {
  const id = `wk-${item.week}`;
  return (
    <li className="py-3">
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
        <input id={id} type="checkbox" checked={checked} onChange={onToggle} className="mt-1.5 size-5 accent-[#d66a32]" />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="display text-3xl text-burnt">№{item.week}</span>
            <span className="text-sm">{item.entry.fire.cause_name}</span>
            <span className="ml-auto scale-75 origin-right"><OutcomeStamp outcome={item.entry.fire.outcome} /></span>
          </span>
          <span className="mt-1 flex flex-wrap gap-2 text-sm">
            {item.good !== null && <Pill tone="forest">{goodFmt(item.good, 2)}</Pill>}
            {item.refund !== null && <Pill tone="ember">{nearFmt(item.refund, 4)} refund</Pill>}
            {item.maybeCarry && <Pill tone="ink">Possible carry refund</Pill>}
            {item.maybeClosed && <Pill tone="red">May be closed</Pill>}
          </span>
        </span>
      </label>
    </li>
  );
}

function Awaiting({ n }: { n: number }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink/70">{n} fire{n > 1 ? "s" : ""} you gave to ha{n > 1 ? "ve" : "s"} ended but {n > 1 ? "aren't" : "isn't"} settled, so {n > 1 ? "their" : "its"} outcome isn&apos;t final. Settle, then claim.</p>
      <SettleBar />
    </div>
  );
}

export function ClaimPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Pull, don't wait" title="Claim" intro="GOOD from fires that caught and NEAR from fires that were smothered wait in the contract until you claim them. Amounts below are exact, computed from contract state." />
      <RequireWallet what="Claiming sends GOOD and refunds to your account.">{(a) => <Claimer accountId={a} />}</RequireWallet>
    </div>
  );
}
