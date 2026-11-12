import type { Metadata } from "next";
import { Outline } from "@/components/shared/Outline";

export const metadata: Metadata = { title: "About" };

export default function Page() {
  return (
    <Outline
      title="About"
      purpose="Philosophy, mission and principles — editorial, not corporate."

      sections={[
  {
    "title": "The internet has mastered attention. We want to coordinate action."
  },
  {
    "title": "Why GOODCOIN exists",
    "notes": "Memecoins coordinate millions to buy; giving is lonely; a fire makes showing up visible."
  },
  {
    "title": "Principles",
    "notes": "Fair launch · no admin · the chain checks the money · honest limits · contagion over hype."
  }
]}
    />
  );
}
