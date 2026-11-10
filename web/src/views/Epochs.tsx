"use client";

import { EpochBadge } from "@/components/badges";
import { Loadable } from "@/components/Loadable";
import { Empty, Good, PageHeader, Skeleton } from "@/components/ui";
import { formatTimestampNs } from "@/lib/format";
import { useEpochs } from "@/lib/queries";

export function Epochs() {
  const epochs = useEpochs();
  return (
    <>
      <PageHeader title="Epoch history">
        Up to the 100 most recent epochs from <code>list_epochs</code>, newest first. An epoch settles only after it ends and its
        dispute window closes; until then its counts can still change.
      </PageHeader>
      <Loadable query={epochs} skeleton={<Skeleton className="h-96" />}>
        {(list) =>
          list.length === 0 ? (
            <Empty>No epochs yet.</Empty>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full min-w-[56rem] text-sm">
                <thead className="text-left text-xs text-muted-fg">
                  <tr>
                    <th className="p-2 font-medium">Epoch</th>
                    <th className="p-2 font-medium">Window (UTC)</th>
                    <th className="p-2 font-medium">Status</th>
                    <th className="p-2 text-right font-medium">Deeds / target</th>
                    <th className="p-2 text-right font-medium">Participants / target</th>
                    <th className="p-2 text-right font-medium">Reward each</th>
                    <th className="p-2 text-right font-medium">Claimed</th>
                    <th className="p-2 text-right font-medium">Burned</th>
                    <th className="p-2 text-right font-medium">Unlocked</th>
                    <th className="p-2 text-right font-medium">Streak after</th>
                  </tr>
                </thead>
                <tbody>
                  {[...list].reverse().map((e) => {
                    const r = e.record;
                    const settled = r.settled_at !== null;
                    return (
                      <tr key={e.epoch} className="border-t border-border">
                        <td className="p-2 font-mono tabular-nums">{e.epoch}</td>
                        <td className="p-2 text-xs whitespace-nowrap">
                          {formatTimestampNs(e.start_ns).replace(" UTC", "")} → {formatTimestampNs(e.end_ns).slice(11)}
                        </td>
                        <td className="p-2">
                          <EpochBadge status={r.status} />
                        </td>
                        <td className="p-2 text-right font-mono tabular-nums">
                          {r.approved_deeds} / {e.deeds_target}
                        </td>
                        <td className="p-2 text-right font-mono tabular-nums">
                          {r.participants} / {e.participants_target}
                        </td>
                        <td className="p-2 text-right">{settled && r.status === "Succeeded" ? <Good yocto={r.reward_per_participant} unit={false} /> : "--"}</td>
                        <td className="p-2 text-right font-mono tabular-nums">{settled && r.status === "Succeeded" ? `${r.rewards_claimed} / ${r.participants}` : "--"}</td>
                        <td className="p-2 text-right">{settled ? <Good yocto={r.burned} compact unit={false} /> : "--"}</td>
                        <td className="p-2 text-right">{settled ? <Good yocto={r.unlocked} compact unit={false} /> : "--"}</td>
                        <td className="p-2 text-right font-mono tabular-nums">{settled ? r.streak_after : "--"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        }
      </Loadable>
      <p className="mt-2 text-xs text-muted-fg">Amounts in GOOD. Hover any amount for its exact on-chain value.</p>
    </>
  );
}
