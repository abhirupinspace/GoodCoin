import type { Metadata } from "next";
import { Treasury } from "@/views/Treasury";

export const metadata: Metadata = { title: "Treasury" };

export default function Page() {
  return <Treasury />;
}
