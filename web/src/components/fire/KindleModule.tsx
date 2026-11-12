"use client";
import { Button, Notice } from "@/components/ui";
import { useTx } from "@/components/wallet/useTx";
import { goodFmt } from "@/lib/format";
import { useAccount, useCurrentFire, useKindleQuote } from "@/lib/useQueries";

export function KindleModule() {
  const fire = useCurrentFire();
  const quote = useKindleQuote(fire.data?.week);
  const { run, busy, accountId } = useTx();
  const acct = useAccount(accountId);
  if (!fire.data) return null;
  if (!quote.data)
    return (
      <Notice tone="empty" title="Kindling is closed">
        It opens only in the last 10% of a fire, and only when the fire is within a quarter of its goal. Right now there is nothing to rescue.
      </Notice>
    );
  const cost = BigInt(quote.data);
  const bal = acct.data ? BigInt(acct.data.good_balance) : 0n;
  return (
    <div className="space-y-3">
      <p className="text-sm">Burn <strong>{goodFmt(cost.toString())}</strong> (one gift's Hearth share at the floor) to lower the goal by one giver. Burned GOOD is gone; the floor rises for everyone else. A rescued fire does not raise next week's goal.</p>
      {accountId && bal < cost && <p className="text-sm text-red">You hold {goodFmt(bal.toString())}, not enough to kindle.</p>}
      <Button tone="red" disabled={busy || (!!accountId && bal < cost)} onClick={() => run("kindle", { week: fire.data!.week }, "0", "Kindle")}>
        {accountId ? `Kindle — burn ${goodFmt(cost.toString())}` : "Connect wallet to kindle"}
      </Button>
    </div>
  );
}
