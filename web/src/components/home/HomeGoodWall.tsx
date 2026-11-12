"use client";
import { FireCard } from "@/components/fire/FireCard";
import { Notice, Skeleton } from "@/components/ui";
import { useFires } from "@/lib/useQueries";

/** The six most recent settled fires (caught or smothered) that had at least one giver. */
export function HomeGoodWall() {
  const { data, error } = useFires("0");
  if (error) return <Notice tone="error" title="The archive can't be read right now">{String(error)}</Notice>;
  if (!data) return <div className="grid gap-6 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-56 w-full" />)}</div>;
  const recent = data.filter((f) => f.outcome !== "Open" && f.givers > 0).reverse().slice(0, 6);
  if (!recent.length) return <Notice tone="empty" title="No fires on the record yet">The first fire is still burning.</Notice>;
  return <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{recent.map((f) => <FireCard key={f.week} fire={f} />)}</div>;
}
