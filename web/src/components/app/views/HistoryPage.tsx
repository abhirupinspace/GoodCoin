"use client";
import Link from "next/link";
import { Button, Notice } from "@/components/ui";
import { Card, ContractLabel, Loading, PageHeader, Pill, QueryError, RequireWallet } from "@/components/app/shell";
import { exactShare, isSettled } from "@/components/app/data";
import { FireOutcome } from "@/components/app/FireOutcome";
import { accountUrl, txUrl } from "@/lib/config";
import { dateFromNs, goodFmt, nearFmt, shortAccount } from "@/lib/format";
import { useAccount, useHistory, useStats, useTxns, type HistoryEntry } from "@/lib/useQueries";
import type { StatsView } from "@/types/contract";

function Result({ e, stats }: { e: HistoryEntry; stats: StatsView }) {
  const { fire, gift } = e;
  if (!isSettled(e.week, stats)) return <span className="text-sm text-ink/70">Waiting for the fire to settle</span>;
  if (fire.outcome === "Caught")
    return (
      <span className="flex flex-wrap items-center gap-2">
        <span className="num font-semibold">{goodFmt(exactShare(fire, gift.weight), 2)}</span>
        {gift.claimed_share ? <Pill tone="forest">Claimed</Pill> : <Pill tone="ember">Unclaimed</Pill>}
        {stats.extinguished && fire.payout === "Carried" && (gift.claimed_carry ? <Pill tone="forest">Carry refunded</Pill> : <Pill tone="ember">Carry refund?</Pill>)}
      </span>
    );
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="num font-semibold">{nearFmt(gift.amount, 3)} back</span>
      {gift.claimed_refund ? <Pill tone="forest">Refunded</Pill> : <Pill tone="ember">Refund unclaimed</Pill>}
    </span>
  );
}

/** weight − amount: negative = moved to your spark on your first gift; positive = bounty weight you received. */
function SparkNote({ e }: { e: HistoryEntry }) {
  const d = BigInt(e.gift.weight) - BigInt(e.gift.amount);
  if (d === 0n) return null;
  return d < 0n
    ? <p className="text-xs text-ink/70">{nearFmt(-d, 3)} of weight passed to your spark</p>
    : <p className="text-xs text-forest">+{nearFmt(d, 3)} of weight from people you brought</p>;
}

function Entries({ accountId }: { accountId: string }) {
  const hist = useHistory(accountId);
  const stats = useStats();
  const txns = useTxns(accountId);
  if (hist.error) return <QueryError what="Your history" error={hist.error} />;
  if (stats.error) return <QueryError what="Protocol stats" error={stats.error} />;
  if (!hist.data || !stats.data) return <Loading rows={5} />;
  const s = stats.data;
  if (hist.data.entries.length === 0)
    return (
      <Notice tone="empty" title="You haven't joined a fire yet">
        Your gifts appear here once you give. <Link href="/app" className="underline">Join this week&apos;s fire →</Link>
      </Notice>
    );
  const gives = (txns.data?.txns ?? []).filter((t) => t.method === "give" && t.success !== false);
  return (
    <div>
      <ul className="space-y-4">
        {hist.data.entries.map((e) => {
          const hashes = gives.filter((t) => String(t.args?.week ?? "") === e.week).map((t) => t.hash);
          return (
            <li key={e.week} className="border-2 border-ink bg-paper p-4">
              <div className="grid gap-4 md:grid-cols-[7rem_1fr_auto] md:items-center">
                <div>
                  <p className="display text-5xl leading-none text-burnt">№{e.week}</p>
                  <p className="mt-1 text-xs text-ink/60">{dateFromNs(e.fire.start_ns)}</p>
                </div>
                <div className="min-w-0">
                  <p className="display text-2xl">{e.fire.cause_name}</p>
                  <p className="text-sm"><span className="text-ink/60">Your gift (excl. record fee)</span> <span className="num font-semibold">{nearFmt(e.gift.amount, 3)}</span> <span className="text-ink/60">· fire had {e.fire.givers} of {e.fire.goal} givers</span></p>
                  <SparkNote e={e} />
                  <div className="mt-2"><Result e={e} stats={s} /></div>
                </div>
                <div className="flex flex-row flex-wrap items-center gap-3 md:flex-col md:items-end">
                  <FireOutcome fire={e.fire} stats={s} />
                  <Link href={`/good-wall/${e.week}`} className="text-sm underline underline-offset-2">Fire page →</Link>
                  {hashes.map((h, i) => <a key={h} href={txUrl(h)} target="_blank" rel="noreferrer" className="text-sm underline underline-offset-2">Gift tx{hashes.length > 1 ? ` ${i + 1}` : ""} ↗</a>)}
                  <a href={accountUrl(e.fire.cause_account)} target="_blank" rel="noreferrer" className="text-xs text-ink/60 underline underline-offset-2">Cause account ↗</a>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <ContractLabel>Scanned {hist.data.scanned_weeks} weeks of get_gift · gift-tx links are indexed (NearBlocks) and may be missing</ContractLabel>
    </div>
  );
}

function Spark({ accountId }: { accountId: string }) {
  const { data, error } = useAccount(accountId);
  if (error) return <QueryError what="Your profile" error={error} />;
  if (!data) return <Loading />;
  const p = data.profile;
  if (!p) return <p className="text-sm text-ink/70">No profile yet. Your first gift creates it.</p>;
  return (
    <dl className="grid gap-4 text-sm sm:grid-cols-3">
      <div><dt className="eyebrow text-ink/60">First gift</dt><dd className="display text-3xl">Fire №{p.first_week}</dd></div>
      <div><dt className="eyebrow text-ink/60">You named as spark</dt><dd className="mt-1 font-semibold">{p.sparked_by ? shortAccount(p.sparked_by, 30) : "Nobody"}</dd>{p.sparked_by && <dd className="text-xs text-ink/60">The bounty applied only if they had already given in that fire; a negative weight note on fire №{p.first_week} shows it did.</dd>}</div>
      <div><dt className="eyebrow text-ink/60">People you brought</dt><dd className="display num text-3xl">{p.sparks}</dd></div>
    </dl>
  );
}

export function HistoryPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="Your fires" title="My History" intro="Every fire you threw NEAR into, what became of it, and what it left you." aside={<Button href="/app/claim" tone="outline">Claim</Button>} />
      <RequireWallet what="My History lists every fire you gave to.">
        {(a) => (
          <div className="space-y-8">
            <Card eyebrow="Spark attribution" title="How you arrived"><Spark accountId={a} /></Card>
            <Entries accountId={a} />
          </div>
        )}
      </RequireWallet>
    </div>
  );
}
