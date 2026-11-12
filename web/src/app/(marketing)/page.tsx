import type { Metadata } from "next";
import { Outline } from "@/components/shared/Outline";

export const metadata: Metadata = { title: "Make good contagious." };

export default function Page() {
  return (
    <Outline
      title="Make good contagious."
      purpose="Introduce GOODCOIN and convert visitors. One dominant CTA: Explore the current fire (/app)."

      sections={[
  {
    "title": "Hero",
    "notes": "Make good contagious. Memecoins coordinate millions… to buy. GOODCOIN coordinates them to give together. CTA → /app."
  },
  {
    "title": "This week's fire (live)",
    "notes": "Cause, givers / goal, total NEAR, countdown, rescue-window badge; links to /app.",
    "data": [
      "current_fire",
      "get_stats.streak"
    ]
  },
  {
    "title": "What is GOODCOIN?",
    "notes": "Three rules: Give together · Get GOOD · Bring a friend."
  },
  {
    "title": "How it works: Give → Catch → Get GOOD",
    "notes": "Caught: 90% to the cause DAO, 10% to the Hearth, GOOD to givers. Smothered: gifts refunded, that week's GOOD never exists."
  },
  {
    "title": "The Hearth and the floor",
    "notes": "Floor = Hearth NEAR ÷ backed GOOD; new GOOD costs ≥ 1.25× the floor; the floor never goes down (in NEAR).",
    "data": [
      "get_hearth",
      "check_invariants.floor_never_decreased"
    ]
  },
  {
    "title": "Previous fires that caught",
    "data": [
      "list_fires (outcome = Caught)"
    ]
  },
  {
    "title": "Good Wall preview",
    "notes": "Latest cause reports and outcomes.",
    "data": [
      "list_fires",
      "get_report"
    ]
  },
  {
    "title": "Trust and transparency",
    "notes": "No premine, no team allocation, no admin key (list-keys empty), on-chain invariants, live E2E evidence.",
    "data": [
      "check_invariants",
      "get_config"
    ]
  },
  {
    "title": "Final CTA",
    "notes": "Join this week's fire → /app."
  }
]}
    />
  );
}
