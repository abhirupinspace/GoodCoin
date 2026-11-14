import type { Metadata } from "next";
import { Hero } from "@/components/brand";
import { Directory } from "@/components/fires/Directory";
import { LiveFeed } from "@/components/live/LiveFeed";
import { Button } from "@/components/ui";

export const metadata: Metadata = {
  title: "All fires",
  description: "Every GOODCOIN fire, live: the flagship, the demo and every community fire launched through the factory.",
};

export default function FiresPage() {
  return (
    <>
      <Hero
        variant="editorial"
        shot="fire"
        marker={<>Every fire <span className="text-ink/60">/</span> Live from the chain</>}
        lines={["Light one.", "Keep it burning."]}
        lede="Anyone can launch a locked fire for their cause. Same code as the flagship, no keys, no admin."
        actions={<><Button href="/fires/new" size="lg">Light a fire</Button><Button href="/app" size="lg" tone="outline">This week&apos;s fire</Button></>}
      />
      <section className="shell grid gap-10 py-14 md:py-20 xl:grid-cols-[1fr_380px]">
        <Directory />
        <div className="xl:sticky xl:top-24 xl:self-start"><LiveFeed limit={14} /></div>
      </section>
    </>
  );
}
