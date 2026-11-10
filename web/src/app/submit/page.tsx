import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { Submit } from "@/views/Submit";

export const metadata: Metadata = { title: "Submit a good deed" };

/** Suspense: Submit reads ?challenge= via useSearchParams, which is only known at request time. */
export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Submit />
    </Suspense>
  );
}
