import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { ChallengeDetail } from "@/views/ChallengeDetail";

export const metadata: Metadata = { title: "Challenge" };

export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <ChallengeDetail />
    </Suspense>
  );
}
