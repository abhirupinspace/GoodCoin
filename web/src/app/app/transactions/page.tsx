import type { Metadata } from "next";
import { Outline } from "@/components/shared/Outline";

export const metadata: Metadata = { title: "Transactions" };

export default function Page() {
  return (
    <Outline
      title="Transactions"
      purpose="Every action you took, with explorer links."
      wallet="required"
      sections={[
  {
    "title": "Timeline",
    "notes": "Gifts, GOOD claims, NEAR refunds, redemptions, kindle burns, spark-attributed gifts.",
    "data": [
      "events: fire_gift, claimed_good, claimed_near, redeemed, kindled"
    ]
  }
]}
    />
  );
}
