import type { Metadata } from "next";
import { Outline } from "@/components/shared/Outline";

export const metadata: Metadata = { title: "Claim" };

export default function Page() {
  return (
    <Outline
      title="Claim"
      purpose="Claim GOOD from caught fires and NEAR from smothered ones."
      wallet="required"
      sections={[
  {
    "title": "Claimable weeks",
    "data": [
      "events: fire_gift (your weeks)",
      "get_gift",
      "get_fire"
    ]
  },
  {
    "title": "Claim",
    "notes": "Attach storage deposit if not registered.",
    "data": [
      "action: claim"
    ]
  }
]}
    />
  );
}
