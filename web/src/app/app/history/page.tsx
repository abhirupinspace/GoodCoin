import type { Metadata } from "next";
import { Outline } from "@/components/shared/Outline";

export const metadata: Metadata = { title: "My Fire History" };

export default function Page() {
  return (
    <Outline
      title="My Fire History"
      purpose="Your participation, fire by fire."
      wallet="required"
      sections={[
  {
    "title": "Entries",
    "notes": "Fire #, cause, amount given, outcome, GOOD earned or refund status, spark attribution, tx links.",
    "data": [
      "events: fire_gift",
      "get_gift",
      "get_fire"
    ]
  }
]}
    />
  );
}
