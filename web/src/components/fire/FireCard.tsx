import Link from "next/link";
import { OutcomeStamp } from "@/components/ui";
import { dateFromNs, nearFmt } from "@/lib/format";
import type { FireView } from "@/types/contract";

/** Vintage campaign card for the Good Wall. */
export function FireCard({ fire }: { fire: FireView }) {
  const toCause = fire.outcome === "Caught" ? BigInt(fire.total) - (BigInt(fire.total) * 1000n) / 10000n : 0n;
  return (
    <Link href={`/good-wall/${fire.week}`} className="group frame block bg-paper p-5 transition-transform hover:-translate-y-1">
      <div className="flex items-start justify-between gap-3">
        <p className="display text-6xl leading-none text-burnt">№{fire.week}</p>
        <OutcomeStamp outcome={fire.outcome} />
      </div>
      <p className="display mt-4 text-3xl leading-tight group-hover:text-burnt">{fire.cause_name}</p>
      <p className="mt-1 text-xs text-ink/60">{dateFromNs(fire.start_ns)}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 border-t-2 border-ink pt-3 text-sm">
        <div><dt className="eyebrow text-ink/60">Givers</dt><dd className="num font-semibold">{fire.givers} / {fire.goal}</dd></div>
        <div><dt className="eyebrow text-ink/60">{fire.outcome === "Caught" ? "To cause" : "Committed"}</dt><dd className="num font-semibold">{nearFmt(fire.outcome === "Caught" ? toCause.toString() : fire.total, 2)}</dd></div>
      </dl>
    </Link>
  );
}
