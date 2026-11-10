import type { Metadata } from "next";
import { Challenges } from "@/views/Challenges";

export const metadata: Metadata = { title: "Challenges" };

export default function Page() {
  return <Challenges />;
}
