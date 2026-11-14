"use client";
import { Button, Notice } from "@/components/ui";
import { IndexedLabel, Loading, PageHeader, Pill, QueryError, RequireWallet } from "@/components/app/shell";
import { indexedYocto } from "@/components/app/data";
import { accountUrl, txUrl } from "@/lib/config";
import { dateFromNs, goodFmt, nearFmt, shortAccount } from "@/lib/format";
import { useTxns, type TxRow } from "@/lib/useQueries";

const isAmount = (v: unknown): v is string => typeof v === "string" && /^\d+$/.test(v);

/** Human summary of known GOODCOIN method args; falls back to compact JSON. */
function summary(t: TxRow): string {
  const a = t.args ?? {};
  switch (t.method) {
    case "give": return `fire №${String(a.week ?? "?")}, cause #${String(a.cause ?? "?")}${a.sparked_by ? `, spark ${shortAccount(String(a.sparked_by), 24)}` : ""}`;
    case "claim": return Array.isArray(a.weeks) ? `fires ${a.weeks.map((w) => `№${String(w)}`).join(", ")}` : "n/a";
    case "kindle": case "payout": case "close": return `fire №${String(a.week ?? "?")}`;
    case "redeem": return isAmount(a.amount) ? goodFmt(a.amount, 2) : "n/a";
    case "settle": return "settle ended fires";
    default: {
      const s = t.args ? JSON.stringify(t.args) : "n/a";
      return s.length > 80 ? `${s.slice(0, 80)}…` : s;
    }
  }
}

function Row({ t }: { t: TxRow }) {
  const dep = indexedYocto(t.deposit);
  return (
    <tr className="border-b border-line align-top">
      <td className="py-2.5 pr-3 text-xs text-ink/70 whitespace-nowrap">{dateFromNs(t.timestamp_ns)}</td>
      <td className="py-2.5 pr-3"><span className="display text-xl">{t.method ?? "unknown"}</span></td>
      <td className="py-2.5 pr-3 text-sm">{summary(t)}{t.signer !== t.receiver && <span className="block text-xs text-ink/50">signer {shortAccount(t.signer, 24)}</span>}</td>
      <td className="num py-2.5 pr-3 text-right text-sm whitespace-nowrap">{dep.value === 0n ? "none" : `${dep.approx ? "≈ " : ""}${nearFmt(dep.value, 4)}`}</td>
      <td className="py-2.5 pr-3">{t.success === false ? <Pill tone="red">Failed</Pill> : t.success ? <Pill tone="forest">Success</Pill> : <Pill tone="muted">Unknown</Pill>}</td>
      <td className="py-2.5 text-right"><a href={txUrl(t.hash)} target="_blank" rel="noreferrer" className="text-sm underline underline-offset-2" aria-label={`Transaction ${t.hash} on the explorer`}>{t.hash.slice(0, 8)}… ↗</a></td>
    </tr>
  );
}

function List({ accountId }: { accountId: string }) {
  const { data, error, isLoading, refetch, isFetching } = useTxns(accountId);
  if (isLoading) return <Loading rows={6} />;
  if (error) return <QueryError what="Transactions" error={error} />;
  const txns = [...(data?.txns ?? [])].sort((a, b) => { const x = BigInt(a.timestamp_ns), y = BigInt(b.timestamp_ns); return x > y ? -1 : x < y ? 1 : 0; });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <IndexedLabel stale={data?.stale} error={data?.error} className="flex-1" />
        <Button tone="outline" onClick={() => refetch()} disabled={isFetching}>{isFetching ? "Refreshing…" : "Refresh"}</Button>
      </div>
      {data?.error && txns.length === 0 ? (
        <Notice tone="error" title={/rate limit/i.test(data.error) ? "NearBlocks is rate-limiting us" : "The indexer is unavailable"}>
          {data.error}. Try again in a minute, or see every transaction on <a href={accountUrl(accountId)} target="_blank" rel="noreferrer" className="underline">the explorer ↗</a>. Your balances and claims are read from the contract and are unaffected.
        </Notice>
      ) : txns.length === 0 ? (
        <Notice tone="empty" title="No transactions yet">Nothing from this account to the GOODCOIN contract appears in its latest indexed transactions.</Notice>
      ) : (
        <div className="frame overflow-x-auto bg-paper p-3 sm:p-4">
          <table className="w-full min-w-[720px] text-left">
            <thead className="eyebrow border-b-2 border-line text-ink/60">
              <tr><th className="py-2 pr-3">Time</th><th className="py-2 pr-3">Method</th><th className="py-2 pr-3">Details</th><th className="py-2 pr-3 text-right">Deposit</th><th className="py-2 pr-3">Status</th><th className="py-2 text-right">Tx</th></tr>
            </thead>
            <tbody>{txns.map((t) => <Row key={t.hash} t={t} />)}</tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-ink/60">Deposits marked ≈ were returned by the indexer as floating-point numbers and may be off in the last digits.</p>
    </div>
  );
}

export function TransactionsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Indexed record" title="Transactions" intro="Your calls to the GOODCOIN contract, newest first." />
      <RequireWallet what="Transactions lists your calls to the contract.">{(a) => <List accountId={a} />}</RequireWallet>
    </div>
  );
}
