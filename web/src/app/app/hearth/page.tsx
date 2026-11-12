import type { Metadata } from "next";
import { Outline } from "@/components/shared/Outline";

export const metadata: Metadata = { title: "The Hearth" };

export default function Page() {
  return (
    <Outline
      title="The Hearth"
      purpose="Public analytics of the Hearth and supply."
      wallet="none"
      sections={[
  {
    "title": "Hearth NEAR, backed GOOD, floor, high-water mark",
    "data": [
      "get_hearth"
    ]
  },
  {
    "title": "Historical floor chart",
    "data": [
      "events: fire_caught (floor_h, floor_b)"
    ]
  },
  {
    "title": "Supply",
    "notes": "Total minted, earmarked, burned, max supply, headroom.",
    "data": [
      "get_supply"
    ]
  },
  {
    "title": "Supply reduction history",
    "data": [
      "list_fires (Smothered → allowance)",
      "events: closed"
    ]
  },
  {
    "title": "Invariants",
    "data": [
      "check_invariants"
    ]
  }
]}
    />
  );
}
