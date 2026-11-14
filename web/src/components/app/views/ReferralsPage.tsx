"use client";
import { useSyncExternalStore } from "react";
import { HandsEmber } from "@/components/art";
import { CopyButton, Notice, Stat } from "@/components/ui";
import { Card, ContractLabel, IndexedLabel, Loading, PageHeader, QueryError, RequireWallet } from "@/components/app/shell";
import { txUrl } from "@/lib/config";
import { dateFromNs, nearFmt, shortAccount } from "@/lib/format";
import { bounty } from "@/lib/protocol";
import { useAccount, useConfig, useTxns } from "@/lib/useQueries";

const noop = () => () => {};

function LinkBox({ accountId }: { accountId: string }) {
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => null);
  const canShare = useSyncExternalStore(noop, () => typeof navigator.share === "function", () => false);
  if (!origin) return <Loading rows={1} />;
  const link = `${origin}/app?ref=${encodeURIComponent(accountId)}`;
  return (
    <div>
      <label htmlFor="ref-link" className="eyebrow">Your link</label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input id="ref-link" readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="num h-10 min-w-0 flex-1 border-2 border-line bg-paper px-3 text-sm outline-none focus:border-ember" />
        <div className="flex gap-2">
          <CopyButton text={link} label="Copy link" />
          {canShare && (
            <button
              type="button"
              className="eyebrow h-10 border-2 border-line bg-charcoal px-4 text-ink hover:bg-burnt"
              onClick={() => navigator.share({ title: "Join this week's GOODCOIN fire", text: "One cause, one fire this week. Throw in NEAR with me.", url: link }).catch(() => {})}
            >
              Share
            </button>
          )}
        </div>
      </div>
      <p className="mt-2 text-xs text-ink/60">The link pre-fills your account in the friend&apos;s gift form. They can change or clear it.</p>
    </div>
  );
}

function Rules() {
  const { data: cfg } = useConfig();
  const min = cfg ? BigInt(cfg.min_gift) : null;
  const maxMove = cfg && min ? bounty(min * 2n, min, BigInt(cfg.bounty_bps)) : null; // capped at 1.5 min gifts
  return (
    <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
      <li>Only a friend&apos;s <strong>first-ever gift</strong> can name a spark. Later gifts and top-ups don&apos;t count.</li>
      <li>You must have <strong>already given in that same fire</strong> before they do.</li>
      <li>
        {cfg ? `${cfg.bounty_bps / 100}%` : "A quarter"} of their first-gift weight, counted up to 1.5 minimum gifts
        {maxMove !== null && <> (at most <strong className="num">{nearFmt(maxMove, 3)}</strong> of weight)</>}, <strong>moves</strong> to you. That weight earns its share of the fire&apos;s GOOD if it catches.
      </li>
      <li>The weight comes out of the newcomer&apos;s share, not anyone else&apos;s, so total weight is unchanged and sparking yourself with fresh accounts gains nothing.</li>
      <li><strong>Clicks earn nothing.</strong> Only a real first gift in a fire you are in. If the fire smothers, there is no GOOD to share, but the newcomer&apos;s first gift is still used up.</li>
    </ol>
  );
}

function Stats({ accountId }: { accountId: string }) {
  const { data, error } = useAccount(accountId);
  if (error) return <QueryError what="Your profile" error={error} />;
  if (!data) return <Loading rows={2} />;
  const p = data.profile;
  if (!p) return <Notice tone="empty" title="Give first">Your profile starts with your first gift. You can only spark a friend in a fire you have already joined.</Notice>;
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <Stat label="People you brought" value={p.sparks} hint="newcomers whose bounty moved to you" />
      <Stat label="Bounty weight received" value={nearFmt(p.bounty_weight, 3)} hint="weight, counted like NEAR given" />
    </div>
  );
}

function Named({ accountId }: { accountId: string }) {
  const { data, error, isLoading } = useTxns(accountId);
  if (isLoading) return <Loading rows={2} />;
  if (error) return <QueryError what="Indexed transactions" error={error} />;
  const rows = (data?.txns ?? []).filter((t) => t.method === "give" && typeof t.args?.sparked_by === "string" && t.args.sparked_by);
  return (
    <div className="space-y-3">
      <IndexedLabel stale={data?.stale} error={data?.error} />
      {data?.error && !data.txns.length ? (
        <Notice tone="error" title="The indexer is unavailable">{data.error}</Notice>
      ) : rows.length === 0 ? (
        <p className="text-sm text-ink/70">None of your indexed gifts named a spark.</p>
      ) : (
        <ul className="divide-y divide-line text-sm">
          {rows.map((t) => (
            <li key={t.hash} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>Named <strong>{shortAccount(String(t.args!.sparked_by), 30)}</strong> in fire №{String(t.args?.week ?? "?")} <span className="text-ink/60">· {dateFromNs(t.timestamp_ns)}</span></span>
              <a href={txUrl(t.hash)} target="_blank" rel="noreferrer" className="underline underline-offset-2">Explorer ↗</a>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-ink/60">Only the first-ever gift&apos;s spark is recorded by the contract; later names are ignored.</p>
    </div>
  );
}

export function ReferralsPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="Bring a friend" title="Referrals" intro="Good spreads person to person. Bring someone into a fire you're already in, and part of their first share passes to you." aside={<HandsEmber className="hidden h-28 w-40 md:block" />} />
      <RequireWallet what="Your referral link is built from your account name.">
        {(a) => (
          <div className="space-y-8">
            <Card eyebrow="Share" title="Your spark link"><LinkBox accountId={a} /></Card>
            <div className="grid gap-8 lg:grid-cols-2">
              <Card eyebrow="The exact rule" title="How a spark counts"><Rules /></Card>
              <div className="space-y-8">
                <Card eyebrow="get_account.profile" title="Your sparks">
                  <div className="space-y-5">
                  <Stats accountId={a} />
                  <Notice tone="empty" title="Who you brought needs the indexer">
                    A newcomer&apos;s gift is their transaction, not yours, so listing them per person needs a contract-wide event index (fire_gift.sparked_by) that doesn&apos;t exist yet. The count above is from the contract.
                  </Notice>
                  </div>
                  <ContractLabel>sparks and bounty_weight are contract state</ContractLabel>
                </Card>
                <Card eyebrow="Your own gifts" title="Sparks you named"><Named accountId={a} /></Card>
              </div>
            </div>
          </div>
        )}
      </RequireWallet>
    </div>
  );
}
