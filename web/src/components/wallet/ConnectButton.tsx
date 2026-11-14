"use client";
import { useState } from "react";
import { useNear } from "./NearProvider";
import { shortAccount } from "@/lib/format";

export function ConnectButton({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const { accountId, ready, connect, disconnect } = useNear();
  const [open, setOpen] = useState(false);
  const base = tone === "dark"
    ? "bg-charcoal text-ink hover:bg-burnt"
    : "bg-paper text-ink hover:bg-red";
  if (!ready) return <span className={`eyebrow ${base} inline-flex h-10 items-center px-4 opacity-60`}>Wallet…</span>;
  if (!accountId)
    return (
      <button onClick={() => connect()} className={`eyebrow ${base} inline-flex h-10 items-center px-4 transition-colors`}>
        Connect wallet
      </button>
    );
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className={`eyebrow ${base} inline-flex h-10 items-center gap-2 px-4 normal-case tracking-normal`}>
        <span className="inline-block size-2 rounded-full bg-ember" aria-hidden /> {shortAccount(accountId, 20)}
      </button>
      {open && (
        <div className="frame absolute right-0 top-12 z-50 w-56 bg-paper p-2 text-ink">
          <button onClick={() => { setOpen(false); disconnect(); }} className="w-full px-3 py-2 text-left text-sm hover:bg-parchment">
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
