import type { Metadata } from "next";
import { Outline } from "@/components/shared/Outline";

export const metadata: Metadata = { title: "Redeem" };

export default function Page() {
  return (
    <Outline
      title="Redeem"
      purpose="Swap GOOD for its share of the Hearth."
      wallet="required"
      sections={[
  {
    "title": "Amount and estimate",
    "notes": "⌊a·H/B⌋ NEAR; floor unchanged.",
    "data": [
      "ft_balance_of",
      "get_hearth"
    ]
  },
  {
    "title": "Redeem",
    "data": [
      "action: redeem"
    ]
  }
]}
    />
  );
}
