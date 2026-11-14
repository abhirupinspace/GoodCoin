"use client";
// Neon Realtime in the browser. One WebSocket for the whole app (LiveProvider); useLive() subscribes to a
// whitelisted live query sealed by /api/live and renews it before it expires. LiveBridge turns every change
// to the selected fire (snapshot or event) into a react-query refresh, so every contract-backed view on the
// site updates the moment the chain does. Without NEXT_PUBLIC_NEON_REALTIME_URL the site runs on polling.
import {
  createRealtimeClient, type MaterializedLiveQuerySubscription, type RealtimeClient, type SealedLiveQuery,
} from "@neon/realtime/client";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useFireId } from "@/lib/fire-context";
import type { FeedRow, LiveName, SnapshotRow } from "@/lib/live-types";

export type LiveStatus = "off" | "connecting" | "live" | "stale" | "error" | "closed";

const ClientContext = createContext<RealtimeClient | null>(null);
const StatusContext = createContext<LiveStatus>("off");

const RENEW_EARLY_MS = 10_000;
const RETRY_MS = 1_000;

async function fetchSealed<T>(name: LiveName, fire: string | null): Promise<SealedLiveQuery<T>> {
  const r = await fetch("/api/live", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, fire }),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`live ${name}: ${r.status}`);
  return (await r.json()) as SealedLiveQuery<T>;
}

/** Rows of a live query and its status. `data` is undefined until the first result. */
export function useLive<T>(name: LiveName, fire: string | null, enabled = true): { data: readonly T[] | undefined; status: LiveStatus } {
  const client = useContext(ClientContext);
  const [state, setState] = useState<{ key: string; data: readonly T[] | undefined; status: LiveStatus }>({
    key: "",
    data: undefined,
    status: client ? "connecting" : "off",
  });
  const key = `${name}:${fire ?? ""}`;

  useEffect(() => {
    if (!client || !enabled) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let sub: MaterializedLiveQuerySubscription<T> | undefined;

    const schedule = (expiresAt: number, renew: () => void) => {
      clearTimeout(timer);
      if (!stopped) timer = setTimeout(renew, Math.max(0, expiresAt - Date.now() - RENEW_EARLY_MS));
    };
    const renew = async () => {
      if (stopped || !sub) return;
      try {
        const next = await fetchSealed<T>(name, fire);
        schedule(next.expiresAt, renew);
        sub.renew(next).catch(() => clearTimeout(timer));
      } catch {
        timer = setTimeout(renew, RETRY_MS);
      }
    };

    fetchSealed<T>(name, fire)
      .then((sealed) => {
        if (stopped) return;
        sub = client.subscribe<T>(sealed);
        sub.onChange((snap) => setState({ key, data: snap.data, status: snap.status }));
        schedule(sealed.expiresAt, renew);
      })
      .catch(() => !stopped && setState({ key, data: undefined, status: "error" }));

    return () => {
      stopped = true;
      clearTimeout(timer);
      sub?.unsubscribe();
    };
  }, [client, name, fire, key, enabled]);

  if (!client || !enabled) return { data: undefined, status: "off" };
  return state.key === key ? { data: state.data, status: state.status } : { data: undefined, status: "connecting" };
}

function LiveBridge({ children }: { children: ReactNode }) {
  const fire = useFireId();
  const qc = useQueryClient();
  const snap = useLive<SnapshotRow>("snapshot", fire);
  const feed = useLive<FeedRow>("feed", fire);
  const signature = snap.data && feed.data
    ? `${fire}|${snap.data[0]?.updated_at?.valueOf() ?? 0}|${feed.data[0]?.receipt_id ?? ""}:${feed.data[0]?.idx ?? ""}`
    : null;
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (signature === null) return;
    const prev = last.current;
    last.current = signature;
    // First result for this fire is the baseline; refresh only on real changes after it.
    if (prev === null || prev.split("|")[0] !== fire) return;
    const t = setTimeout(() => qc.invalidateQueries({ queryKey: [fire] }), 250);
    return () => clearTimeout(t);
  }, [signature, fire, qc]);

  const status: LiveStatus = snap.status === "live" && feed.status === "live" ? "live" : snap.status === "off" ? "off" : snap.status;
  return <StatusContext.Provider value={status}>{children}</StatusContext.Provider>;
}

export function LiveProvider({ children }: { children: ReactNode }) {
  // Created after hydration so server and first client render agree (both start without a connection).
  const [client, setClient] = useState<RealtimeClient | null>(null);
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_NEON_REALTIME_URL;
    if (!url) return;
    const c = createRealtimeClient({
      url,
      logLevel: "warn",
      logger: (e) => console.warn(`[realtime] ${e.event}: ${e.message} ${JSON.stringify(e)}`),
    });
    setClient(c);
    return () => c.close();
  }, []);
  return (
    <ClientContext.Provider value={client}>
      <LiveBridge>{children}</LiveBridge>
    </ClientContext.Provider>
  );
}

export const useLiveStatus = () => useContext(StatusContext);

/** Small status pill: LIVE when the realtime subscription is streaming. */
export function LiveDot({ className = "" }: { className?: string }) {
  const status = useLiveStatus();
  const live = status === "live";
  const label = live ? "Live" : status === "off" ? "Polling" : status === "error" ? "Polling" : "Connecting";
  return (
    <span className={`meta inline-flex items-center gap-2 ${live ? "text-ink" : "text-mute"} ${className}`} title={`Realtime: ${status}`}>
      <span className={`relative inline-block h-2 w-2 rounded-full ${live ? "bg-red" : "bg-mute"}`}>
        {live && <span className="absolute inset-0 animate-ping rounded-full bg-red opacity-60" />}
      </span>
      {label}
    </span>
  );
}
