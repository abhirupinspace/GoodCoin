"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ContractNotDeployedError } from "@/lib/rpc";
import { NearProvider } from "@/near/NearProvider";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5_000,
            retry: (count, error) => !(error instanceof ContractNotDeployedError) && count < 2,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <NearProvider>{children}</NearProvider>
    </QueryClientProvider>
  );
}
