"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button, Notice, Term } from "@/components/ui";
import { useTx } from "@/components/wallet/useTx";
import { nearFmt, parseNear, units } from "@/lib/format";
import { useConfig, useCurrentFire, useGift } from "@/lib/useQueries";

/** Give to the current fire. week + cause come from current_fire; ?ref= pre-fills the spark. */
export function GiveForm() {
  const params = useSearchParams();
  const fire = useCurrentFire();
  const config = useConfig();
  const { run, busy, accountId } = useTx();
  const gift = useGift(fire.data?.week, accountId);
  const [amount, setAmount] = useState("");
  const [spark, setSpark] = useState(params.get("ref") ?? "");
  const [touched, setTouched] = useState(false);

  if (!fire.data || !config.data) return null;
  const f = fire.data;
  const minGift = BigInt(config.data.min_gift);
  const fee = BigInt(config.data.record_fee);
  const firstThisWeek = !gift.data;
  const yocto = parseNear(amount);
  const already = gift.data ? BigInt(gift.data.amount) : 0n;
  const net = yocto ? BigInt(yocto) - (firstThisWeek ? fee : 0n) : 0n;
  const error = !touched ? null
    : !yocto ? "Enter an amount in NEAR."
    : firstThisWeek && BigInt(yocto) <= fee ? `A first gift must be more than the ${nearFmt(fee.toString(), 3)} record fee.`
    : already + net < minGift ? `Your total this week must reach ${nearFmt(minGift.toString(), 2)}.`
    : null;
  const closed = f.outcome !== "Open" || f.settle_pending;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!yocto || error) return;
    const args: Record<string, unknown> = { week: f.week, cause: f.cause, sparked_by: spark.trim() || null };
    const hash = await run("give", args, yocto, "Gift");
    if (hash) setAmount("");
  }

  const suggested = (minGift + (firstThisWeek ? fee : 0n)).toString();
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="amount" className="eyebrow">Your gift (NEAR)</label>
        <div className="mt-2 flex gap-2">
          <input
            id="amount" inputMode="decimal" autoComplete="off" placeholder={nearFmt(suggested, 3).replace(" NEAR", "")}
            value={amount} onChange={(e) => setAmount(e.target.value)} onBlur={() => setTouched(true)}
            aria-invalid={!!error} aria-describedby="amount-help"
            className="display num h-14 w-full border-2 border-line bg-paper px-4 text-3xl outline-none focus:border-ember"
          />
          <button type="button" className="eyebrow border-2 border-line px-3 hover:bg-parchment" onClick={() => { setAmount(units(suggested, 3).replace(/,/g, "")); setTouched(true); }}>
            Min
          </button>
        </div>
        <p id="amount-help" className="mt-2 text-sm text-ink/70">
          Minimum gift {nearFmt(minGift.toString(), 2)} per week.{" "}
          {firstThisWeek ? <>Your first gift this week includes a <Term def={`${nearFmt(fee.toString(), 3)} that pays for storing your gift on-chain. It is never refunded, even if the fire is smothered.`}>{nearFmt(fee.toString(), 3)} record fee</Term>.</> : <>You already gave {nearFmt(already.toString(), 2)} this week; top-ups pay no fee.</>}
        </p>
        {error && <p className="mt-1 text-sm font-semibold text-red" role="alert">{error}</p>}
      </div>
      <div>
        <label htmlFor="spark" className="eyebrow">Brought here by (optional)</label>
        <input id="spark" value={spark} onChange={(e) => setSpark(e.target.value)} placeholder="friend.testnet"
          className="mt-2 h-11 w-full border-2 border-line bg-paper px-3 outline-none focus:border-ember" />
        <p className="mt-1 text-xs text-ink/60">Counts only on your first-ever gift, and only if they gave earlier in this same fire. A quarter of your first gift's weight moves to them.</p>
      </div>
      <Notice title="What happens to your NEAR">
        It waits in escrow until the week ends. If the fire catches, {100 - config.data.fee_bps / 100}% goes to the cause and {config.data.fee_bps / 100}% to the Hearth, and you can claim GOOD. If it is smothered, you can claim your gift back (minus the record fee).
      </Notice>
      <Button type="submit" size="lg" disabled={busy || closed} className="w-full">
        {closed ? "This fire is closed" : busy ? "Waiting for finality…" : accountId ? "Join the fire" : "Connect wallet to give"}
      </Button>
    </form>
  );
}
