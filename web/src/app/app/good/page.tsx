import type { Metadata } from "next";
import { GoodPage } from "@/components/app/views/GoodPage";

export const metadata: Metadata = { title: "My GOOD", description: "Your GOOD balance, its NEAR backing and anything left to claim." };

export default function Page() {
  return <GoodPage />;
}
