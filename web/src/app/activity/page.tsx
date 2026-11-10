import type { Metadata } from "next";
import { ActivityLog } from "@/views/ActivityLog";

export const metadata: Metadata = { title: "Activity" };

export default function Page() {
  return <ActivityLog />;
}
