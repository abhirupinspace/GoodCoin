import type { Metadata } from "next";
import { Hero } from "@/components/brand";
import { CreateFire } from "@/components/fires/CreateFire";

export const metadata: Metadata = {
  title: "Light a fire",
  description: "Launch your own locked GOODCOIN fire for a cause: same code as the flagship, no keys, no admin.",
};

export default function NewFirePage() {
  return (
    <>
      <Hero
        variant="minimal"
        marker={<>The factory <span className="text-ink/60">/</span> One transaction</>}
        lines={["Light", "a fire."]}
        lede="Pick a cause, a rhythm and a goal. The factory deploys a locked fire that nobody can change."
      />
      <section className="shell pb-24"><CreateFire /></section>
    </>
  );
}
