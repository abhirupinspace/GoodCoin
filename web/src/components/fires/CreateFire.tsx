"use client";
// Launch a real fire through the factory: one transaction creates a locked GOODCOIN contract running the
// flagship's exact code. The page waits until the indexer has the new fire, then opens it.
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Notice, Stamp } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { TxError, useNear } from "@/components/wallet/NearProvider";
import { accountUrl } from "@/lib/config";
import { useFireContext } from "@/lib/fire-context";
import { nearFmt, parseNear } from "@/lib/format";
import { ContractNotDeployedError, view } from "@/lib/rpc";

export const FACTORY = process.env.NEXT_PUBLIC_FACTORY || "";
const SEC = 1_000_000_000n;
const CYCLES = [
  { label: "10 minutes", ns: 600n * SEC },
  { label: "1 hour", ns: 3600n * SEC },
  { label: "1 day", ns: 86_400n * SEC },
  { label: "7 days", ns: 7n * 86_400n * SEC },
];
const NAME = /^(?!-)(?!.*--)[a-z0-9-]{2,32}(?<!-)$/;
const ACCOUNT = /^(?=.{2,64}$)([a-z0-9]+[-_])*[a-z0-9]+(\.([a-z0-9]+[-_])*[a-z0-9]+)+$/;

interface Bounds { min_gift: string; max_goal_start: number; min_seed: string; storage: string }

export function CreateFire() {
  const { accountId, connect, callContract } = useNear();
  const { setFire } = useFireContext();
  const { push, update } = useToast();
  const router = useRouter();
  const bounds = useQuery({
    queryKey: ["factory", FACTORY, "bounds"],
    enabled: !!FACTORY,
    queryFn: () => view<Bounds>("bounds", {}, FACTORY),
    retry: false,
  });
  const [f, setF] = useState({ name: "", label: "", cause: "", causeName: "", causeUri: "", cycle: 0, minGift: "0.1", goal: "3", seed: "0.1" });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((x) => ({ ...x, [k]: k === "cycle" ? Number(e.target.value) : e.target.value }));

  if (!FACTORY) return <Notice tone="error" title="No factory configured">Set NEXT_PUBLIC_FACTORY.</Notice>;
  if (bounds.error instanceof ContractNotDeployedError) return <Notice tone="empty" title="The fire factory isn't deployed yet">Check back shortly.</Notice>;
  if (!bounds.data) return <p className="meta text-mute">Reading the factory…</p>;

  const minGift = parseNear(f.minGift);
  const seed = parseNear(f.seed);
  const goal = Number(f.goal);
  const deposit = seed ? (BigInt(bounds.data.storage) + BigInt(seed)).toString() : null;
  const errors: Partial<Record<keyof typeof f, string>> = {};
  if (!NAME.test(f.name)) errors.name = "2-32 characters: a-z, 0-9 and single hyphens.";
  if (!f.label.trim() || f.label.trim().length > 22) errors.label = "1-22 characters.";
  if (!ACCOUNT.test(f.cause) || f.cause.startsWith("0x")) errors.cause = "A named NEAR account, like a DAO: name.sputnik-v2.testnet.";
  if (!f.causeName.trim() || f.causeName.length > 80) errors.causeName = "1-80 characters.";
  if (!minGift || BigInt(minGift) < BigInt(bounds.data.min_gift)) errors.minGift = `At least ${nearFmt(bounds.data.min_gift)}.`;
  if (!Number.isInteger(goal) || goal < 2 || goal > bounds.data.max_goal_start) errors.goal = `A whole number from 2 to ${bounds.data.max_goal_start}.`;
  if (!seed || BigInt(seed) < BigInt(bounds.data.min_seed)) errors.seed = `At least ${nearFmt(bounds.data.min_seed)}.`;
  const valid = Object.keys(errors).length === 0;
  const account = `${f.name || "name"}.${FACTORY}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!valid || !deposit) return;
    if (!accountId) return connect();
    setBusy(true);
    const id = push({ kind: "pending", title: "Lighting the fire…", body: "Confirm in your wallet. One transaction creates, funds, deploys and locks the contract." });
    try {
      const params = {
        label: f.label.trim(),
        cycle_ns: CYCLES[f.cycle].ns.toString(),
        min_gift: minGift,
        goal_start: goal,
        causes: [{ account: f.cause, name: f.causeName.trim(), uri: f.causeUri.trim() }],
      };
      const hash = await callContract(FACTORY, "create_fire", { name: f.name, params }, deposit, "300000000000000");
      // The factory refunds and records nothing if creation failed, so check the account really exists.
      const live = await view<{ label: string }>("get_config", {}, account).catch(() => null);
      if (!live) throw new TxError("The transaction finished but the fire wasn't created (the name may be taken). Your deposit was refunded.", hash);
      update(id, { kind: "success", title: "Your fire is lit", body: `${account} is live and locked.`, hash });
      setFire(account);
      router.push(`/app?fire=${encodeURIComponent(account)}`);
    } catch (err) {
      const e2 = err instanceof TxError ? err : new TxError(String(err), null);
      update(id, { kind: "error", title: "Fire not created", body: e2.message, hash: e2.hash });
    } finally {
      setBusy(false);
    }
  }

  const field = (k: keyof typeof f, label: string, input: React.ReactNode, help?: React.ReactNode) => (
    <div>
      <label htmlFor={k} className="eyebrow">{label}</label>
      <div className="mt-2">{input}</div>
      {help && <p className="mt-1 text-xs text-mute">{help}</p>}
      {touched && errors[k] && <p className="mt-1 text-sm font-semibold text-red" role="alert">{errors[k]}</p>}
    </div>
  );
  const cls = "h-12 w-full border border-line bg-paper px-3 text-ink outline-none focus:border-ember";

  return (
    <form onSubmit={submit} noValidate className="grid gap-12 lg:grid-cols-[1fr_380px]">
      <div className="grid gap-8 sm:grid-cols-2">
        {field("name", "Account name", <input id="name" className={cls} value={f.name} onChange={set("name")} placeholder="oss-sprint" autoComplete="off" />, <>Your fire lives at <span className="font-mono text-ink/80">{account}</span></>)}
        {field("label", "Fire name", <input id="label" className={cls} value={f.label} onChange={set("label")} placeholder="OSS sprint" />)}
        {field("cause", "Cause account", <input id="cause" className={cls} value={f.cause} onChange={set("cause")} placeholder="mydao.sputnik-v2.testnet" autoComplete="off" />, "Where 90% of every caught fire goes. Use a DAO treasury.")}
        {field("causeName", "Cause name", <input id="causeName" className={cls} value={f.causeName} onChange={set("causeName")} placeholder="Open-source maintainers fund" />)}
        {field("causeUri", "Cause link (optional)", <input id="causeUri" className={cls} value={f.causeUri} onChange={set("causeUri")} placeholder="https://" />)}
        {field("cycle", "One fire every", (
          <select id="cycle" className={cls} value={f.cycle} onChange={set("cycle")}>
            {CYCLES.map((c, i) => <option key={c.label} value={i}>{c.label}</option>)}
          </select>
        ))}
        {field("minGift", "Minimum gift (NEAR)", <input id="minGift" inputMode="decimal" className={cls} value={f.minGift} onChange={set("minGift")} />)}
        {field("goal", "Starting goal (givers)", <input id="goal" inputMode="numeric" className={cls} value={f.goal} onChange={set("goal")} />, `Moves ×1.1 after each catch, ÷1.1 after each miss, between ${Math.max(1, Math.floor(goal / 2)) || 1} and ${goal * 100 || "…"}.`)}
        {field("seed", "Hearth seed (NEAR)", <input id="seed" inputMode="decimal" className={cls} value={f.seed} onChange={set("seed")} />, "Backs the first GOOD. Locked in the fire forever; nobody owns it.")}
      </div>
      <aside className="frame h-fit space-y-6 bg-surface p-6">
        <p className="meta text-mute">What you get</p>
        <ul className="space-y-3 text-sm text-ink/85">
          <li>A NEP-141 GOOD token with the streak mechanic in the contract.</li>
          <li>Byte-identical code to the flagship. No keys, no admin, no upgrade.</li>
          <li>Fee 10%, markup 25%, allowance 0.25% per fire: fixed, as in production.</li>
        </ul>
        <Notice title="You choose the cause">GOODCOIN doesn&apos;t vet community causes. Givers should check the cause account before they give.</Notice>
        <div className="border-t border-line pt-4">
          <p className="meta text-mute">Deposit</p>
          <p className="display mt-1 text-4xl text-ink">{deposit ? nearFmt(deposit, 3) : "…"}</p>
          <p className="mt-1 text-xs text-mute">{nearFmt(bounds.data.storage, 3)} storage for the contract + your seed. Refunded in full if creation fails.</p>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={busy || (touched && !valid)}>
          {busy ? "Waiting for finality…" : accountId ? "Light the fire" : "Connect wallet"}
        </Button>
        <p className="text-xs text-mute">Factory <a className="underline underline-offset-2 hover:text-ember" href={accountUrl(FACTORY)} target="_blank" rel="noreferrer">{FACTORY} ↗</a> <Stamp tone="ink" className="ml-1">locked</Stamp></p>
      </aside>
    </form>
  );
}
