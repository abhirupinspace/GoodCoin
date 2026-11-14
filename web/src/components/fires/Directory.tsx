"use client";
// Every fire on GOODCOIN, live: the flagship, the demo and every community fire launched through the factory.
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLive } from "@/components/live/Live";
import { Notice, Skeleton, Stamp } from "@/components/ui";
import { duration, nearFmt, shortAccount } from "@/lib/format";
import type { DirectoryRow } from "@/lib/live-types";

const KIND: Record<DirectoryRow["kind"], string> = { flagship: "Production", demo: "Demo", community: "Community" };

function useDirectory() {
  const live = useLive<DirectoryRow>("directory", null);
  const fallback = useQuery({
    queryKey: ["directory"],
    enabled: live.status === "off" || live.status === "error",
    queryFn: async () => {
      const r = await fetch("/api/fires");
      const j = (await r.json()) as { fires: (Omit<DirectoryRow, "created_at" | "updated_at"> & { created_at: string; updated_at: string })[] };
      return j.fires.map((f) => ({ ...f, created_at: new Date(f.created_at), updated_at: new Date(f.updated_at) })) as DirectoryRow[];
    },
    refetchInterval: 15_000,
  });
  return { data: live.data ?? fallback.data, loading: live.data === undefined && fallback.data === undefined && !fallback.isError };
}

export function Directory() {
  const { data, loading } = useDirectory();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (loading) return <div className="grid gap-px bg-line md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-72 w-full" />)}</div>;
  if (!data || data.length === 0) return <Notice tone="empty" title="No fires indexed yet">The indexer runs every minute.</Notice>;
  return (
    <div className="grid gap-px border border-line bg-line md:grid-cols-2 xl:grid-cols-3">
      {data.map((f) => <FireTile key={f.id} f={f} now={now} />)}
    </div>
  );
}

function FireTile({ f, now }: { f: DirectoryRow; now: number }) {
  const cur = f.current_fire;
  const left = (Number(BigInt(cur.end_ns) / 1_000_000n) - now) / 1000;
  const burning = cur.outcome === "Open" && left > 0;
  const pct = Math.min(100, Math.round((cur.givers / Math.max(1, cur.goal)) * 100));
  const label = f.label.replace(/^community:/, "");
  const cycle = duration(Number(BigInt(f.week_ns) / 1_000_000_000n));
  return (
    <Link href={`/fires/${encodeURIComponent(f.id)}`} className="group flex flex-col gap-6 bg-paper p-6 transition-colors hover:bg-surface">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="meta text-mute">{KIND[f.kind]} · every {cycle}</p>
          <h3 className="display mt-2 truncate text-4xl uppercase leading-none text-ink group-hover:text-ember">{label}</h3>
          <p className="mt-2 truncate font-mono text-xs text-mute">{f.id}</p>
        </div>
        {burning ? <Stamp tone="red"><span className="size-1.5 animate-pulse rounded-full bg-red" aria-hidden />Burning</Stamp> : <Stamp tone="ink">Awaiting settle</Stamp>}
      </div>
      <div>
        <div className="flex items-baseline justify-between">
          <p className="display text-3xl text-ink">{cur.givers} <span className="text-mute">/ {cur.goal}</span></p>
          <p className="meta text-mute">{burning ? duration(left) : "ended"}</p>
        </div>
        <div className="mt-2 h-1 bg-line"><div className="h-1 bg-ember transition-all duration-700" style={{ width: `${pct}%` }} /></div>
        <p className="mt-2 text-sm text-mute">Fire #{cur.week} for <span className="text-ink/85">{cur.cause_name}</span> · {nearFmt(cur.total)}</p>
      </div>
      <dl className="mt-auto grid grid-cols-3 border-t border-line pt-4">
        <div><dt className="meta text-mute">Streak</dt><dd className="display text-2xl text-ink">{f.streak}</dd></div>
        <div><dt className="meta text-mute">Best</dt><dd className="display text-2xl text-ember">{f.longest_streak}</dd></div>
        <div><dt className="meta text-mute">Floor</dt><dd className="display text-2xl text-ink">{f.floor_ratio.toFixed(2)}×</dd></div>
      </dl>
      {f.creator && <p className="-mt-3 text-xs text-mute">Lit by {shortAccount(f.creator)}</p>}
    </Link>
  );
}
