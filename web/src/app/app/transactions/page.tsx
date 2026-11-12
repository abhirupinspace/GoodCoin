import type { Metadata } from "next";
import { TransactionsPage } from "@/components/app/views/TransactionsPage";

export const metadata: Metadata = { title: "Transactions", description: "Your calls to the GOODCOIN contract, indexed by NearBlocks." };

export default function Page() {
  return <TransactionsPage />;
}
