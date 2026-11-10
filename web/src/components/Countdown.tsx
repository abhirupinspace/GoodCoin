"use client";

import { formatCountdown, nsToMs } from "@/lib/format";
import { useNow } from "@/lib/useNow";

/** Live countdown to a nanosecond timestamp, using the browser clock (block time tracks wall time closely). */
export function Countdown({ toNs, doneLabel = "now" }: { toNs: string; doneLabel?: string }) {
  const now = useNow();
  const target = nsToMs(toNs);
  if (now === null || target === null) return <span className="font-mono tabular-nums">--</span>;
  const left = target - now;
  return (
    <span className="font-mono tabular-nums" suppressHydrationWarning>
      {left <= 0 ? doneLabel : formatCountdown(left)}
    </span>
  );
}
