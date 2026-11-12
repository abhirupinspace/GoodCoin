import type { Metadata } from "next";
import { HearthPage } from "@/components/app/views/HearthPage";

export const metadata: Metadata = { title: "The Hearth", description: "The NEAR that backs every GOOD: floor, supply, invariants and fire history from contract state." };

export default function Page() {
  return <HearthPage />;
}
