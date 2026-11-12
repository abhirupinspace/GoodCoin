import type { Metadata } from "next";
import { Outline } from "@/components/shared/Outline";

export const metadata: Metadata = { title: "How it works" };

export default function Page() {
  return (
    <Outline
      title="How it works"
      purpose="Explain the weekly mechanism in plain language, with an interactive example."

      sections={[
  {
    "title": "What is a fire?",
    "notes": "One week, one cause (rotating curated DAOs), one goal: N distinct givers.",
    "data": [
      "current_fire",
      "get_causes"
    ]
  },
  {
    "title": "How weekly participation works",
    "notes": "give(week, cause) with ≥ min_gift; first gift each week pays a 0.005 NEAR record fee; gifts are locked until the week ends."
  },
  {
    "title": "When a fire catches",
    "notes": "90% → cause DAO (payout), 10% → Hearth, GOOD minted to givers pro-rata to weight; goal ×1.1."
  },
  {
    "title": "When a fire is smothered",
    "notes": "Every gift refundable (claim); that week's allowance destroyed → max supply shrinks; goal ÷1.1; streak resets."
  },
  {
    "title": "How GOOD is earned",
    "notes": "Share = M·w/Σw where M = min(allowance, ⌊fee·B/(H·1.25)⌋)."
  },
  {
    "title": "What the Hearth does",
    "notes": "Backs every GOOD; floor = H/B; rises on every catch and every burn."
  },
  {
    "title": "How redemption works",
    "notes": "redeem(a) → ⌊a·H/B⌋ NEAR, always open, floor unchanged."
  },
  {
    "title": "What Kindle does",
    "notes": "Last 10% of the week, ≤ ¼ of the goal short: burn one Hearth share of GOOD (doubling) to lower the goal by one; a rescued fire doesn't raise next week's goal.",
    "data": [
      "kindle_quote"
    ]
  },
  {
    "title": "Bring a friend (referrals)",
    "notes": "Only a newcomer's first-ever gift, only if you gave earlier in the same fire: ¼ of their first gift's weight (capped at 1.5 min gifts) moves to you. Clicks earn nothing."
  },
  {
    "title": "Interactive example",
    "notes": "Sliders: givers, gift sizes, Hearth, supply → fee, payout, GOOD minted, shares, new floor. Uses lib/protocol.ts (tested against tests/golden/basic.json)."
  }
]}
    />
  );
}
