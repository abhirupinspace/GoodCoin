import type { Metadata } from "next";
import { Verify } from "@/views/Verify";

export const metadata: Metadata = { title: "Verification" };

export default function Page() {
  return <Verify />;
}
