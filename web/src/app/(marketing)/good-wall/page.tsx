import type { Metadata } from "next";
import { ArchiveArt } from "@/components/public/art";
import { EndBand, PageHero } from "@/components/public/Page";
import { WallArchive } from "@/components/public/wall-Archive";
import { Button } from "@/components/ui";

export const metadata: Metadata = {
  title: "Good Wall",
  description: "An archive of collective action: every GOODCOIN fire, caught or smothered, read live from the contract.",
};

export default function GoodWallPage() {
  return (
    <>
      <PageHero
        kicker="The archive · read live from the contract"
        title={<>The Good <span className="text-red">Wall.</span></>}
        intro={<p>Every fire stays on the record, the ones we kept alive and the ones that went out. Each card is a public campaign: who it burned for, how many showed up, and where the NEAR went.</p>}
        art={<ArchiveArt className="w-full max-w-sm" />}
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
