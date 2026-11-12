import type { Metadata } from "next";
import { ReferralsPage } from "@/components/app/views/ReferralsPage";

export const metadata: Metadata = { title: "Referrals", description: "Your spark link and the exact referral rule." };

export default function Page() {
  return <ReferralsPage />;
}
