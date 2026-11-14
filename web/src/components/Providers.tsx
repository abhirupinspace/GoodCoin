"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { LiveProvider } from "@/components/live/Live";
import { NearProvider } from "@/components/wallet/NearProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { FireProvider } from "@/lib/fire-context";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } }));
  return (
    <QueryClientProvider client={client}>
      <FireProvider>
        <LiveProvider>
          <ToastProvider>
            <NearProvider>{children}</NearProvider>
          </ToastProvider>
        </LiveProvider>
      </FireProvider>
    </QueryClientProvider>
  );
}
