"use client";
import { Button } from "@/components/ui";
import { useTx } from "@/components/wallet/useTx";
import { useStats } from "@/lib/useQueries";

/** Permissionless housekeeping: settle ended fires and send due payouts. */
export function SettleBar() {
  const { data } = useStats();
  const { run, busy } = useTx();
  if (!data) return null;
  const behind = Number(data.current_week) - Number(data.next_to_settle);
  const due = data.due_weeks[0];
  if (behind <= 0 && !due) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 border-2 border-dashed border-line p-4">
      <p className="flex-1 text-sm">
        {behind > 0 && <>{behind} ended fire{behind > 1 ? "s" : ""} await settlement. </>}
        {due && <>Fire №{due}'s payout is due. </>}
        Anyone can do this; it costs only gas.
      </p>
      {behind > 0 && <Button tone="dark" disabled={busy} onClick={() => run("settle", {}, "0", "Settle")}>Settle</Button>}
      {due && <Button tone="outline" disabled={busy} onClick={() => run("payout", { week: due }, "0", `Payout of fire ${due}`)}>Send payout</Button>}
    </div>
  );
}
