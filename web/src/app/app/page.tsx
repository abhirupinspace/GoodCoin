import type { Metadata } from "next";
import { Outline } from "@/components/shared/Outline";

export const metadata: Metadata = { title: "The Fire" };

export default function Page() {
  return (
    <Outline
      title="The Fire"
      purpose="Primary app screen. Viewable without a wallet; only actions trigger connection."
      wallet="view-without"
      sections={[
  {
    "title": "Current cause",
    "data": [
      "current_fire.cause_name",
      "get_causes"
    ]
  },
  {
    "title": "Givers / goal and total committed NEAR",
    "data": [
      "current_fire.givers",
      "current_fire.goal",
      "current_fire.total"
    ]
  },
  {
    "title": "Time remaining",
    "notes": "Countdown to end_ns; settle_pending banner with a Settle button.",
    "data": [
      "current_fire.end_ns",
      "get_stats.now_ns"
    ]
  },
  {
    "title": "Give",
    "notes": "Amount ≥ min_gift (+ record fee on first gift); ?ref=<account> pre-fills sparked_by.",
    "data": [
      "action: give"
    ]
  },
  {
    "title": "Kindle (rescue window only)",
    "notes": "Shown only when kindle_quote(week) is non-null.",
    "data": [
      "kindle_quote",
      "action: kindle"
    ]
  },
  {
    "title": "Streak",
    "data": [
      "get_stats.streak",
      "get_stats.longest_streak"
    ]
  },
  {
    "title": "Previous fire summary",
    "data": [
      "get_fire(current−1)"
    ]
  },
  {
    "title": "Recent on-chain activity",
    "data": [
      "events: fire_gift, kindled, fire_caught"
    ]
  }
]}
    />
  );
}
