"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { KindleArt } from "@/components/art";
import { GiveForm } from "@/components/fire/GiveForm";
import { KindleModule } from "@/components/fire/KindleModule";
import { LiveFire } from "@/components/fire/LiveFire";
import { SettleBar } from "@/components/fire/SettleBar";
import { Stat } from "@/components/ui";
import { Card, ContractLabel, Loading, PageHeader, QueryError } from "@/components/app/shell";
import { FireOutcome } from "@/components/app/FireOutcome";
import { goodFmt, nearFmt, shortAccount } from "@/lib/format";
import { useCurrentFire, useFire, useFires, useStats } from "@/lib/useQueries";

function RefNote() {
  const ref = useSearchParams().get("ref");
  if (!ref) return null;
  return (
    <p className="mb-4 border-l-4 border-ember bg-parchment/60 px-3 py-2 text-sm">
      You arrived through <strong>{shortAccount(ref, 32)}</strong>&apos;s link, so the form names them as your spark. It only counts if this is your first-ever gift and they already gave in this fire. You can clear the field.
    </p>
  );
}

function Settlement() {
  const { data: s, error } = useStats();
  if (error) return <QueryError what="Settlement status" error={error} />;
  if (!s) return <Loading />;
  const behind = Number(s.current_week) - Number(s.next_to_settle);
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <div><dt className="eyebrow text-ink/60">Ended, unsettled</dt><dd className="display num text-3xl">{Math.max(0, behind)}</dd></div>
        <div><dt className="eyebrow text-ink/60">Payouts due</dt><dd className="display num text-3xl">{s.due_weeks.length}</dd></div>
        <div><dt className="eyebrow text-ink/60">Owed to causes</dt><dd className="display num text-3xl">{nearFmt(s.payouts_owed, 2)}</dd></div>
        <div><dt className="eyebrow text-ink/60">Refunds unclaimed</dt><dd className="display num text-3xl">{nearFmt(s.refunds_owed, 2)}</dd></div>
      </dl>
      {behind <= 0 && s.due_weeks.length === 0 ? (
        <p className="text-sm text-ink/70">Every ended fire is settled and no payout is waiting.</p>
      ) : (
        <SettleBar />
      )}
      {s.extinguished && <p className="text-sm font-semibold text-red">Every cause is gone: giving and kindling are closed. Redemption stays open.</p>}
    </div>
  );
}

function PreviousFire({ week }: { week: string }) {
  const fire = useFire(week);
  const { data: stats } = useStats();
  if (fire.error) return <QueryError what="The previous fire" error={fire.error} />;
  if (!fire.data || !stats) return <Loading />;
  const f = fire.data;
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="display text-5xl leading-none text-burnt">№{f.week}</p>
          <p className="display mt-2 text-2xl">{f.cause_name}</p>
        </div>
        <FireOutcome fire={f} stats={stats} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 border-t-2 border-ink pt-3 text-sm">
        <div><dt className="eyebrow text-ink/60">Givers / goal</dt><dd className="num font-semibold">{f.givers} / {f.goal}</dd></div>
        <div><dt className="eyebrow text-ink/60">Committed</dt><dd className="num font-semibold">{nearFmt(f.total, 2)}</dd></div>
        {f.outcome === "Caught" && <div><dt className="eyebrow text-ink/60">GOOD for givers</dt><dd className="num font-semibold">{goodFmt(f.minted)}</dd></div>}
        {f.outcome === "Caught" && <div><dt className="eyebrow text-ink/60">Payout</dt><dd className="font-semibold">{f.payout}</dd></div>}
        {f.outcome === "Smothered" && <div className="col-span-2"><dt className="eyebrow text-ink/60">Result</dt><dd>Givers can claim their gifts back; that week&apos;s GOOD can never exist.</dd></div>}
      </dl>
      <Link href={`/good-wall/${f.week}`} className="mt-4 inline-block text-sm font-semibold underline underline-offset-2">Fire №{f.week} on the Good Wall →</Link>
    </div>
  );
}

function RecentFires({ current }: { current: number }) {
  const from = String(Math.max(0, current - 6));
  const fires = useFires(from);
  const { data: stats } = useStats();
  if (fires.error) return <QueryError what="Recent fires" error={fires.error} />;
  if (!fires.data || !stats) return <Loading rows={4} />;
  const rows = fires.data.filter((f) => Number(f.week) < current).reverse();
  if (rows.length === 0) return <p className="text-sm text-ink/70">This is the first fire. Nothing has burned before it.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="eyebrow border-b-2 border-ink text-ink/60">
          <tr><th className="py-2 pr-3">Fire</th><th className="py-2 pr-3">Cause</th><th className="py-2 pr-3 text-right">Givers / goal</th><th className="py-2 pr-3 text-right">Committed</th><th className="py-2 text-right">Outcome</th></tr>
        </thead>
        <tbody className="num">
          {rows.map((f) => (
            <tr key={f.week} className="border-b border-ink/15">
              <td className="py-2 pr-3"><Link href={`/good-wall/${f.week}`} className="display text-2xl text-burnt hover:underline">№{f.week}</Link></td>
              <td className="py-2 pr-3">{f.cause_name}</td>
              <td className="py-2 pr-3 text-right">{f.givers} / {f.goal}</td>
              <td className="py-2 pr-3 text-right">{nearFmt(f.total, 2)}</td>
              <td className="py-2 text-right"><span className="inline-block scale-75 origin-right"><FireOutcome fire={f} stats={stats} /></span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GiveSlot() {
  const fire = useCurrentFire();
  if (fire.error) return <QueryError what="The fire" error={fire.error} />;
  if (!fire.data) return <Loading rows={4} />;
  return <GiveForm />;
}

export function FirePage() {
  const { data: stats, error } = useStats();
  const current = stats ? Number(stats.current_week) : null;
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow={current === null ? "Live from the contract" : `Fire №${current} · live from the contract`}
        title="The Fire"
        intro="One fire, one cause, this week. Watch it, join it, and — in its final hours — help rescue it. Anyone can look; actions ask for a wallet."
      />
      {error && <div className="mb-6"><QueryError what="Protocol stats" error={error} /></div>}

      <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr]">
        <section className="frame-ember paper-dark p-5 sm:p-8" aria-label="Current fire">
          <LiveFire light />
        </section>
        <Card eyebrow="Give" title="Throw in NEAR">
          <Suspense fallback={<Loading rows={4} />}>
            <RefNote />
            <GiveSlot />
          </Suspense>
        </Card>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.25fr]">
        <Card id="kindle" eyebrow="Rescue" title="Kindle" className="scroll-mt-24">
          <div className="flex gap-4">
            <KindleArt className="hidden h-24 w-32 shrink-0 sm:block" />
            <div className="min-w-0 flex-1"><KindleModule /></div>
          </div>
        </Card>
        <Card eyebrow="Housekeeping" title="Settlement & payouts">
          <Settlement />
          <ContractLabel>get_stats · settle() and payout() are permissionless</ContractLabel>
        </Card>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[0.8fr_1fr_1.4fr]">
        <Card eyebrow="Momentum" title="Streak">
          {stats ? (
            <div className="grid grid-cols-2 gap-4">
              <Stat label="Current" value={stats.streak} hint="fires caught in a row" />
              <Stat label="Longest" value={stats.longest_streak} hint="ever" />
            </div>
          ) : <Loading />}
        </Card>
        <Card eyebrow="Last week" title="Previous fire">
          {current === null ? <Loading /> : current === 0 ? <p className="text-sm text-ink/70">This is fire №0 — there is no previous fire yet.</p> : <PreviousFire week={String(current - 1)} />}
        </Card>
        <Card eyebrow="On-chain record" title="Recent fires">
          {current === null ? <Loading rows={4} /> : <RecentFires current={current} />}
          <ContractLabel>Contract state via list_fires — not an event feed</ContractLabel>
        </Card>
      </div>
    </div>
  );
}
