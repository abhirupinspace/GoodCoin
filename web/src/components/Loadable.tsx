"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ContractNotDeployedError } from "@/lib/rpc";
import { Button, Notice, Skeleton } from "./ui";

/** Renders loading skeleton, error with retry, or the data. Every data-backed block goes through this. */
export function Loadable<T>({
  query,
  children,
  skeleton = <Skeleton className="h-24 w-full" />,
}: {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
  skeleton?: ReactNode;
}) {
  if (query.isPending) return <>{skeleton}</>;
  if (query.isError) return <QueryError error={query.error} retry={() => query.refetch()} />;
  return <>{children(query.data)}</>;
}

export function QueryError({ error, retry }: { error: Error; retry?: () => void }) {
  if (error instanceof ContractNotDeployedError) return <Notice tone="warn">{error.message}</Notice>;
  return (
    <Notice tone="bad">
      <span className="mr-2">Could not load from the NEAR RPC: {error.message}</span>
      {retry && (
        <Button onClick={retry} className="mt-2 sm:mt-0">
          Retry
        </Button>
      )}
    </Notice>
  );
}
