import type { Metadata } from "next";
import { HistoryPage } from "@/components/app/views/HistoryPage";

export const metadata: Metadata = { title: "My History", description: "Every fire you gave to and what it left you." };

export default function Page() {
  return <HistoryPage />;
}
