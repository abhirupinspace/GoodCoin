"use client";
import { OutcomeStamp, Stamp } from "@/components/ui";
import { isSettled } from "@/components/app/data";
import type { FireView, StatsView } from "@/types/contract";

/** Outcome stamp that never shows an ended-but-unsettled fire as "burning". */
export function FireOutcome({ fire, stats }: { fire: FireView; stats: StatsView }) {
  if (fire.outcome === "Open" && !isSettled(fire.week, stats) && BigInt(fire.end_ns) <= BigInt(stats.now_ns)) return <Stamp tone="ink">Ended · unsettled</Stamp>;
  return <OutcomeStamp outcome={fire.outcome} />;
}
