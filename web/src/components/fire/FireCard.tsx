import Link from "next/link";
import { Plate } from "@/components/brand";
import { shotForWeek } from "@/components/brand/assets";
import { OutcomeStamp } from "@/components/ui";
import { dateFromNs, nearFmt } from "@/lib/format";
import type { FireView } from "@/types/contract";

/** An archive entry: one image-led record per fire. Caught fires keep their flame in colour; smothered ones print in grey. */
export function FireCard({ fire, feeBps = 1000 }: { fire: FireView; feeBps?: number }) {
  const caught = fire.outcome === "Caught";
  const toCause = caught ? BigInt(fire.total) - (BigInt(fire.total) * BigInt(feeBps)) / 10000n : 0n;
  return (
    <Link href={`/good-wall/${fire.week}`} className="group block border border-line bg-parchment transition-colors hover:border-ink/50">
      <div className="relative aspect-[16/10] overflow-hidden border-b border-line">
        <Plate shot={shotForWeek(Number(fire.week))} treatment={caught ? "fire" : "mono"} className={`absolute inset-0 transition-transform duration-700 group-hover:scale-105 ${caught ? "" : "opacity-50"}`} sizes="(min-width: 1024px) 30vw, 100vw" />
        <p className="display absolute bottom-3 left-4 z-10 text-6xl leading-none text-ink"><span className="text-red">#</span>{fire.week}</p>
        <div className="absolute right-3 top-3 z-10"><OutcomeStamp outcome={fire.outcome} /></div>
      </div>
      <div className="p-5">
        <p className="display text-2xl leading-tight text-ink">{fire.cause_name}</p>
        <p className="meta mt-2 text-mute">{dateFromNs(fire.start_ns)}</p>
        <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4">
          <div><dt className="meta text-mute">Givers</dt><dd className="num mt-1 font-medium text-ink">{fire.givers} / {fire.goal}</dd></div>
          <div><dt className="meta text-mute">{caught ? "To cause" : "Committed"}</dt><dd className="num mt-1 font-medium text-ink">{nearFmt(caught ? toCause.toString() : fire.total, 2)}</dd></div>
        </dl>
      </div>
    </Link>
  );
}
