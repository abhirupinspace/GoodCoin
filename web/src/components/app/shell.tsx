"use client";
// App-page primitives: page header, wallet gate, indexed-data label, query state boxes.
import type { ReactNode } from "react";
import { FlameMark } from "@/components/art";
import { AppHero } from "@/components/brand";
import { Notice, Skeleton } from "@/components/ui";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { useNear } from "@/components/wallet/NearProvider";

export function PageHeader({ eyebrow, title, intro, aside }: { eyebrow: ReactNode; title: ReactNode; intro?: ReactNode; aside?: ReactNode }) {
  return <AppHero marker={<>GOODCOIN <span className="text-red">/</span> {eyebrow}</>} title={title} lede={intro} aside={aside} />;
}

/** Renders children only with a connected wallet; otherwise a friendly connect prompt. */
export function RequireWallet({ what, children }: { what: string; children: (accountId: string) => ReactNode }) {
  const { accountId, ready } = useNear();
  if (!ready) return <Loading rows={3} />;
  if (!accountId)
    return (
      <div className="relative mx-auto max-w-xl overflow-hidden border border-line border-t-2 border-t-red bg-parchment p-8 text-center sm:p-12">
        <FlameMark width={36} height={46} className="mx-auto origin-bottom animate-flicker" />
        <p className="display mt-6 text-5xl">Connect a wallet</p>
        <p className="mx-auto mt-4 max-w-md text-mute">
          {what} Connecting only shares your account name with this page; every action still asks your wallet to sign.
        </p>
        <div className="mt-6 flex justify-center"><ConnectButton /></div>
      </div>
    );
  return <>{children(accountId)}</>;
}

/** Marks data that comes from an indexer rather than contract state. */
export function IndexedLabel({ stale, error, className = "" }: { stale?: boolean; error?: string | null; className?: string }) {
  return (
    <div className={`border-l-2 border-mute bg-parchment px-3 py-2 text-xs text-mute ${className}`}>
      <span className="meta mr-2 text-ink">Indexed</span>
      Indexed by NearBlocks; the contract is the source of truth. Shows at most the account&apos;s 50 most recent transactions.
      {stale && <span className="ml-1 font-semibold text-red">Showing cached data{error ? ` (${error})` : ""}.</span>}
    </div>
  );
}

/** Marks data read live from contract views. */
export function ContractLabel({ children }: { children: ReactNode }) {
  return <p className="meta mt-3 text-mute">{children}</p>;
}

export function Loading({ rows = 2 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className={`h-10 ${i % 2 ? "w-2/3" : "w-full"}`} />)}
    </div>
  );
}

export function QueryError({ what, error }: { what: string; error: unknown }) {
  return <Notice tone="error" title={`${what} can't be read right now`}>{error instanceof Error ? error.message : String(error)}</Notice>;
}

export function Card({ title, eyebrow, children, className = "", id }: { title?: ReactNode; eyebrow?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`border border-line bg-parchment p-5 sm:p-7 ${className}`}>
      {eyebrow && <p className="meta text-red">{eyebrow}</p>}
      {title && <h2 className="display mt-2 text-3xl text-ink sm:text-4xl">{title}</h2>}
      <div className={title || eyebrow ? "mt-5" : ""}>{children}</div>
    </section>
  );
}

/** Small status pill for claimed / unclaimed / pending labels. */
export function Pill({ tone = "ink", children }: { tone?: "ink" | "forest" | "red" | "ember" | "muted"; children: ReactNode }) {
  const c = { ink: "border-line text-ink", forest: "border-forest text-forest", red: "border-red text-red", ember: "border-burnt text-burnt", muted: "border-line text-ink/60" }[tone];
  return <span className={`eyebrow inline-block whitespace-nowrap border-2 px-2 py-0.5 ${c}`}>{children}</span>;
}
