"use client";
import Link from "next/link";
import { EmberProgress, Notice, OutcomeStamp, Skeleton, Stamp, Term } from "@/components/ui";
import { duration, nearFmt, shortAccount } from "@/lib/format";
import { useCauses, useCurrentFire, useKindleQuote, useStats } from "@/lib/useQueries";
import { accountUrl } from "@/lib/config";
import { useCountdown } from "./useCountdown";

/** The live campaign panel for the current fire. Every number comes from contract views. */
export function LiveFire({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  const fire = useCurrentFire();
  const stats = useStats();
  const causes = useCauses();
  const quote = useKindleQuote(fire.data?.week);
  const left = useCountdown(fire.data?.end_ns);
  const muted = light ? "text-paper/70" : "text-ink/60";

  if (fire.error) return <Notice tone="error" title="The fire can't be read right now">{String(fire.error)}</Notice>;
  if (!fire.data) {
    return (
      <div className="space-y-4" aria-busy>
        <Skeleton className="h-10 w-2/3" /><Skeleton className="h-8 w-full" /><Skeleton className="h-20 w-full" />
      </div>
    );
  }
  const f = fire.data;
  const cause = causes.data?.[f.cause];
  const short = Math.max(0, f.goal - f.givers);
  return (
    <div className={light ? "text-paper" : "text-ink"}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className={`eyebrow ${light ? "text-mustard" : "text-burnt"}`}>Fire №{f.week} · {stats.data?.label === "demo" ? "demo fires last 6 minutes" : "one week"}</p>
          <h3 className={`display mt-2 ${compact ? "text-4xl" : "text-5xl sm:text-6xl"}`}>{f.cause_name}</h3>
          <a href={accountUrl(f.cause_account)} target="_blank" rel="noreferrer" className={`mt-1 inline-block text-sm underline-offset-2 hover:underline ${muted}`}>
            {shortAccount(f.cause_account, 36)} ↗
          </a>
          {cause?.dead && <p className="mt-1 text-sm text-red">This cause's account no longer accepts payouts; its NEAR is carried to the next fire that catches.</p>}
        </div>
        <OutcomeStamp outcome={f.outcome} />
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="display text-3xl num">{f.givers} <span className={muted}>/ {f.goal} givers</span></p>
          {f.kindled > 0 && <p className={`text-sm ${muted}`}>goal lowered by {f.kindled} kindle{f.kindled > 1 ? "s" : ""}</p>}
        </div>
        <EmberProgress givers={f.givers} goal={f.goal} light={light} />
      </div>

      <dl className={`mt-6 grid grid-cols-2 gap-5 ${compact ? "" : "sm:grid-cols-3"}`}>
        <div>
          <dt className={`eyebrow ${muted}`}>Committed</dt>
          <dd className="display num mt-1 text-3xl">{nearFmt(f.total, 2)}</dd>
        </div>
        <div>
          <dt className={`eyebrow ${muted}`}>Time left</dt>
          <dd className="display num mt-1 text-3xl">{left === null ? "…" : left === 0 ? "Ended" : duration(left)}</dd>
        </div>
        <div className={compact ? "col-span-2" : ""}>
          <dt className={`eyebrow ${muted}`}>Status</dt>
          <dd className="mt-1 text-sm">
            {f.settle_pending
              ? "Earlier fires await settlement — anyone can settle."
              : short === 0
                ? "Goal reached. It catches when the week ends."
                : `${short} more giver${short > 1 ? "s" : ""} needed.`}
          </dd>
        </div>
      </dl>

      {quote.data && (
        <div className={`mt-6 border-2 ${light ? "border-ember" : "border-burnt"} p-4`}>
          <Stamp tone="ember">Rescue window open</Stamp>
          <p className="mt-3 text-sm">
            This fire is close. A GOOD holder can <Term def="Burn GOOD to lower this week's goal by one giver. Only in the last 10% of a fire, only when it is a few givers short. A rescued fire never raises next week's goal.">kindle</Term> it now.{" "}
            <Link href="/app#kindle" className="underline underline-offset-2">Kindle →</Link>
          </p>
        </div>
      )}
    </div>
  );
}
