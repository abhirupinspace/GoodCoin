import type { Metadata } from "next";
import { Outline } from "@/components/shared/Outline";

export const metadata: Metadata = { title: "Referrals" };

export default function Page() {
  return (
    <Outline
      title="Referrals"
      purpose="Your spark link and who it brought — by the real rules."
      wallet="required"
      sections={[
  {
    "title": "Your link",
    "notes": "/app?ref=<account>; copy/share."
  },
  {
    "title": "How it pays",
    "notes": "Only a newcomer's first-ever gift, only if you gave earlier in the same fire; ¼ of their first gift's weight (cap 1.5 min gifts) moves to you."
  },
  {
    "title": "Successful sparks",
    "data": [
      "get_account.profile.sparks",
      "get_account.profile.bounty_weight",
      "events: fire_gift.sparked_by"
    ]
  },
  {
    "title": "History",
    "data": [
      "events: fire_gift (sparked_by = you)"
    ]
  }
]}
    />
  );
}
