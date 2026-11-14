"use client";
// The live ledger: every gift, catch, smother, kindle, claim, redeem and new fire, as the chain records it.
import Link from "next/link";
import { useEffect, useState } from "react";
import { txUrl } from "@/lib/config";
import { nearFmt, goodFmt, shortAccount } from "@/lib/format";
import type { FeedRow } from "@/lib/live-types";
import { LiveDot, useLive } from "./Live";

type D = Record<string, unknown>;
const s = (v: unknown) => String(v ?? "");

function describe(r: FeedRow): { tone: "ember" | "red" | "mute"; text: string } {
  const d = (Array.isArray(r.data) ? r.data[0] : r.data) as D;
  switch (r.event) {
    case "fire_gift": return { tone: "ember", text: `${shortAccount(s(d.giver))} threw ${nearFmt(s(d.amount))} into fire #${s(d.week)}` };
    case "fire_caught": return { tone: "ember", text: `Fire #${s(d.week)} caught: ${s(d.givers)} givers, ${nearFmt(s(d.total))}, ${goodFmt(s(d.minted))} minted` };
    case "fire_smothered": return { tone: "mute", text: `Fire #${s(d.week)} smothered: ${goodFmt(s(d.allowance_destroyed))} burned from max supply` };
    case "kindled": return { tone: "red", text: `${shortAccount(s(d.burner))} kindled fire #${s(d.week)}, goal now ${s(d.goal)}` };
    case "payout": return { tone: "ember", text: `Fire #${s(d.week)} paid ${nearFmt(s(d.amount))} to ${shortAccount(s(d.cause))} (${s(d.status)})` };
    case "claimed_good": return { tone: "ember", text: `${shortAccount(s(d.account))} claimed ${goodFmt(s(d.amount))}` };
    case "claimed_near": return { tone: "mute", text: `${shortAccount(s(d.account))} reclaimed ${nearFmt(s(d.amount))}` };
    case "redeemed": return { tone: "mute", text: `${shortAccount(s(d.account))} redeemed ${goodFmt(s(d.good))} for ${nearFmt(s(d.near), 4)}` };
    case "cause_dead": return { tone: "mute", text: `Cause ${shortAccount(s(d.cause))} can no longer receive; its NEAR carries forward` };
    case "fire_created": return { tone: "red", text: `${shortAccount(s(d.creator))} lit a new fire: ${s(d.label)}` };
    case "closed": return { tone: "mute", text: `Fire #${s(d.week)} closed; unclaimed GOOD cancelled` };
    case "report": return { tone: "mute", text: `${shortAccount(s(d.cause))} published a report for fire #${s(d.week)}` };
    default: return { tone: "mute", text: r.event };
  }
}

function ago(d: Date, now: number) {
  const sec = Math.max(0, Math.round((now - d.valueOf()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export function LiveFeed({ fire = null, limit = 12, title = "Live ledger" }: { fire?: string | null; limit?: number; title?: string }) {
  const { data, status } = useLive<FeedRow>("feed", fire);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(t);
  }, []);
  if (status === "off") return null;
  return (
    <section className="frame bg-surface">
      <header className="flex items-center justify-between border-b border-line px-5 py-3">
        <p className="meta text-ink">{title}</p>
        <LiveDot />
      </header>
      {data === undefined ? (
        <p className="px-5 py-6 text-sm text-mute">Connecting to the ledger…</p>
      ) : data.length === 0 ? (
        <p className="px-5 py-6 text-sm text-mute">No events yet.</p>
      ) : (
        <ol className="divide-y divide-line">
          {data.slice(0, limit).map((r) => {
            const { tone, text } = describe(r);
            return (
              <li key={`${r.receipt_id}:${r.idx}`} className="stamp-in grid grid-cols-[auto_1fr_auto] items-baseline gap-3 px-5 py-3 text-sm">
                <span className={`mt-1.5 size-1.5 ${tone === "ember" ? "bg-ember" : tone === "red" ? "bg-red" : "bg-mute"}`} aria-hidden />
                <span className="text-ink/90">
                  {text}
                  {!fire && (
                    <Link href={`/fires/${encodeURIComponent(r.contract)}`} className="ml-2 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-mute hover:text-ember">
                      {shortAccount(r.contract, 18)}
                    </Link>
                  )}
                </span>
                {r.tx_hash ? (
                  <a href={txUrl(r.tx_hash)} target="_blank" rel="noreferrer" className="font-mono text-[0.68rem] text-mute hover:text-ember">{ago(r.ts, now)} ↗</a>
                ) : (
                  <span className="font-mono text-[0.68rem] text-mute">{ago(r.ts, now)}</span>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
