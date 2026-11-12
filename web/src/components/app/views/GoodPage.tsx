"use client";
import Link from "next/link";
import { HearthArt } from "@/components/art";
import { Button, Notice, Stat, Term } from "@/components/ui";
import { Card, ContractLabel, IndexedLabel, Loading, PageHeader, Pill, QueryError, RequireWallet } from "@/components/app/shell";
import { bpsChange, exactShare, planClaims } from "@/components/app/data";
import { txUrl } from "@/lib/config";
import { dateFromNs, floorFmt, goodFmt, nearFmt } from "@/lib/format";
import { redeem } from "@/lib/protocol";
import { useAccount, useConfig, useHearth, useHistory, useStats, useTxns } from "@/lib/useQueries";

function Holdings({ accountId }: { accountId: string }) {
  const acct = useAccount(accountId);
  const hearth = useHearth();
  if (acct.error) return <QueryError what="Your account" error={acct.error} />;
  if (hearth.error) return <QueryError what="The Hearth" error={hearth.error} />;
  if (!acct.data || !hearth.data) return <Loading rows={3} />;
  const bal = BigInt(acct.data.good_balance);
  const near = redeem(bal, BigInt(hearth.data.hearth), BigInt(hearth.data.backed));
  const gain = acct.data.floor_gain_bps;
  return (
    <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
      <Stat label="GOOD balance" value={goodFmt(bal, 2).replace(" GOOD", "")} hint="GOOD in your wallet" />
      <Stat label={<Term def="Hearth ÷ backed GOOD: the NEAR anyone can redeem per GOOD at any time. It never decreases. Denominated in NEAR, not a market price.">Backing floor</Term>} value={floorFmt(hearth.data.floor_yocto_per_good)} hint="NEAR per GOOD" />
      <Stat label="Redeemable now" value={nearFmt(near, 4)} hint="⌊balance × H ÷ B⌋, exactly what redeem pays today" />
      <Stat
        label="Floor since your first gift"
        value={gain === null ? "—" : bpsChange(gain)}
        hint={gain === null || !acct.data.profile ? "You haven't given yet." : `Measured in NEAR since fire №${acct.data.profile.first_week}.`}
      />
    </div>
  );
}

function Unclaimed({ accountId }: { accountId: string }) {
  const hist = useHistory(accountId);
  const stats = useStats();
  const config = useConfig();
  if (hist.error) return <QueryError what="Your fires" error={hist.error} />;
  if (!hist.data || !stats.data || !config.data) return <Loading rows={2} />;
  const { items, awaiting } = planClaims(hist.data.entries, stats.data, config.data);
  const good = items.reduce((a, i) => a + (i.good ?? 0n), 0n);
  const refund = items.reduce((a, i) => a + (i.refund ?? 0n), 0n);
  const carry = items.some((i) => i.maybeCarry);
  if (items.length === 0 && awaiting.length === 0)
    return <Notice tone="empty" title="Nothing to claim">When a fire you gave to catches, your GOOD waits here. If one is smothered, your refund does.</Notice>;
  return (
    <div className="space-y-4">
      <div className="grid gap-6 sm:grid-cols-2">
        <Stat label="Unclaimed GOOD" value={goodFmt(good, 2)} hint={`${items.filter((i) => i.good !== null).length} caught fire(s); exact ⌊M·w/Σw⌋`} />
        <Stat label="Unclaimed refunds" value={nearFmt(refund, 3)} hint={`${items.filter((i) => i.refund !== null).length} smothered fire(s); record fees are not refunded`} />
      </div>
      {carry && <p className="text-sm">Some caught fires may also hold an extinguished-carry refund. Its amount is set by the contract at claim time.</p>}
      {awaiting.length > 0 && <p className="text-sm text-ink/70">{awaiting.length} fire(s) you gave to have ended but aren&apos;t settled yet. Settle them on The Fire, then claim.</p>}
      {items.length > 0 && <Button href="/app/claim">Claim</Button>}
    </div>
  );
}

function Rewards({ accountId }: { accountId: string }) {
  const hist = useHistory(accountId);
  if (hist.error) return <QueryError what="Your fires" error={hist.error} />;
  if (!hist.data) return <Loading rows={3} />;
  const caught = hist.data.entries.filter((e) => e.fire.outcome === "Caught");
  if (caught.length === 0) return <Notice tone="empty" title="No GOOD earned yet">GOOD is created only when a fire you gave to catches.</Notice>;
  return (
    <ul className="divide-y divide-ink/15">
      {caught.map((e) => (
        <li key={e.week} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
          <Link href={`/good-wall/${e.week}`} className="min-w-0"><span className="display text-2xl text-burnt">№{e.week}</span> <span className="text-sm">{e.fire.cause_name}</span></Link>
          <span className="flex items-center gap-3">
            <span className="num font-semibold">{goodFmt(exactShare(e.fire, e.gift.weight), 2)}</span>
            {e.gift.claimed_share ? <Pill tone="forest">Claimed</Pill> : <Pill tone="ember">Unclaimed</Pill>}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Burns({ accountId }: { accountId: string }) {
  const { data, error, isLoading } = useTxns(accountId);
  if (isLoading) return <Loading rows={3} />;
  if (error) return <QueryError what="Indexed transactions" error={error} />;
  const rows = (data?.txns ?? []).filter((t) => t.method === "redeem" || t.method === "kindle");
  return (
    <div className="space-y-3">
      <IndexedLabel stale={data?.stale} error={data?.error} />
      {data?.error && !data.txns.length ? (
        <Notice tone="error" title="The indexer is unavailable">{data.error}. Your balance above is read from the contract and is unaffected.</Notice>
      ) : rows.length === 0 ? (
        <p className="text-sm text-ink/70">No redemptions or kindles in your indexed transactions.</p>
      ) : (
        <ul className="divide-y divide-ink/15">
          {rows.map((t) => (
            <li key={t.hash} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
              <span>
                <span className="font-semibold capitalize">{t.method}</span>{" "}
                {t.method === "redeem" && typeof t.args?.amount === "string" && /^\d+$/.test(t.args.amount) ? goodFmt(t.args.amount, 2) : t.method === "kindle" ? `fire №${String(t.args?.week ?? "?")}` : ""}
                <span className="ml-2 text-ink/60">{dateFromNs(t.timestamp_ns)}</span>
              </span>
              <span className="flex items-center gap-3">
                {t.success === false ? <Pill tone="red">Failed</Pill> : t.success ? <Pill tone="forest">Success</Pill> : <Pill tone="muted">Unknown</Pill>}
                <a href={txUrl(t.hash)} target="_blank" rel="noreferrer" className="underline underline-offset-2">Explorer ↗</a>
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-ink/60">Kindle cost isn&apos;t in the transaction arguments; the explorer shows the burned amount in the receipt logs.</p>
    </div>
  );
}

export function GoodPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Your holdings"
        title="My GOOD"
        intro="What you hold, what it is backed by, and what is still waiting for you. Every figure here is read from the contract unless marked as indexed."
        aside={<HearthArt className="hidden h-28 w-40 md:block" />}
      />
      <RequireWallet what="My GOOD shows your balance, your backing and anything left to claim.">
        {(a) => (
          <div className="space-y-8">
            <Card>
              <Holdings accountId={a} />
              <div className="mt-6 flex flex-wrap gap-3 border-t-2 border-ink pt-5">
                <Button href="/app/redeem" tone="dark">Redeem for NEAR</Button>
                <Button href="/app/claim" tone="outline">Claim</Button>
              </div>
              <ContractLabel>get_account · get_hearth</ContractLabel>
            </Card>
            <div className="grid gap-8 lg:grid-cols-2">
              <Card eyebrow="Waiting for you" title="Unclaimed">
                <Unclaimed accountId={a} />
                <ContractLabel>get_gift × get_fire per week</ContractLabel>
              </Card>
              <Card eyebrow="Earned" title="GOOD by fire">
                <Rewards accountId={a} />
                <ContractLabel>Exact shares from contract state</ContractLabel>
              </Card>
            </div>
            <Card eyebrow="Burned" title="Redemptions & kindles">
              <Burns accountId={a} />
            </Card>
          </div>
        )}
      </RequireWallet>
    </div>
  );
}
