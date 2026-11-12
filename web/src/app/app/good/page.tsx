import type { Metadata } from "next";
import { Outline } from "@/components/shared/Outline";

export const metadata: Metadata = { title: "My GOOD" };

export default function Page() {
  return (
    <Outline
      title="My GOOD"
      purpose="Balance, floor value and what you can claim or redeem."
      wallet="required"
      sections={[
  {
    "title": "GOOD balance",
    "data": [
      "ft_balance_of"
    ]
  },
  {
    "title": "Floor and estimated redemption",
    "notes": "⌊balance·H/B⌋.",
    "data": [
      "get_hearth"
    ]
  },
  {
    "title": "Floor gain since your first gift",
    "data": [
      "get_account.floor_gain_bps"
    ]
  },
  {
    "title": "Claimable GOOD and refunds",
    "data": [
      "events: fire_gift (your weeks)",
      "get_gift",
      "get_fire"
    ]
  },
  {
    "title": "Totals received / burned",
    "data": [
      "events: claimed_good, redeemed, kindled"
    ]
  },
  {
    "title": "Redeem CTA",
    "notes": "→ /app/redeem"
  }
]}
    />
  );
}
