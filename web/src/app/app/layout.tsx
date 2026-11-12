import type { Metadata } from "next";
import { AppShell } from "@/components/site/AppShell";

export const metadata: Metadata = { title: { default: "The Fire", template: "%s · GOODCOIN App" } };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
