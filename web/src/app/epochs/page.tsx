import type { Metadata } from "next";
import { Epochs } from "@/views/Epochs";

export const metadata: Metadata = { title: "Epochs" };

export default function Page() {
  return <Epochs />;
}
