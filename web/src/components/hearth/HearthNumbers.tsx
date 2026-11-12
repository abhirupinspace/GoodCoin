"use client";
import { Skeleton, Stat, Term } from "@/components/ui";
import { compact, floorFmt, nearFmt } from "@/lib/format";
import { useHearth } from "@/lib/useQueries";

export function HearthNumbers({ light = false }: { light?: boolean }) {
  const { data, error } = useHearth();
  if (error) return <p className="text-sm text-red">Hearth unavailable: {String(error)}</p>;
  if (!data) return <Skeleton className="h-24 w-full" />;
  return (
    <div className="grid gap-8 sm:grid-cols-3">
      <Stat light={light} label="NEAR in the Hearth" value={nearFmt(data.hearth, 3)} />
      <Stat light={light} label={<Term def="All GOOD the Hearth stands behind: circulating GOOD, GOOD earmarked for givers who haven't claimed yet, and a locked seed nobody owns.">Backed GOOD</Term>} value={compact(data.backed)} />
      <Stat light={light} label={<Term def="NEAR per GOOD that anyone can redeem at any time: Hearth ÷ backed GOOD. It never decreases. It is denominated in NEAR and is not a market price.">Backing floor</Term>} value={floorFmt(data.floor_yocto_per_good)} hint="NEAR per GOOD — not a price guarantee" />
    </div>
  );
}
