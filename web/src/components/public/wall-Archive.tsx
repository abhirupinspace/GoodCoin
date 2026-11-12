"use client";
// The Good Wall archive: every fire on the record, searchable and filterable. All data from list_fires.
import { useId, useMemo, useState } from "react";
import { FireCard } from "@/components/fire/FireCard";
import { Button, Notice, Skeleton } from "@/components/ui";
import { nearFmt } from "@/lib/format";
import { useCauses, useConfig } from "@/lib/useQueries";
import type { FireView } from "@/types/contract";
import { toCause, useAllFires } from "./useAllFires";

type OutcomeFilter = "All" | "Caught" | "Smothered" | "Open";
const OUTCOMES: [OutcomeFilter, string][] = [["All", "All"], ["Caught", "Caught"], ["Smothered", "Smothered"], ["Open", "Burning / unsettled"]];
const PAGE = 24;

/** yyyy-mm-dd (local) → ns at local midnight; null if empty. */
function dayNs(d: string, endOfDay = false): bigint | null {
  if (!d) return null;
  const t = new Date(`${d}T${endOfDay ? "23:59:59.999" : "00:00:00"}`).getTime();
  return Number.isFinite(t) ? BigInt(t) * 1_000_000n : null;
}

export function WallArchive() {
  const { data, error, current } = useAllFires();
  const causes = useCauses();
  const config = useConfig();
  const ids = { q: useId(), cause: useId(), from: useId(), to: useId(), empty: useId() };

  const [q, setQ] = useState("");
  const [outcome, setOutcome] = useState<OutcomeFilter>("All");
  const [cause, setCause] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showEmpty, setShowEmpty] = useState(false);
  const [limit, setLimit] = useState(PAGE);

  const filtered = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase().replace(/^(№|#|no\.?\s*)/, "");
    const lo = dayNs(from), hi = dayNs(to, true);
    return data
      .filter((f) => showEmpty || f.givers > 0)
      .filter((f) => outcome === "All" || f.outcome === outcome)
      .filter((f) => cause === "all" || String(f.cause) === cause)
      .filter((f) => (lo === null || BigInt(f.end_ns) > lo) && (hi === null || BigInt(f.start_ns) <= hi))
      .filter((f) => !needle || f.week === needle || f.cause_name.toLowerCase().includes(needle) || f.cause_account.toLowerCase().includes(needle))
      .slice()
      .reverse();
  }, [data, q, outcome, cause, from, to, showEmpty]);

  const totals = useMemo(() => {
    if (!data || !config.data) return null;
    const caught = data.filter((f) => f.outcome === "Caught");
    const paid = caught.filter((f) => f.payout === "Paid").reduce((s, f) => s + toCause(f.total, config.data.fee_bps), 0n);
    return { caught: caught.length, smothered: data.filter((f) => f.outcome === "Smothered" && f.givers > 0).length, paid };
  }, [data, config.data]);

  const reset = () => { setQ(""); setOutcome("All"); setCause("all"); setFrom(""); setTo(""); setShowEmpty(false); setLimit(PAGE); };
  const field = "h-11 w-full border-2 border-ink bg-paper px-3 font-sans text-base focus:outline-none focus-visible:outline-3 focus-visible:outline-ember";

  return (
    <div>
      {/* summary strip */}
      <div className="grid grid-cols-2 gap-6 border-y-[3px] border-double border-ink py-6 sm:grid-cols-4">
        <Summary label="Fires on the record" value={current === undefined ? null : String(current + 1n)} />
        <Summary label="Caught" value={totals ? String(totals.caught) : null} />
        <Summary label="Smothered (with givers)" value={totals ? String(totals.smothered) : null} />
        <Summary label="Transferred to causes" value={totals ? nearFmt(totals.paid, 2) : null} hint="Caught fires with payout Paid" />
      </div>

      {/* filters */}
      <form role="search" aria-label="Filter the Good Wall" className="mt-8 grid gap-5 md:grid-cols-[1.4fr_1fr_0.8fr_0.8fr]" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label htmlFor={ids.q} className="eyebrow mb-1.5 block text-ink/70">Search cause or fire number</label>
          <input id={ids.q} type="search" value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} placeholder="e.g. climate, or 3" className={field} />
        </div>
        <div>
          <label htmlFor={ids.cause} className="eyebrow mb-1.5 block text-ink/70">Cause</label>
          <select id={ids.cause} value={cause} onChange={(e) => { setCause(e.target.value); setLimit(PAGE); }} className={field}>
            <option value="all">All causes</option>
            {(causes.data ?? []).map((c, i) => <option key={c.account} value={String(i)}>{c.name}{c.dead ? " (dead)" : ""}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={ids.from} className="eyebrow mb-1.5 block text-ink/70">From date</label>
          <input id={ids.from} type="date" value={from} onChange={(e) => { setFrom(e.target.value); setLimit(PAGE); }} className={field} />
        </div>
        <div>
          <label htmlFor={ids.to} className="eyebrow mb-1.5 block text-ink/70">To date</label>
          <input id={ids.to} type="date" value={to} onChange={(e) => { setTo(e.target.value); setLimit(PAGE); }} className={field} />
        </div>
        <div className="flex flex-wrap items-center gap-2 md:col-span-4" role="group" aria-label="Outcome">
          <span className="eyebrow mr-2 text-ink/70">Outcome</span>
          {OUTCOMES.map(([v, label]) => (
            <button key={v} type="button" aria-pressed={outcome === v} onClick={() => { setOutcome(v); setLimit(PAGE); }}
              className={`eyebrow h-10 border-2 border-ink px-4 transition-colors ${outcome === v ? "bg-charcoal text-paper" : "hover:bg-parchment"}`}>
              {label}
            </button>
          ))}
          <label htmlFor={ids.empty} className="ml-auto flex cursor-pointer items-center gap-2 text-sm">
            <input id={ids.empty} type="checkbox" checked={showEmpty} onChange={(e) => setShowEmpty(e.target.checked)} className="size-5 accent-[#a84b27]" />
            Show weeks nobody gave in
          </label>
          <button type="button" onClick={reset} className="eyebrow h-10 px-3 underline underline-offset-4 hover:text-burnt">Reset</button>
        </div>
      </form>

      {/* results */}
      <div className="mt-10" aria-live="polite" aria-busy={!data && !error}>
        {error ? (
          <Notice tone="error" title="The archive can't be read right now">{String(error)}</Notice>
        ) : !data ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-56 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <Notice tone="empty" title="No fires match">
            {data.some((f) => f.givers > 0) ? <>Try another search or filter, or <button type="button" className="underline" onClick={reset}>reset the filters</button>.</> : "Nobody has given in any fire yet. The current fire is waiting for its first giver."}
          </Notice>
        ) : (
          <>
            <p className="eyebrow mb-4 text-ink/60">{filtered.length} fire{filtered.length === 1 ? "" : "s"} · newest first</p>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.slice(0, limit).map((f) => <li key={f.week}><WallCard fire={f} /></li>)}
            </ul>
            {filtered.length > limit && (
              <div className="mt-10 text-center"><Button tone="outline" onClick={() => setLimit((l) => l + PAGE)}>Show more fires</Button></div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function WallCard({ fire }: { fire: FireView }) {
  return (
    <div>
      <FireCard fire={fire} />
      {fire.outcome === "Open" && <p className="mt-2 text-xs text-ink/60">Burning, or ended and awaiting settlement — numbers are provisional.</p>}
      {fire.outcome === "Smothered" && fire.givers === 0 && <p className="mt-2 text-xs text-ink/60">Nobody gave this week.</p>}
    </div>
  );
}

function Summary({ label, value, hint }: { label: string; value: string | null; hint?: string }) {
  return (
    <div>
      <p className="eyebrow text-ink/60">{label}</p>
      <p className="display num mt-1 text-4xl">{value ?? <Skeleton className="h-9 w-20" />}</p>
      {hint && <p className="mt-0.5 text-xs text-ink/60">{hint}</p>}
    </div>
  );
}
