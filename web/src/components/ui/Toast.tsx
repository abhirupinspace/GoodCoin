"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { txUrl } from "@/lib/config";

type Kind = "pending" | "success" | "error" | "info";
interface Toast { id: number; kind: Kind; title: string; body?: string; hash?: string | null }

const Ctx = createContext<{ push: (t: Omit<Toast, "id">) => number; update: (id: number, t: Omit<Toast, "id">) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const schedule = useCallback((id: number, kind: Kind) => {
    if (kind !== "pending") setTimeout(() => dismiss(id), kind === "error" ? 12_000 : 7_000);
  }, [dismiss]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((all) => [...all, { ...t, id }]);
    schedule(id, t.kind);
    return id;
  }, [schedule]);
  const update = useCallback((id: number, t: Omit<Toast, "id">) => {
    setToasts((all) => all.map((x) => (x.id === id ? { ...t, id } : x)));
    schedule(id, t.kind);
  }, [schedule]);
  const tone: Record<Kind, string> = {
    pending: "bg-charcoal text-paper",
    success: "bg-forest text-paper",
    error: "bg-red text-paper",
    info: "bg-paper text-ink",
  };
  return (
    <Ctx.Provider value={{ push, update }}>
      {children}
      <div aria-live="polite" className="fixed bottom-20 right-4 z-[60] lg:bottom-4 flex w-[min(92vw,380px)] flex-col gap-3">
        {toasts.map((t) => (
          <div key={t.id} role="status" className={`frame ${tone[t.kind]} p-4`}>
            <div className="flex items-start justify-between gap-3">
              <p className="display text-2xl">{t.title}</p>
              <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-lg leading-none opacity-70 hover:opacity-100">×</button>
            </div>
            {t.body && <p className="mt-1 text-sm opacity-90">{t.body}</p>}
            {t.hash && (
              <a href={txUrl(t.hash)} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm underline underline-offset-2">
                View transaction ↗
              </a>
            )}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast outside ToastProvider");
  return c;
}
