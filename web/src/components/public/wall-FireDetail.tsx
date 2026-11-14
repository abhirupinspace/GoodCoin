"use client";
// One fire on the record. Contract-verified facts are kept apart from the cause's own claims.
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Plate } from "@/components/brand";
import { shotForWeek } from "@/components/brand/assets";
import { Button, CopyButton, Notice, OutcomeStamp, Skeleton, Stamp, Term } from "@/components/ui";
import { CONTRACT, accountUrl } from "@/lib/config";
import { compact, dateFromNs, goodFmt, nearFmt } from "@/lib/format";
import { useCauses, useConfig, useFire, useReport, useStats } from "@/lib/useQueries";
import type { FireView, PayoutStatus } from "@/types/contract";
import { Ledger } from "./Page";
import { hearthFee, toCause } from "./useAllFires";

const PAYOUT: Record<PayoutStatus, { label: string; tone: "forest" | "ember" | "red" | "ink"; text: string }> = {
  None: { label: "No payout", tone: "ink", text: "No payout exists for this fire." },
  Due: { label: "Due", tone: "ember", text: "The fire caught and its payout is due. Anyone can call payout to send it." },
  Sending: { label: "Sending", tone: "ember", text: "The transfer to the cause is in flight; the callback will mark it Paid or Carried." },
  Paid: { label: "Paid", tone: "forest", text: "The 90% was transferred to the cause account." },
  Carried: { label: "Carried", tone: "red", text: "The cause account could not receive it (a failed transfer marks a cause dead forever), so this NEAR was carried to the next fire that catches." },
};

type Phase = "future" | "burning" | "unsettled" | "settled";

export function WallFireDetail({ week }: { week: string }) {
  const stats = useStats();
  const config = useConfig();
  const causes = useCauses();
  const fire = useFire(week);
  const report = useReport(week);

  if (stats.error || fire.error) {
    return <Wrap><Notice tone="error" title="This fire can't be read right now">{String(stats.error ?? fire.error)}</Notice></Wrap>;
  }
  if (!stats.data || !fire.data || !config.data) {
    return (
      <Wrap>
        <div className="space-y-6" aria-busy><Skeleton className="h-28 w-2/3" /><Skeleton className="h-64 w-full" /><Skeleton className="h-40 w-full" /></div>
      </Wrap>
    );
  }

  const f = fire.data;
  const s = stats.data;
  const w = BigInt(week);
  const now = BigInt(s.now_ns);
  const phase: Phase = w > BigInt(s.current_week) ? "future"
    : f.outcome !== "Open" ? "settled"
    : now < BigInt(f.end_ns) ? "burning" : "unsettled";

  if (phase === "future") {
    return (
      <Wrap>
        <Header f={f} stamp={<Stamp tone="ink">Not lit yet</Stamp>} />
        <div className="mt-10 max-w-2xl">
          <Notice tone="empty" title={`Fire №${week} has not been lit yet`}>
            It opens on {dateFromNs(f.start_ns)}, on the contract&apos;s fixed schedule. Its cause, goal and allowance are pinned only when the fire before it settles, so nothing about it is shown here yet.
          </Notice>
          <div className="mt-6 flex flex-wrap gap-3"><Button href="/app">See this week&apos;s fire</Button><Button href="/good-wall" tone="outline">Back to the Good Wall</Button></div>
        </div>
      </Wrap>
    );
  }

  const feeBps = config.data.fee_bps;
  const caught = f.outcome === "Caught";
  const cause = causes.data?.[f.cause];
  const fee = caught ? hearthFee(f.total, feeBps) : 0n;
  const pay = caught ? toCause(f.total, feeBps) : 0n;
  const p = PAYOUT[f.payout];
  const stamp = phase === "unsettled" ? <Stamp tone="ember">Awaiting settlement</Stamp> : <OutcomeStamp outcome={f.outcome} />;

  return (
    <Wrap>
      <Header f={f} stamp={stamp} live={phase === "burning"} />
      {phase === "burning" && (
        <div className="mt-8 max-w-3xl"><Notice title="This fire is still burning">The numbers below are live and provisional. <Link className="underline" href="/app">Join it in the app →</Link></Notice></div>
      )}
      {phase === "unsettled" && (
        <div className="mt-8 max-w-3xl"><Notice title="This fire has ended but is not settled yet">Settlement is permissionless: anyone can settle it from <Link className="underline" href="/app">the app</Link>. Until then its outcome is not final.</Notice></div>
      )}

      <div className="mt-12 grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="min-w-0 space-y-10">
          {/* the numbers */}
          <section aria-labelledby="facts">
            <h2 id="facts" className="display text-4xl text-ink">The record</h2>
            <div className="mt-4">
              <Ledger rows={[
                ["Fire ID", <span key="id">№{f.week}</span>],
                ["Opened", dateFromNs(f.start_ns)],
                ["Closed", dateFromNs(f.end_ns)],
                ["Cause", f.cause_name],
                ["Recipient DAO account", <a key="a" href={accountUrl(f.cause_account)} target="_blank" rel="noreferrer" className="break-all underline underline-offset-2 hover:text-burnt">{f.cause_account} ↗</a>],
                ["Distinct givers / goal", `${f.givers} / ${f.goal}`],
                ["Kindles", f.kindled > 0 ? `${f.kindled} (goal lowered from ${f.base_goal} to ${f.goal})` : "0"],
                ["Total given", nearFmt(f.total, 4)],
                ...(caught ? ([
                  [<Term key="h" def="10% of a caught fire's total, ⌊total·φ⌋, goes into the Hearth, which backs GOOD.">To the Hearth</Term>, nearFmt(fee, 4)],
                  [f.payout === "Paid" ? "Transferred to the cause" : "Owed to the cause (90%)", nearFmt(pay, 4)],
                  ["Payout status", p.label],
                  ["GOOD issued to givers", `${goodFmt(f.minted)} (${compact(f.minted)})`],
                ] as [ReactNode, ReactNode][]) : []),
                ...(f.outcome === "Smothered" ? ([
                  ["Refunds", f.givers > 0 ? "Every gift is refundable in full (record fees are not refunded)" : "Nobody gave"],
                  ["Allowance destroyed", f.givers > 0 ? goodFmt(f.allowance) : "Destroyed (an idle week keeps no record of the amount)"],
                ] as [ReactNode, ReactNode][]) : []),
              ]} />
            </div>
            {caught && (
              <div className="mt-5 flex items-start gap-4 border-2 border-line p-4">
                <Stamp tone={p.tone}>{p.label}</Stamp>
                <p className="text-sm">{p.text}{f.payout === "Carried" && cause?.dead ? " The cause is marked dead in get_causes." : ""}</p>
              </div>
            )}
          </section>

          {/* cause report */}
          <section aria-labelledby="report">
            <h2 id="report" className="display text-4xl">The cause&apos;s report</h2>
            <p className="eyebrow mt-2 text-red">Claim made by the recipient cause, not verified by the protocol</p>
            <div className="mt-4">
              {report.error ? (
                <Notice tone="error" title="The report can't be read right now">{String(report.error)}</Notice>
              ) : report.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : report.data ? (
                <div className="frame bg-paper p-5">
                  <p className="text-sm text-ink/70">Published once by <span className="font-semibold">{report.data.cause}</span> via <code className="font-mono">report(week, uri, sha256)</code>.</p>
                  <p className="mt-3 break-all"><span className="eyebrow mr-2 text-ink/60">URI</span>
                    {/^https?:\/\//.test(report.data.uri)
                      ? <a href={report.data.uri} target="_blank" rel="noreferrer nofollow" className="underline underline-offset-2 hover:text-burnt">{report.data.uri} ↗</a>
                      : <span className="font-mono text-sm">{report.data.uri}</span>}
                  </p>
                  <p className="mt-2 flex flex-wrap items-center gap-3 break-all"><span className="eyebrow text-ink/60">sha256</span><span className="font-mono text-xs">{report.data.sha256}</span><CopyButton text={report.data.sha256} label="Copy hash" /></p>
                  <p className="mt-3 text-xs text-ink/60">The contract stores the URI and hash; it cannot check what the document says. Download it and compare its sha256 to confirm it hasn&apos;t changed.</p>
                </div>
              ) : (
                <Notice tone="empty" title="No report published">
                  {f.payout === "Paid" ? "The cause may publish one report for this fire, once, from its own account." : "Only a cause that was paid can publish a report."}
                </Notice>
              )}
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-10">
          <section aria-labelledby="card">
            <h2 id="card" className="display text-4xl">On-chain fire card</h2>
            <p className="mt-1 text-sm text-ink/70">Rendered by the contract itself (<code className="font-mono">fire_card</code>), from contract state only.</p>
            <FireCardImage week={f.week} />
          </section>

          <section aria-labelledby="evidence" className="paper-dark frame-ember p-5 sm:p-6">
            <h2 id="evidence" className="display text-4xl text-ink">On-chain evidence</h2>
            <p className="eyebrow mt-4 text-mustard">Verified by the contract</p>
            <ul className="mt-2 space-y-1.5 text-sm text-ink/85">
              <li>✓ Givers, goal, kindles and total, recorded by <code className="font-mono">give</code> and <code className="font-mono">kindle</code></li>
              <li>✓ Outcome, fixed once by <code className="font-mono">settle</code> when the week ended</li>
              {caught && <li>✓ Hearth fee, GOOD issued, and payout status ({p.label})</li>}
              {f.payout === "Paid" && <li>✓ The NEAR transfer to {f.cause_account} succeeded</li>}
              <li>✓ The recipient is a fixed, curated cause account</li>
            </ul>
            <p className="eyebrow mt-5 text-mustard">Claimed by the cause, not verified</p>
            <ul className="mt-2 space-y-1.5 text-sm text-ink/85">
              <li>• What the money funded (the report above, if any)</li>
              <li>• The good actually done: the chain verifies a transfer, not impact</li>
            </ul>
            <p className="eyebrow mt-5 text-mustard">Check it yourself</p>
            <p className="mt-2 text-sm text-ink/80">The contract stores no transaction hashes. Every gift, settlement and payout is a transaction on the contract account:</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <a href={accountUrl(CONTRACT)} target="_blank" rel="noreferrer" className="eyebrow border-2 border-line px-3 py-2 hover:bg-paper hover:text-ink">Contract transactions ↗</a>
              <a href={accountUrl(f.cause_account)} target="_blank" rel="noreferrer" className="eyebrow border-2 border-line px-3 py-2 hover:bg-paper hover:text-ink">Cause account ↗</a>
            </div>
            <pre className="mt-4 overflow-x-auto border border-line bg-raised p-3 text-xs text-ink/90"><code>{`near contract call-function as-read-only ${CONTRACT} get_fire json-args '{"week":"${f.week}"}' network-config testnet now`}</code></pre>
          </section>
        </aside>
      </div>

      <div className="mt-16 flex flex-wrap gap-3 border-t border-line pt-8">
        {w > 0n && <Button href={`/good-wall/${w - 1n}`} tone="outline">← Fire №{String(w - 1n)}</Button>}
        {w < BigInt(s.current_week) && <Button href={`/good-wall/${w + 1n}`} tone="outline">Fire №{String(w + 1n)} →</Button>}
        <Button href="/good-wall" tone="dark">All fires</Button>
        <Button href="/app">This week&apos;s fire</Button>
      </div>
    </Wrap>
  );
}

function FireCardImage({ week }: { week: string }) {
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  return (
    <div className="frame relative mt-4 bg-charcoal">
      {state === "loading" && <Skeleton className="absolute inset-0 h-full w-full" />}
      {state === "error"
        ? <div className="p-6"><Notice tone="error" title="The fire card can't be loaded">Try again shortly.</Notice></div>
        : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/fire-card/${week}`} alt={`On-chain fire card for fire №${week}, rendered by the contract`} className="block h-auto w-full"
            onLoad={() => setState("ok")} onError={() => setState("error")} />
        )}
    </div>
  );
}

/** Fire hero: full-bleed, image-led. Caught fires keep their flame in colour; others print in grey. */
function Header({ f, stamp, live = false }: { f: FireView; stamp: ReactNode; live?: boolean }) {
  const caught = f.outcome === "Caught";
  return (
    <header className="relative left-1/2 -mt-14 mb-4 w-screen -translate-x-1/2 overflow-hidden border-b border-line md:-mt-20">
      <Plate shot={shotForWeek(Number(f.week))} treatment={caught || live ? "fire" : "mono"} priority className={`absolute inset-0 md:left-[45%] ${caught || live ? "" : "opacity-50"}`} sizes="60vw" />
      <div className="absolute inset-0 bg-gradient-to-t from-paper via-paper/60 to-transparent md:bg-gradient-to-r md:from-paper md:via-paper/70" aria-hidden />
      <div className="shell relative pb-14 pt-24 md:pb-20 md:pt-32">
        <p className="meta text-mute"><Link href="/good-wall" className="tlink hover:text-ink">Good Wall</Link> <span className="text-red">/</span> Exhibit</p>
        <h1 className="mega mt-6 text-ink">Fire <span className="text-red">{f.week}</span></h1>
        <p className="display mt-4 max-w-3xl text-4xl text-ink sm:text-5xl">{f.cause_name}</p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          {stamp}
          <span className="meta text-mute">{f.givers} / {f.goal} givers</span>
          <span className="meta text-mute">{nearFmt(f.total, 2)} given</span>
        </div>
        {live && <div className="mt-10"><Button href="/app" size="lg">Join this fire <span className="arrow">→</span></Button></div>}
      </div>
    </header>
  );
}

function Wrap({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-20">{children}</div>;
}
