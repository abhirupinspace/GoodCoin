import type { Metadata } from "next";
import { FirePage } from "@/components/app/views/FirePage";

export const metadata: Metadata = { title: "The Fire", description: "This week's fire: watch it, give to it, kindle it. Live from the GOODCOIN contract." };

export default function Page() {
  return <FirePage />;
}
