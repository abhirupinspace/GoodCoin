"use client";
import { useState } from "react";
import { HearthArt } from "@/components/art";
import { Button, Notice, Term } from "@/components/ui";
import { useTx } from "@/components/wallet/useTx";
import { Card, ContractLabel, Loading, PageHeader, QueryError, RequireWallet } from "@/components/app/shell";
import { toDecimal } from "@/components/app/data";
import { floorFmt, goodFmt, nearFmt, parseNear } from "@/lib/format";
import { redeem } from "@/lib/protocol";
import { useAccount, useHearth } from "@/lib/useQueries";

function Redeemer({ accountId }: { accountId: string }) {
  const acct = useAccount(accountId);
  const hearth = useHearth();
  const { run, busy } = useTx();
  const [input, setInput] = useState("");
  const [touched, setTouched] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  if (acct.error) return <QueryError what="Your balance" error={acct.error} />;
  if (hearth.error) return <QueryError what="The Hearth" error={hearth.error} />;
  if (!acct.data || !hearth.data) return <Loading rows={4} />;

  const bal = BigInt(acct.data.good_balance);
  const H = BigInt(hearth.data.hearth);
  const B = BigInt(hearth.data.backed);
  const parsed = parseNear(input); // GOOD has 24 decimals, same as NEAR
  const amount = parsed ? BigInt(parsed) : null;
  const error = !touched || input === "" ? null
    : amount === null ? "Enter a GOOD amount, e.g. 12.5 (up to 24 decimals)."
    : amount <= 0n ? "Enter more than zero."
    : amount > bal ? `You hold ${goodFmt(bal, 2)}.`
    : null;
  const valid = amount !== null && amount > 0n && amount <= bal;
  const out = valid ? redeem(amount!, H, B) : 0n;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    const hash = await run("redeem", { amount: amount!.toString() }, "0", "Redeem");
    if (hash) { setDone(hash); setInput(""); setTouched(false); }
  }

  if (bal === 0n)
    return <Notice tone="empty" title="You hold no GOOD">GOOD comes from fires that catch. Claim any waiting GOOD first, or join this week&apos;s fire.</Notice>;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
      <Card eyebrow="Burn GOOD, receive NEAR" title="Redeem">
        <form onSubmit={submit} noValidate className="space-y-4">
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="redeem-amount" className="eyebrow">Amount (GOOD)</label>
              <span className="text-sm text-ink/70">Balance <span className="num font-semibold">{goodFmt(bal, 4)}</span></span>
            </div>
            <div className="mt-2 flex gap-2">
              <input
                id="redeem-amount" inputMode="decimal" autoComplete="off" placeholder="0.00" value={input}
                onChange={(e) => { setInput(e.target.value.replace(",", ".")); setDone(null); }} onBlur={() => setTouched(true)}
                aria-invalid={!!error} aria-describedby="redeem-help"
                className="display num h-14 w-full min-w-0 border-2 border-ink bg-paper px-4 text-3xl outline-none focus:border-ember"
              />
              <button type="button" className="eyebrow border-2 border-ink px-3 hover:bg-parchment" onClick={() => { setInput(toDecimal(bal)); setTouched(true); }}>Max</button>
            </div>
            {error && <p className="mt-2 text-sm font-semibold text-red" role="alert">{error}</p>}
          </div>
          <div id="redeem-help" className="border-2 border-ink bg-parchment/50 p-4">
            <p className="eyebrow text-ink/60">You receive (estimate at today&apos;s floor)</p>
            <p className="display num mt-1 text-5xl">{nearFmt(out, 6)}</p>
            <p className="mt-1 text-xs text-ink/60">⌊amount × H ÷ B⌋ with H = {nearFmt(H, 4)} and B = {goodFmt(B, 0)}. If another redemption or a catch lands first, the contract uses the floor at that moment.</p>
          </div>
          <Button type="submit" size="lg" tone="dark" disabled={busy || !valid} className="w-full">
            {busy ? "Waiting for finality…" : valid ? `Redeem ${goodFmt(amount!, 2)}` : "Enter an amount"}
          </Button>
          {done && <p className="text-sm text-forest">Redemption final on NEAR. Your balance above is re-read from the contract.</p>}
        </form>
        <ContractLabel>get_account · get_hearth · redeem(amount)</ContractLabel>
      </Card>

      <Card eyebrow="Know before you redeem" title="How it works">
        <HearthArt className="mb-4 h-24 w-36" />
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
          <li>Your GOOD is <strong>burned</strong> and you receive its share of the Hearth: <Term def="Hearth ÷ backed GOOD, rounded down in the Hearth's favour.">the floor</Term>, now {floorFmt(hearth.data.floor_yocto_per_good)} NEAR per GOOD.</li>
          <li><strong>The floor is unchanged by redemption</strong> (it rounds down, so it can only tick up). Everyone else keeps exactly the same backing.</li>
          <li>The floor is <strong>denominated in NEAR</strong>. It is not a price and says nothing about what NEAR is worth in dollars.</li>
          <li>Always open: no fee, no delay, no admin, even while fires are unsettled.</li>
          <li>Redemption can&apos;t be undone. If the NEAR transfer to your account fails, the contract keeps that NEAR in the Hearth, raising the floor for everyone.</li>
        </ul>
      </Card>
    </div>
  );
}

export function RedeemPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="The Hearth's promise" title="Redeem" intro="Swap GOOD back for NEAR at the floor, any time." />
      <RequireWallet what="Redeeming burns GOOD from your account.">{(a) => <Redeemer accountId={a} />}</RequireWallet>
    </div>
  );
}
