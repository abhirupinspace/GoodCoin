import type { Metadata } from "next";
import { Outline } from "@/components/shared/Outline";

export const metadata: Metadata = { title: "FAQ" };

export default function Page() {
  return (
    <Outline
      title="FAQ"
      purpose="Answers grouped by topic."

      sections={[
  {
    "title": "Getting started"
  },
  {
    "title": "Giving and refunds",
    "notes": "Record fee, refunds after a smother, gifts locked until settlement."
  },
  {
    "title": "GOOD token"
  },
  {
    "title": "The Hearth",
    "notes": "Floor, redemption, why it never goes down (in NEAR)."
  },
  {
    "title": "Kindle"
  },
  {
    "title": "Referrals",
    "notes": "Exact first-ever-gift rules."
  },
  {
    "title": "Security",
    "notes": "No keys, invariants, honest limits."
  },
  {
    "title": "Causes and public goods",
    "notes": "Curated Sputnik DAOs, rotation, dead-cause carry, the Good Wall."
  }
]}
    />
  );
}
