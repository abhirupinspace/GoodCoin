import { Hero } from "@/components/brand";
import type { Metadata } from "next";
import { EndBand } from "@/components/public/Page";
import { WallArchive } from "@/components/public/wall-Archive";
import { Button } from "@/components/ui";

export const metadata: Metadata = {
  title: "Good Wall",
  description: "An archive of collective action: every GOODCOIN fire, caught or smothered, read live from the contract.",
};

export default function GoodWallPage() {
  return (
    <>
      <Hero
        variant="red"
        shot="faces"
        marker={<>The archive <span className="text-ink/60">/</span> Read live from the contract</>}
        lines={["Every fire", "leaves a mark."]}
        lede="Caught or smothered, every fire stays on the record."
      />
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-20">
        <WallArchive />
        <p className="mt-12 max-w-3xl text-sm text-ink/70">
          Outcomes, givers and amounts come from <code className="font-mono">list_fires</code>. A fire that caught but whose payout isn&apos;t <em>Paid</em> has not reached its cause yet. Reports are each cause&apos;s own claim, not verified by the protocol.
        </p>
      </section>
      <EndBand title="Add the next card." body="One fire burns this week. Whether it catches depends on who shows up.">
        <Button href="/app" size="lg">Join this week&apos;s fire</Button>
        <Button href="/how-it-works" size="lg" tone="outline">How it works</Button>
      </EndBand>
    </>
  );
}
