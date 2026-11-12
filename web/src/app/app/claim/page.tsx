import type { Metadata } from "next";
import { ClaimPage } from "@/components/app/views/ClaimPage";

export const metadata: Metadata = { title: "Claim", description: "Claim GOOD from caught fires and refunds from smothered ones." };

export default function Page() {
  return <ClaimPage />;
}
