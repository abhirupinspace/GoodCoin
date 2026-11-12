import type { Metadata } from "next";
import { RedeemPage } from "@/components/app/views/RedeemPage";

export const metadata: Metadata = { title: "Redeem", description: "Redeem GOOD for NEAR at the backing floor." };

export default function Page() {
  return <RedeemPage />;
}
